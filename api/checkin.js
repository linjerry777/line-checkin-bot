const attendanceService = require('../services/attendanceService');

// Vercel Serverless Function - LIFF 打卡
module.exports = async (req, res) => {
  // 允許 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, employeeName, type, location } = req.body;

    if (!userId || !employeeName || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (type !== 'in' && type !== 'out') {
      return res.status(400).json({ error: 'Invalid type' });
    }

    // 打卡
    const result = await attendanceService.checkIn(userId, employeeName, type, location);

    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      time: result.time,
      record: result.record
    });

  } catch (error) {
    console.error('Check-in error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
