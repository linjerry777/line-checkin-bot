// 修正打卡紀錄的欄位順序
require('dotenv').config();
const { getSheetData, updateSheetData } = require('../config/googleSheets');

async function fixAttendanceColumns() {
  try {
    console.log('📋 讀取打卡紀錄...\n');

    // 讀取所有資料
    const data = await getSheetData('打卡紀錄!A:G');

    if (!data || data.length === 0) {
      console.log('❌ 找不到打卡紀錄');
      process.exit(1);
    }

    console.log('目前標題列:', data[0]);
    console.log(`目前資料筆數: ${data.length - 1} 筆\n`);

    // 檢查是否需要修正
    const currentHeaders = data[0];
    const correctHeaders = ['員工ID', '員工姓名', '類型', '日期', '時間', '完整時間戳記', '位置'];

    const needsFix = JSON.stringify(currentHeaders) !== JSON.stringify(correctHeaders);

    if (!needsFix && data.length === 1) {
      console.log('✅ 標題列正確且沒有資料，不需要修正');
      process.exit(0);
    }

    // 顯示目前資料的欄位對應
    console.log('目前欄位對應:');
    currentHeaders.forEach((header, i) => {
      console.log(`  ${String.fromCharCode(65 + i)} 欄: ${header}`);
    });

    console.log('\n預期欄位對應:');
    correctHeaders.forEach((header, i) => {
      console.log(`  ${String.fromCharCode(65 + i)} 欄: ${header}`);
    });

    console.log('\n🔄 開始修正...\n');

    // 建立新的資料陣列
    const newData = [];

    // 先加入正確的標題列
    newData.push(correctHeaders);

    // 重新排列每一行資料
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // 目前順序：日期(A), 時間(B), 員工姓名(C), 類型(D), 員工ID(E), 時間戳記(F), 位置(G)
      // 正確順序：員工ID, 員工姓名, 類型, 日期, 時間, 時間戳記, 位置

      const newRow = [
        row[4] || '',  // 員工ID (原本在 E 欄)
        row[2] || '',  // 員工姓名 (原本在 C 欄)
        row[3] === '上班' ? 'in' : row[3] === '下班' ? 'out' : row[3] || '',  // 類型 (原本在 D 欄，轉換成 in/out)
        row[0] || '',  // 日期 (原本在 A 欄)
        row[1] || '',  // 時間 (原本在 B 欄)
        row[5] || '',  // 時間戳記 (原本在 F 欄)
        row[6] || '',  // 位置 (原本在 G 欄)
      ];

      newData.push(newRow);
      console.log(`✅ 已轉換第 ${i} 筆: ${newRow[1]} - ${newRow[2]} - ${newRow[3]} ${newRow[4]}`);
    }

    console.log(`\n📝 準備寫入 ${newData.length} 行資料到 Google Sheets...\n`);

    // 先清空整個工作表
    console.log('1️⃣ 清空舊資料...');
    await updateSheetData('打卡紀錄!A:G', [['', '', '', '', '', '', '']]);

    // 寫入新資料（包含標題列）
    console.log('2️⃣ 寫入新資料...');

    // Google Sheets API 需要的格式
    const sheets = require('../config/googleSheets');
    const auth = sheets.auth;
    const sheetsApi = sheets.sheets;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    await sheetsApi.spreadsheets.values.update({
      auth,
      spreadsheetId,
      range: '打卡紀錄!A1:G' + newData.length,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newData,
      },
    });

    console.log('\n✅ 修正完成！\n');
    console.log('📊 新的資料結構：');
    console.log('  A 欄: 員工ID');
    console.log('  B 欄: 員工姓名');
    console.log('  C 欄: 類型 (in/out)');
    console.log('  D 欄: 日期');
    console.log('  E 欄: 時間');
    console.log('  F 欄: 完整時間戳記');
    console.log('  G 欄: 位置');
    console.log(`\n✅ 總共修正了 ${data.length - 1} 筆打卡紀錄`);

    process.exit(0);

  } catch (error) {
    console.error('❌ 修正失敗:', error);
    process.exit(1);
  }
}

fixAttendanceColumns();
