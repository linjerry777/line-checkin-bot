// Admin API - Unified endpoint for all admin + leave functions
const { getAllEmployees, getEmployeeByUserId, updateEmployeeSchedule, updateEmployeeSalary, updateEmployeeInsurance, updateEmployeeStatus, updateEmployeeName, getPendingEmployees, activateEmployee, adminAddEmployee } = require('../services/employeeService');
const { getSheetData, appendToSheet } = require('../config/googleSheets');
const { getLateEarlyStats, getMonthHoursRanking } = require('../services/statsService');
const { getAllSettings, updateSettings, validateSettings } = require('../services/settingsService');
const { getTodayAnomalies, getAnomalyStats } = require('../services/alertService');
const { pushMessage } = require('../utils/lineMessaging');
const {
  getAllLeaves,
  getLeavesByUserId,
  getPendingLeaves,
  applyLeave,
  reviewLeave,
} = require('../services/leaveService');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const action = req.query.action;
    const userId = req.query.userId || req.body?.userId;

    // ── 0. login: 密碼驗證（完全不需要 userId）────────────────
    if (action === 'login') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
      const { password } = req.body || {};
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) return res.status(500).json({ success: false, error: 'ADMIN_PASSWORD 未設定' });
      if (!password || password.trim() !== adminPassword.trim()) {
        return res.status(401).json({ success: false, error: '密碼錯誤' });
      }
      // Find the admin employee in the sheet
      const allEmps = await getAllEmployees();
      const adminEmp = allEmps.find(e => e.role === 'admin');
      if (!adminEmp) return res.status(404).json({ success: false, error: '找不到管理員帳號，請先在員工資料表設定 role=admin' });
      return res.status(200).json({ success: true, userId: adminEmp.userId, displayName: adminEmp.name });
    }

    // ── 1. check: 查詢 isAdmin（不需要預先驗證）──────────────
    if (action === 'check') {
      if (!userId) return res.status(400).json({ error: '缺少 userId 參數' });
      const employee = await getEmployeeByUserId(userId);
      const isAdmin = employee?.role === 'admin';
      return res.status(200).json({ isAdmin, employee });
    }

    // ── 2. 員工請假申請（不需要 admin 權限）────────────────────
    if (action === 'leave-apply') {
      if (!userId) return res.status(400).json({ error: '缺少 userId 參數' });
      const requester = await getEmployeeByUserId(userId);
      if (!requester) return res.status(403).json({ error: '找不到員工資料' });

      const body = req.method === 'POST' ? req.body : req.query;
      const { employeeName, leaveType, startDate, endDate, reason, startTime, endTime } = body;

      if (!leaveType || !startDate || !endDate) {
        return res.status(400).json({ error: '請填寫完整請假資訊' });
      }
      if (!['annual', 'sick', 'personal', 'other'].includes(leaveType)) {
        return res.status(400).json({ error: '假別不正確' });
      }
      if (startDate > endDate) {
        return res.status(400).json({ error: '結束日期必須大於或等於開始日期' });
      }

      const result = await applyLeave({
        userId,
        employeeName: employeeName || requester.name,
        leaveType,
        startDate,
        endDate,
        reason,
        startTime: startTime || '',
        endTime: endTime || '',
      });
      return res.status(result.success ? 200 : 400).json(result);
    }

    // ── 3. 員工查自己的請假（不需要 admin 權限）────────────────
    if (action === 'leave-my') {
      if (!userId) return res.status(400).json({ error: '缺少 userId 參數' });
      const requester = await getEmployeeByUserId(userId);
      if (!requester) return res.status(403).json({ error: '找不到員工資料' });

      const leaves = await getLeavesByUserId(userId);
      return res.status(200).json({ success: true, leaves });
    }

    // ── 4. 其他所有 action 都需要 admin 權限 ───────────────────
    if (!userId) return res.status(400).json({ error: '缺少 userId 參數' });
    const requester = await getEmployeeByUserId(userId);
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ success: false, error: '權限不足' });
    }

    switch (action) {
      case 'employees': {
        const employees = await getAllEmployees();
        return res.status(200).json({ success: true, employees, total: employees.length });
      }

      case 'records': {
        const data = await getSheetData('打卡紀錄!A:I');
        if (!data || data.length <= 1) {
          return res.status(200).json({ success: true, records: [] });
        }
        const records = data.slice(1).map(row => ({
          userId:        row[0],
          employeeName:  row[1],
          type:          row[2],
          date:          row[3],
          time:          row[4],
          fullTimestamp: row[5],
          location:      row[6] || null,
          reason:        row[7] || '',
          isManual:      row[8]?.toString().toLowerCase() === 'true',
        })).filter(r => r.userId && r.date);
        return res.status(200).json({ success: true, records, total: records.length });
      }

      case 'manual-punch': {
        if (req.method !== 'POST') return res.status(405).json({ error: '只接受 POST 請求' });
        const { targetUserId, employeeName, date, type, time } = req.body;
        if (!targetUserId || !date || !type || !time) {
          return res.status(400).json({ error: '缺少必要欄位' });
        }
        const row = [targetUserId, employeeName || '', type, date, time,
                     new Date().toISOString(), '', '[補卡]', 'true'];
        await appendToSheet(row, '打卡紀錄!A:I');
        return res.status(200).json({ success: true });
      }

      case 'update-insurance': {
        if (req.method !== 'POST') return res.status(405).json({ error: '只接受 POST 請求' });
        const { targetUserId, insurance } = req.body;
        if (!targetUserId) return res.status(400).json({ error: '缺少 userId' });
        const result = await updateEmployeeInsurance(targetUserId, parseFloat(insurance) || 0);
        return res.status(200).json(result);
      }

      case 'get-bonuses': {
        const bonusMonth = req.query.month || new Date().toISOString().slice(0, 7);
        const bonusType  = req.query.type  || 'bonuses'; // 'bonuses' | 'otbonus'
        const allSettings = await getAllSettings();
        const raw = allSettings[`${bonusType}_${bonusMonth}`] || '[]';
        let bonuses = [];
        try { bonuses = JSON.parse(raw); } catch (_) {}
        return res.status(200).json({ success: true, bonuses });
      }

      case 'set-bonuses': {
        if (req.method !== 'POST') return res.status(405).json({ error: '只接受 POST 請求' });
        const { month: bonusMonth2, bonuses: bonusList, type: bonusType2 } = req.body;
        if (!bonusMonth2) return res.status(400).json({ error: '缺少月份' });
        const key = `${bonusType2 || 'bonuses'}_${bonusMonth2}`;
        await updateSettings({ [key]: JSON.stringify(bonusList || []) });
        return res.status(200).json({ success: true });
      }

      case 'late-early-stats': {
        const { month, workStartTime, workEndTime } = req.query;
        const statsMonth = month || new Date().toISOString().slice(0, 7);
        const lateSettings = {
          workStartTime: workStartTime || '09:00',
          workEndTime: workEndTime || '18:00'
        };
        const lateStats = await getLateEarlyStats(statsMonth, lateSettings);
        return res.status(200).json({ success: true, ...lateStats });
      }

      case 'hours-ranking': {
        const rankMonth = req.query.month || new Date().toISOString().slice(0, 7);
        const ranking = await getMonthHoursRanking(rankMonth);
        return res.status(200).json({ success: true, ranking, month: rankMonth });
      }

      case 'get-settings': {
        const allSettings = await getAllSettings();
        return res.status(200).json({ success: true, settings: allSettings });
      }

      case 'update-settings': {
        if (req.method !== 'POST') return res.status(405).json({ error: '只接受 POST 請求' });
        const newSettings = req.body;
        const validationErrors = validateSettings(newSettings);
        if (validationErrors.length > 0) {
          return res.status(400).json({ success: false, errors: validationErrors });
        }
        await updateSettings(newSettings);
        return res.status(200).json({ success: true, message: '設定已更新' });
      }

      case 'send-payslip': {
        if (req.method !== 'POST') return res.status(405).json({ error: '只接受 POST 請求' });
        const { payslips } = req.body;
        if (!Array.isArray(payslips) || payslips.length === 0) {
          return res.status(400).json({ error: '缺少薪資資料' });
        }
        let sent = 0;
        const failed = [];
        for (const { userId, name, message } of payslips) {
          try {
            await pushMessage(userId, { type: 'text', text: message });
            sent++;
          } catch (err) {
            console.error(`薪資單發送失敗 ${name}:`, err.message);
            failed.push(name);
          }
        }
        return res.status(200).json({
          success: true,
          sent,
          failed,
          message: `已成功發送 ${sent} 位，失敗 ${failed.length} 位`,
        });
      }

      case 'anomalies': {
        const anomalies = await getTodayAnomalies();
        return res.status(200).json({ success: true, anomalies, total: anomalies.length });
      }

      case 'anomaly-stats': {
        const { startDate, endDate } = req.query;
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];
        const anomalyStats = await getAnomalyStats(start, end);
        return res.status(200).json({ success: true, stats: anomalyStats, startDate: start, endDate: end });
      }

      // ── Leave admin actions ──────────────────────────────
      case 'leave-all': {
        const leaves = await getAllLeaves();
        return res.status(200).json({ success: true, leaves });
      }

      case 'leave-pending': {
        const leaves = await getPendingLeaves();
        return res.status(200).json({ success: true, leaves });
      }

      case 'leave-review': {
        if (req.method !== 'POST') return res.status(405).json({ error: '只接受 POST 請求' });
        const { leaveId, reviewAction, rejectReason } = req.body;
        if (!leaveId || !reviewAction) return res.status(400).json({ error: '缺少審核資訊' });
        if (!['approve', 'reject'].includes(reviewAction)) return res.status(400).json({ error: '審核動作不正確' });
        if (reviewAction === 'reject' && !rejectReason) return res.status(400).json({ error: '拒絕時需填寫原因' });

        const result = await reviewLeave({
          leaveId,
          action: reviewAction,
          reviewerUserId: userId,
          rejectReason,
        });
        return res.status(result.success ? 200 : 400).json(result);
      }

      case 'update-employee-shift': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
        const { targetUserId, schedule } = req.body;
        if (!targetUserId) return res.status(400).json({ error: '缺少 targetUserId' });
        const result = await updateEmployeeSchedule(targetUserId, schedule || '{}');
        return res.status(result.success ? 200 : 400).json(result);
      }

      case 'pending-employees': {
        const pending = await getPendingEmployees();
        return res.status(200).json({ success: true, employees: pending });
      }

      case 'activate-employee': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
        const { targetUserId, name } = req.body;
        if (!targetUserId || !name) return res.status(400).json({ error: '缺少 targetUserId 或 name' });
        const result = await activateEmployee(targetUserId, name);
        return res.status(result.success ? 200 : 400).json(result);
      }

      case 'add-employee': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
        const { targetUserId, name, lineDisplayName } = req.body;
        if (!targetUserId || !name) return res.status(400).json({ error: '缺少 targetUserId 或 name' });
        const result = await adminAddEmployee(targetUserId, name, lineDisplayName || '');
        return res.status(result.success ? 200 : 400).json(result);
      }

      case 'set-employee-status': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
        const { targetUserId, status } = req.body;
        if (!targetUserId || !status) return res.status(400).json({ error: '缺少 targetUserId 或 status' });
        const result = await updateEmployeeStatus(targetUserId, status);
        return res.status(result.success ? 200 : 400).json(result);
      }

      case 'update-employee-name': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
        const { targetUserId, name } = req.body;
        if (!targetUserId || !name) return res.status(400).json({ error: '缺少 targetUserId 或 name' });
        const result = await updateEmployeeName(targetUserId, name);
        return res.status(result.success ? 200 : 400).json(result);
      }

      case 'update-salary': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
        const { targetUserId, salaryType, salaryAmount } = req.body;
        if (!targetUserId) return res.status(400).json({ error: '缺少 targetUserId' });
        const result = await updateEmployeeSalary(targetUserId, salaryType || '', salaryAmount || 0);
        return res.status(result.success ? 200 : 400).json(result);
      }

      default:
        return res.status(400).json({ error: '無效的 action 參數' });
    }

  } catch (error) {
    console.error('Admin API 錯誤:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
