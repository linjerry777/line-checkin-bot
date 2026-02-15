require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

async function fixEmployeeSheet() {
  try {
    console.log('🔧 修復「員工資料」工作表...\n');

    // 1. 初始化 Google Sheets
    const credentials = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 2. 讀取目前的資料
    console.log('📖 讀取目前的資料...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '員工資料!A:E',
    });

    const currentData = response.data.values || [];
    console.log(`目前有 ${currentData.length} 行資料\n`);

    // 3. 檢查第一行是否是標題
    if (currentData.length > 0) {
      const firstRow = currentData[0];
      if (firstRow[0] === 'LINE User ID') {
        console.log('✅ 標題列已存在，不需要修復');
        return;
      }
    }

    // 4. 插入標題列
    console.log('📝 插入標題列...');

    // 先清空工作表
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: '員工資料!A:E',
    });

    // 準備新資料（標題 + 原有資料）
    const headers = ['LINE User ID', '員工姓名', 'LINE 顯示名稱', '註冊時間', '狀態'];
    const newData = [headers, ...currentData];

    // 寫回工作表
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: '員工資料!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newData,
      },
    });

    console.log('✅ 修復完成！');
    console.log(`\n📊 結果：`);
    console.log(`   - 標題列：已加入`);
    console.log(`   - 員工資料：${currentData.length} 筆`);
    console.log(`\n請到 Google Sheets 確認：`);
    console.log(`   https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit\n`);

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
  }
}

fixEmployeeSheet();
