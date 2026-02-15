// Admin API - Unified endpoint for all admin functions
const { getAllEmployees, getEmployeeByUserId } = require('../services/employeeService');
const { getSheetData } = require('../config/googleSheets');
const { getLateEarlyStats, getMonthHoursRanking } = require('../services/statsService');

module.exports = async (req, res) => {
  try {
    const { action, userId } = req.query;

    // Check admin permission for all actions
    if (userId) {
      const requester = await getEmployeeByUserId(userId);
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({ error: '權限不足' });
      }
    }

    switch (action) {
      case 'check':
        // Check if user is admin
        if (!userId) {
          return res.status(400).json({ error: '缺少 userId 參數' });
        }
        const employee = await getEmployeeByUserId(userId);
        const isAdmin = employee?.role === 'admin';
        return res.status(200).json({ isAdmin, employee });

      case 'employees':
        // Get all employees
        const employees = await getAllEmployees();
        return res.status(200).json({
          success: true,
          employees: employees,
          total: employees.length
        });

      case 'records':
        // Get all attendance records
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
          records: records,
          total: records.length
        });

      case 'late-early-stats':
        // Get late/early statistics
        const { month, workStartTime, workEndTime } = req.query;
        const statsMonth = month || new Date().toISOString().slice(0, 7);
        const settings = {
          workStartTime: workStartTime || '09:00',
          workEndTime: workEndTime || '18:00'
        };

        const stats = await getLateEarlyStats(statsMonth, settings);
        return res.status(200).json({
          success: true,
          ...stats
        });

      case 'hours-ranking':
        // Get hours ranking
        const rankMonth = req.query.month || new Date().toISOString().slice(0, 7);
        const ranking = await getMonthHoursRanking(rankMonth);
        return res.status(200).json({
          success: true,
          ranking,
          month: rankMonth
        });

      default:
        return res.status(400).json({ error: '無效的 action 參數' });
    }

  } catch (error) {
    console.error('Admin API 錯誤:', error);
    res.status(500).json({ error: error.message });
  }
};
