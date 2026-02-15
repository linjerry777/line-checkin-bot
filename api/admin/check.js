// Check if user is admin
const { getEmployeeByUserId } = require('../../services/employeeService');

module.exports = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: '缺少 userId 參數' });
    }

    // Get employee data
    const employee = await getEmployeeByUserId(userId);

    if (!employee) {
      return res.status(200).json({ isAdmin: false });
    }

    // Check if employee is admin (role column in Google Sheets)
    const isAdmin = employee.role === 'admin';

    res.status(200).json({ isAdmin, employee });

  } catch (error) {
    console.error('檢查管理員權限錯誤:', error);
    res.status(500).json({ error: error.message });
  }
};
