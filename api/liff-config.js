// Vercel Serverless Function - 提供 LIFF 設定
const { getAllSettings } = require('../services/settingsService');

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
    const liffId = process.env.LIFF_ID;

    if (!liffId) {
      return res.status(500).json({ error: 'LIFF_ID not configured' });
    }

    // 從 Google Sheets 讀取設定
    const settings = await getAllSettings();

    return res.status(200).json({
      liffId,
      storeLocation: {
        lat: parseFloat(settings.storeLatitude || process.env.STORE_LAT || '25.0330'),
        lng: parseFloat(settings.storeLongitude || process.env.STORE_LNG || '121.5654'),
        radius: parseInt(settings.storeRadius || process.env.STORE_RADIUS || '100'),
        enableLocationCheck: settings.enableLocationCheck === 'true'
      }
    });

  } catch (error) {
    console.error('Get LIFF config error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
