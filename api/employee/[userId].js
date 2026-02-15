const employeeService = require('../../services/employeeService');

// Vercel Serverless Function - 取得員工資料
module.exports = async (req, res) => {
  // 允許 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const employee = await employeeService.getEmployeeByUserId(userId);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.status(200).json({
      success: true,
      employee
    });

  } catch (error) {
    console.error('Get employee error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
