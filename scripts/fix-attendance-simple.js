// 簡單修正打卡紀錄的欄位順序
require('dotenv').config();
const { getSheetData } = require('../config/googleSheets');
const { google } = require('googleapis');
const fs = require('fs');

async function fixAttendance() {
  try {
    console.log('📋 讀取打卡紀錄...\n');

    // 初始化 Google Sheets
    let credentials;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else {
      const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-credentials.json';
      credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 讀取所有資料
    const data = await getSheetData('打卡紀錄!A:G');

    console.log('目前標題列:', data[0]);
    console.log(`目前資料筆數: ${data.length - 1} 筆\n`);

    // 建立新的資料陣列
    const newData = [];

    // 標題列
    newData.push(['員工ID', '員工姓名', '類型', '日期', '時間', '完整時間戳記', '位置']);

    // 重新排列每一行資料
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // 檢查資料是否已經是正確順序（員工ID在第一欄）
      if (row[0] && row[0].startsWith('U')) {
        // 已經是正確順序，直接保留
        newData.push(row);
        console.log(`✅ 第 ${i} 筆已是正確格式: ${row[1]} - ${row[2]}`);
      } else {
        // 需要轉換順序
        // 目前順序：日期(A), 時間(B), 員工姓名(C), 類型(D), 員工ID(E), 時間戳記(F), 位置(G)
        const newRow = [
          row[4] || '',  // 員工ID
          row[2] || '',  // 員工姓名
          row[3] === '上班' ? 'in' : row[3] === '下班' ? 'out' : row[3] || '',  // 類型
          row[0] || '',  // 日期
          row[1] || '',  // 時間
          row[5] || '',  // 時間戳記
          row[6] || '',  // 位置
        ];
        newData.push(newRow);
        console.log(`🔄 第 ${i} 筆已轉換: ${newRow[1]} - ${newRow[2]} - ${newRow[3]}`);
      }
    }

    console.log(`\n📝 準備寫入 ${newData.length} 行資料...\n`);

    // 清空整個範圍並寫入新資料
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: '打卡紀錄!A:G',
    });

    console.log('1️⃣ 已清空舊資料');

    // 寫入新資料
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: '打卡紀錄!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newData,
      },
    });

    console.log('2️⃣ 已寫入新資料\n');
    console.log('✅ 修正完成！\n');
    console.log(`✅ 總共處理了 ${newData.length - 1} 筆打卡紀錄`);
    console.log('\n現在可以正常使用打卡系統了！');

    process.exit(0);

  } catch (error) {
    console.error('❌ 修正失敗:', error.message);
    process.exit(1);
  }
}

fixAttendance();
