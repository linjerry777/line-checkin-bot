const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

let sheets = null;
let isConfigured = false;

/**
 * 初始化 Google Sheets API
 */
function initGoogleSheets() {
  try {
    let credentials;

    // Vercel 環境：從環境變數讀取 JSON
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else {
      // 本地環境：從檔案讀取
      const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-credentials.json';

      if (!fs.existsSync(credentialsPath)) {
        console.warn('⚠️  Google Sheets 憑證檔案不存在');
        return null;
      }

      credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheets = google.sheets({ version: 'v4', auth });
    isConfigured = true;

    console.log('✅ Google Sheets API 初始化成功');
    return sheets;
  } catch (error) {
    console.error('❌ Google Sheets 初始化失敗:', error.message);
    return null;
  }
}

/**
 * 新增資料到 Google Sheet
 */
async function appendToSheet(values, range = '打卡紀錄!A:F') {
  if (!isConfigured) {
    initGoogleSheets();
  }

  if (!sheets || !isConfigured) {
    console.warn('⚠️  Google Sheets 未設定，跳過儲存');
    return;
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    console.warn('⚠️  未設定 GOOGLE_SHEET_ID，跳過儲存');
    return;
  }

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    return response.data;
  } catch (error) {
    // 如果工作表不存在，嘗試建立標題列
    if (error.message.includes('Unable to parse range')) {
      const sheetName = range.split('!')[0];
      await createSheetHeaders(spreadsheetId, sheetName);
      // 重試一次
      return appendToSheet(values, range);
    }
    throw error;
  }
}

/**
 * 讀取 Google Sheet 資料
 */
async function getSheetData(range) {
  if (!isConfigured) {
    initGoogleSheets();
  }

  if (!sheets || !isConfigured) {
    console.warn('⚠️  Google Sheets 未設定');
    return null;
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    console.warn('⚠️  未設定 GOOGLE_SHEET_ID');
    return null;
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('❌ 讀取 Sheet 失敗:', error.message);
    return null;
  }
}

/**
 * 更新 Google Sheet 資料
 */
async function updateSheetData(range, values) {
  if (!isConfigured) {
    initGoogleSheets();
  }

  if (!sheets || !isConfigured) {
    console.warn('⚠️  Google Sheets 未設定');
    return;
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    console.warn('⚠️  未設定 GOOGLE_SHEET_ID');
    return;
  }

  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    return response.data;
  } catch (error) {
    console.error('❌ 更新 Sheet 失敗:', error.message);
    throw error;
  }
}

/**
 * 建立 Google Sheet 標題列
 */
async function createSheetHeaders(spreadsheetId, sheetName) {
  try {
    let headers;
    let range;

    if (sheetName === '打卡紀錄') {
      headers = [['日期', '時間', '員工姓名', '類型', 'LINE User ID', '完整時間戳記']];
      range = '打卡紀錄!A1:F1';
    } else if (sheetName === '員工資料') {
      headers = [['LINE User ID', '員工姓名', 'LINE 顯示名稱', '註冊時間', '狀態']];
      range = '員工資料!A1:E1';
    } else {
      throw new Error(`未知的工作表: ${sheetName}`);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: headers,
      },
    });
    console.log(`✅ 已建立 ${sheetName} 標題列`);
  } catch (error) {
    console.error('❌ 建立標題列失敗:', error.message);
    throw error;
  }
}

module.exports = {
  initGoogleSheets,
  appendToSheet,
  getSheetData,
  updateSheetData,
};
