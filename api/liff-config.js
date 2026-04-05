// Vercel Serverless Function - 提供 LIFF 設定
const { getAllSettings } = require('../services/settingsService');

/**
 * 將 Google Sheets 時間值轉換為 "HH:MM" 字串
 * 處理：小數 (0.375)、"9:00"、"9:00 AM"、"09:00:00" 等格式
 */
function normalizeTime(val, fallback) {
  if (!val && val !== 0) return fallback;
  const str = String(val).trim();

  // 如果是小數（Sheets 時間格式，例如 0.375 = 09:00）
  const num = parseFloat(str);
  if (!isNaN(num) && !str.includes(':')) {
    const totalMin = Math.round(num * 24 * 60);
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // 從字串中擷取 HH:MM（處理 "9:00 AM"、"9:00:00"、"09:00" 等）
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    // 處理 AM/PM（英文）
    if (/pm/i.test(str) && h !== 12) h += 12;
    if (/am/i.test(str) && h === 12) h = 0;
    // 處理 上午/下午（中文，Google Sheets 中文介面）
    if (/下午/.test(str) && h !== 12) h += 12;
    if (/上午/.test(str) && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return fallback;
}

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

    // 上班時間（正規化為 "HH:MM"，Sheet 沒設定時預設 09:00）
    response.workStartTime = normalizeTime(settings.workStartTime, '09:00');
    // 下班時間（正規化為 "HH:MM"，Sheet 沒設定時預設 18:00）
    response.workEndTime = normalizeTime(settings.workEndTime, '18:00');
    // 遲到/早退/加班 容忍時間（分鐘，預設 10）
    response.lateThreshold  = parseInt(settings.lateThreshold  || '10', 10) || 10;
    response.earlyThreshold = parseInt(settings.earlyThreshold || '10', 10) || 10;

    return res.status(200).json(response);

  } catch (error) {
    console.error('Get LIFF config error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
