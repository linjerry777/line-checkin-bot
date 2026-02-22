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

    const response = {
      liffId,
      storeLocation: {
        lat: parseFloat(settings.storeLatitude || process.env.STORE_LAT || '25.0330'),
        lng: parseFloat(settings.storeLongitude || process.env.STORE_LNG || '121.5654'),
        radius: parseInt(settings.storeRadius || process.env.STORE_RADIUS || '100'),
        enableLocationCheck: settings.enableLocationCheck === 'true'
      }
    };

    // 第二打卡位置（啟用且有座標時才回傳）
    if (settings.enableLocation2 === 'true' && settings.storeLatitude2 && settings.storeLongitude2) {
      response.storeLocation2 = {
        lat: parseFloat(settings.storeLatitude2),
        lng: parseFloat(settings.storeLongitude2),
        radius: parseInt(settings.storeRadius2 || '100'),
        address: settings.storeAddress2 || '',
      };
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Get LIFF config error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
