// Vercel Serverless Function - 提供 LIFF 設定
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

    return res.status(200).json({
      liffId,
      storeLocation: {
        lat: parseFloat(process.env.STORE_LAT || '25.0330'),
        lng: parseFloat(process.env.STORE_LNG || '121.5654'),
        radius: parseInt(process.env.STORE_RADIUS || '100')
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
