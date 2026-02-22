// Admin API - Unified endpoint for all admin + leave functions
const { getAllEmployees, getEmployeeByUserId } = require('../services/employeeService');
const { getSheetData } = require('../config/googleSheets');
const { getLateEarlyStats, getMonthHoursRanking } = require('../services/statsService');
const { getAllSettings, updateSettings, validateSettings } = require('../services/settingsService');
const { getTodayAnomalies, getAnomalyStats } = require('../services/alertService');
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
      if (!password || password !== adminPassword) {
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
      const { employeeName, leaveType, startDate, endDate, reason } = body;

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
        const data = await getSheetData('打卡紀錄!A:G');
        if (!data || data.length <= 1) {
          return res.status(200).json({ success: true, records: [] });
        }
        const records = data.slice(1).map(row => ({
          userId: row[0],
          employeeName: row[1],
          type: row[2],
          date: row[3],
          time: row[4],
          fullTimestamp: row[5],
          location: row[6] || null
        })).filter(r => r.userId && r.date);
        return res.status(200).json({ success: true, records, total: records.length });
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

      default:
        return res.status(400).json({ error: '無效的 action 參數' });
    }

  } catch (error) {
    console.error('Admin API 錯誤:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
