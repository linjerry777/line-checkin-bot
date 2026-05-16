/**
 * 建立「請假紀錄」Google Sheet 工作表
 * 執行：node scripts/create-leave-sheet.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

async function createLeaveSheet() {
  try {
    let credentials;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else {
      const path = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-credentials.json';
      credentials = JSON.parse(fs.readFileSync(path, 'utf8'));
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      console.error('❌ 未設定 GOOGLE_SHEET_ID 環境變數');
      process.exit(1);
    }

    // 1. 取得現有工作表清單
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = meta.data.sheets.map(s => s.properties.title);
    console.log('現有工作表：', existingSheets.join(', '));

    // 2. 若「請假紀錄」不存在，新增工作表
    if (!existingSheets.includes('請假紀錄')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: '請假紀錄',
                gridProperties: { rowCount: 1000, columnCount: 15 },
              }
            }
          }]
        }
      });
      console.log('✅ 已新增「請假紀錄」工作表');
    } else {
      console.log('ℹ️  「請假紀錄」工作表已存在');
    }

    // 3. 寫入標題列
    const headers = [
      '請假ID', '員工ID', '員工姓名', '假別',
      '開始日期', '結束日期', '天數', '原因',
      '狀態', '審核者ID', '審核時間', '拒絕原因', '申請時間',
      '開始時間', '結束時間'
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: '請假紀錄!A1:O1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] },
    });

    console.log('✅ 已寫入標題列：', headers.join(' | '));
    console.log('🎉 請假紀錄工作表初始化完成！');

  } catch (error) {
    console.error('❌ 失敗：', error.message);
    process.exit(1);
  }
}

createLeaveSheet();
