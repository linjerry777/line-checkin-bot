// Get all attendance records (admin only)
const { getSheetData } = require('../../config/googleSheets');
const { getEmployeeByUserId } = require('../../services/employeeService');

module.exports = async (req, res) => {
  try {
    // Get userId from query or header
    const userId = req.query.userId || req.headers['x-user-id'];

    // Check admin permission
    if (userId) {
      const requester = await getEmployeeByUserId(userId);
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({ error: '權限不足' });
      }
    }

    // Get all attendance records
    const data = await getSheetData('打卡紀錄!A:G');

    if (!data || data.length <= 1) {
      return res.status(200).json({ success: true, records: [] });
    }

    // Parse records (skip header row)
    const records = data.slice(1).map(row => ({
      userId: row[0],
      employeeName: row[1],
      type: row[2],
      date: row[3],
      time: row[4],
      fullTimestamp: row[5],
      location: row[6] || null
    })).filter(r => r.userId && r.date); // Filter out empty rows

    res.status(200).json({
      success: true,
      records: records,
      total: records.length
    });

  } catch (error) {
    console.error('取得打卡紀錄錯誤:', error);
    res.status(500).json({ error: error.message });
  }
};
