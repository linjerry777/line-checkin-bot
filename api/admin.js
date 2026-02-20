// Admin API - Unified endpoint for all admin functions
const { getAllEmployees, getEmployeeByUserId } = require('../services/employeeService');
const { getSheetData } = require('../config/googleSheets');
const { getLateEarlyStats, getMonthHoursRanking } = require('../services/statsService');
const { getAllSettings, updateSettings, validateSettings } = require('../services/settingsService');
const { getTodayAnomalies, getAnomalyStats } = require('../services/alertService');

module.exports = async (req, res) => {
  try {
    const { action, userId } = req.query;

    // 'check' action 不需要預先驗證，它本身就是用來查詢 isAdmin 的
    if (action === 'check') {
      if (!userId) {
        return res.status(400).json({ error: '缺少 userId 參數' });
      }
      const employee = await getEmployeeByUserId(userId);
      const isAdmin = employee?.role === 'admin';
      return res.status(200).json({ isAdmin, employee });
    }

    // 其他所有 action 都需要 admin 權限
    if (!userId) {
      return res.status(400).json({ error: '缺少 userId 參數' });
    }
    const requester = await getEmployeeByUserId(userId);
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ success: false, error: '權限不足' });
    }

    switch (action) {
      case 'employees': {
        const employees = await getAllEmployees();
        return res.status(200).json({
          success: true,
          employees,
          total: employees.length
        });
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
        return res.status(200).json({
          success: true,
          records,
          total: records.length
        });
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
        if (req.method !== 'POST') {
          return res.status(405).json({ error: '只接受 POST 請求' });
        }
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

      default:
        return res.status(400).json({ error: '無效的 action 參數' });
    }

  } catch (error) {
    console.error('Admin API 錯誤:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
