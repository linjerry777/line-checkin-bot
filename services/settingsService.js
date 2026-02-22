// 系統設定服務
const { getSheetData, updateSheetData, appendToSheet } = require('../config/googleSheets');

/**
 * 取得所有系統設定
 */
async function getAllSettings() {
  try {
    const data = await getSheetData('系統設定!A:B');

    if (!data || data.length <= 1) {
      return getDefaultSettings();
    }

    // 轉換為物件格式
    const settings = {};
    data.slice(1).forEach(row => {
      const key = row[0];
      const value = row[1];
      if (key && value !== undefined) {
        settings[key] = value;
      }
    });

    return settings;

  } catch (error) {
    console.error('取得系統設定錯誤:', error);
    return getDefaultSettings();
  }
}

/**
 * 取得單一設定值
 */
async function getSetting(key) {
  const settings = await getAllSettings();
  return settings[key];
}

/**
 * 更新單一設定值
 */
async function updateSetting(key, value) {
  try {
    const data = await getSheetData('系統設定!A:B');

    if (!data || data.length <= 1) {
      throw new Error('系統設定表不存在');
    }

    // 找到該設定的列號
    const rowIndex = data.findIndex((row, index) => index > 0 && row[0] === key);

    if (rowIndex === -1) {
      throw new Error(`找不到設定項目: ${key}`);
    }

    // 更新該設定值（rowIndex + 1 因為 Google Sheets 從 1 開始）
    await updateSheetData(`系統設定!B${rowIndex + 1}`, [[value]]);

    return true;

  } catch (error) {
    console.error('更新系統設定錯誤:', error);
    throw error;
  }
}

/**
 * 批次更新多個設定
 */
async function updateSettings(settingsObject) {
  try {
    const data = await getSheetData('系統設定!A:B');

    if (!data || data.length <= 1) {
      throw new Error('系統設定表不存在');
    }

    // 建立更新請求（已存在的 key 用 batchUpdate，新 key 用 append）
    const updates = [];
    const newRows = [];

    for (const [key, value] of Object.entries(settingsObject)) {
      const rowIndex = data.findIndex((row, index) => index > 0 && row[0] === key);

      if (rowIndex !== -1) {
        updates.push({
          range: `系統設定!B${rowIndex + 1}`,
          values: [[value]]
        });
      } else {
        // Key 不存在 → 新增一列
        newRows.push([key, value]);
      }
    }

    // 新增不存在的設定列
    for (const row of newRows) {
      await appendToSheet([row], '系統設定!A:B');
    }

    // 執行批次更新
    if (updates.length > 0) {
      const { google } = require('googleapis');
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const sheets = google.sheets({ version: 'v4', auth });

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        resource: {
          valueInputOption: 'RAW',
          data: updates
        }
      });
    }

    return true;

  } catch (error) {
    console.error('批次更新系統設定錯誤:', error);
    throw error;
  }
}

/**
 * 預設設定值
 */
function getDefaultSettings() {
  return {
    workStartTime: '09:00',
    workEndTime: '18:00',
    storeLatitude: '24.8356',
    storeLongitude: '121.0145',
    storeRadius: '50000',
    storeAddress: '30268新竹縣竹北市縣政二路422號1樓',
    morningReminderTime: '09:00',
    eveningReminderTime: '18:00',
    enableReminders: 'true',
    enableLocationCheck: 'true',
    // 第二打卡位置（預設停用）
    storeAddress2: '',
    storeLatitude2: '',
    storeLongitude2: '',
    storeRadius2: '100',
    enableLocation2: 'false',
  };
}

/**
 * 驗證設定值格式
 */
function validateSettings(settings) {
  const errors = [];

  // 驗證時間格式 (HH:MM)
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

  if (settings.workStartTime && !timeRegex.test(settings.workStartTime)) {
    errors.push('上班時間格式錯誤，應為 HH:MM');
  }

  if (settings.workEndTime && !timeRegex.test(settings.workEndTime)) {
    errors.push('下班時間格式錯誤，應為 HH:MM');
  }

  if (settings.morningReminderTime && !timeRegex.test(settings.morningReminderTime)) {
    errors.push('早上提醒時間格式錯誤，應為 HH:MM');
  }

  if (settings.eveningReminderTime && !timeRegex.test(settings.eveningReminderTime)) {
    errors.push('晚上提醒時間格式錯誤，應為 HH:MM');
  }

  // 驗證座標範圍
  if (settings.storeLatitude) {
    const lat = parseFloat(settings.storeLatitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('緯度必須在 -90 到 90 之間');
    }
  }

  if (settings.storeLongitude) {
    const lng = parseFloat(settings.storeLongitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push('經度必須在 -180 到 180 之間');
    }
  }

  // 驗證半徑
  if (settings.storeRadius) {
    const radius = parseInt(settings.storeRadius);
    if (isNaN(radius) || radius < 0) {
      errors.push('打卡範圍必須是正整數');
    }
  }

  // 驗證布林值
  if (settings.enableReminders && !['true', 'false'].includes(settings.enableReminders)) {
    errors.push('啟用提醒必須是 true 或 false');
  }

  if (settings.enableLocationCheck && !['true', 'false'].includes(settings.enableLocationCheck)) {
    errors.push('啟用位置驗證必須是 true 或 false');
  }

  if (settings.enableAlerts && !['true', 'false'].includes(settings.enableAlerts)) {
    errors.push('啟用異常警報必須是 true 或 false');
  }

  if (settings.enableLocation2 && !['true', 'false'].includes(settings.enableLocation2)) {
    errors.push('啟用第二位置必須是 true 或 false');
  }

  // 第二位置座標
  if (settings.storeLatitude2 && settings.storeLatitude2 !== '') {
    const lat2 = parseFloat(settings.storeLatitude2);
    if (isNaN(lat2) || lat2 < -90 || lat2 > 90) {
      errors.push('第二位置緯度必須在 -90 到 90 之間');
    }
  }

  if (settings.storeLongitude2 && settings.storeLongitude2 !== '') {
    const lng2 = parseFloat(settings.storeLongitude2);
    if (isNaN(lng2) || lng2 < -180 || lng2 > 180) {
      errors.push('第二位置經度必須在 -180 到 180 之間');
    }
  }

  if (settings.storeRadius2 && settings.storeRadius2 !== '') {
    const r2 = parseInt(settings.storeRadius2);
    if (isNaN(r2) || r2 < 0) {
      errors.push('第二位置打卡範圍必須是正整數');
    }
  }

  // 驗證閾值
  if (settings.lateThreshold) {
    const threshold = parseInt(settings.lateThreshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 60) {
      errors.push('遲到容忍時間必須在 0-60 分鐘之間');
    }
  }

  if (settings.earlyThreshold) {
    const threshold = parseInt(settings.earlyThreshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 60) {
      errors.push('早退容忍時間必須在 0-60 分鐘之間');
    }
  }

  return errors;
}

module.exports = {
  getAllSettings,
  getSetting,
  updateSetting,
  updateSettings,
  validateSettings,
  getDefaultSettings
};
