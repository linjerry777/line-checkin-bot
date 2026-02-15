// Get all employees (admin only)
const { getAllEmployees } = require('../../services/employeeService');
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

    const employees = await getAllEmployees();

    res.status(200).json({
      success: true,
      employees: employees,
      total: employees.length
    });

  } catch (error) {
    console.error('取得員工列表錯誤:', error);
    res.status(500).json({ error: error.message });
  }
};
