// 更新 Google Sheets 欄位 - 加入位置資訊
require('dotenv').config();
const { getSheetData, updateSheetData } = require('../config/googleSheets');

async function updateSheetsColumns() {
  try {
    console.log('🔍 檢查打卡紀錄工作表...\n');

    // 讀取現有資料
    const data = await getSheetData('打卡紀錄!A:F');

    if (!data || data.length === 0) {
      console.log('❌ 找不到打卡紀錄工作表');
      return;
    }

    console.log('📋 目前欄位:', data[0]);
    console.log('📊 目前資料筆數:', data.length - 1, '筆\n');

    // 檢查是否已經有位置欄位
    if (data[0].length >= 7 && data[0][6] === '位置') {
      console.log('✅ 位置欄位已存在，無需更新');
      return;
    }

    // 更新標題列，加入位置欄位
    const newHeaders = ['員工ID', '員工姓名', '類型', '日期', '時間', '完整時間戳記', '位置'];

    console.log('📝 更新後欄位:', newHeaders);
    console.log('\n⚠️  即將更新 Google Sheets 標題列...');
    console.log('這將會：');
    console.log('  1. 保留所有現有資料');
    console.log('  2. 在 G 欄加入「位置」欄位');
    console.log('  3. 現有打卡紀錄的位置欄位將為空白\n');

    // 更新標題列（updateSheetData 會自動包一層陣列，所以直接傳陣列即可）
    await updateSheetData('打卡紀錄!A1:G1', newHeaders);

    console.log('✅ 欄位更新成功！\n');
    console.log('📊 新的欄位結構：');
    console.log('  A 欄: 員工ID');
    console.log('  B 欄: 員工姓名');
    console.log('  C 欄: 類型 (in/out)');
    console.log('  D 欄: 日期 (YYYY-MM-DD)');
    console.log('  E 欄: 時間 (HH:MM:SS)');
    console.log('  F 欄: 完整時間戳記');
    console.log('  G 欄: 位置 (緯度,經度) ⭐ 新增');
    console.log('\n🎉 完成！之後的 LIFF 打卡將會記錄 GPS 位置');

  } catch (error) {
    console.error('❌ 更新失敗:', error);
    process.exit(1);
  }
}

// 執行
updateSheetsColumns();
