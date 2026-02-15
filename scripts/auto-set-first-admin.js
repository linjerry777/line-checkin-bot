// 自動將第一位員工設定為管理員
require('dotenv').config();
const { getSheetData, updateSheetData } = require('../config/googleSheets');

async function autoSetFirstAdmin() {
  try {
    console.log('📋 載入員工資料...\n');

    // 讀取員工資料
    const employees = await getSheetData('員工資料!A:F');

    if (!employees || employees.length <= 1) {
      console.log('❌ 沒有找到員工資料');
      process.exit(1);
    }

    // 檢查是否已經有標題列包含「角色」
    const headers = employees[0];
    if (!headers[5] || headers[5] !== '角色') {
      console.log('⚠️  標題列缺少「角色」欄位，正在新增...');
      await updateSheetData('員工資料!F1', '角色');
      console.log('✅ 已新增「角色」欄位標題\n');
    }

    // 取得第一位員工
    const firstEmployee = employees[1];
    const name = firstEmployee[1];
    const currentRole = firstEmployee[5];

    if (currentRole === 'admin') {
      console.log(`✅ ${name} 已經是管理員了！`);
      console.log(`\n📱 管理員後台網址：`);
      console.log(`   https://line-checkin-bot-one.vercel.app/liff/admin.html`);
      process.exit(0);
    }

    // 設定第一位員工為管理員
    await updateSheetData('員工資料!F2', 'admin');

    console.log(`✅ 成功！${name} 已設定為管理員\n`);
    console.log('📱 現在可以存取管理員後台：');
    console.log('   https://line-checkin-bot-one.vercel.app/liff/admin.html\n');
    console.log('💡 提示：需要在手機 LINE 中開啟才能正確驗證身份');

    process.exit(0);

  } catch (error) {
    console.error('❌ 設定失敗:', error);
    process.exit(1);
  }
}

autoSetFirstAdmin();
