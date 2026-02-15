// 設定員工為管理員
require('dotenv').config();
const { getSheetData, updateSheetData } = require('../config/googleSheets');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setAdmin() {
  try {
    console.log('📋 載入員工資料...\n');

    // 讀取員工資料
    const employees = await getSheetData('員工資料!A:F');

    if (!employees || employees.length <= 1) {
      console.log('❌ 沒有找到員工資料');
      process.exit(1);
    }

    // 顯示員工列表
    console.log('目前員工列表：\n');
    console.log('編號 | 員工姓名 | 身份');
    console.log('-----|----------|-------');

    employees.slice(1).forEach((row, index) => {
      const name = row[1] || '未知';
      const role = row[5] || 'employee';
      const roleText = role === 'admin' ? '✅ 管理員' : '一般員工';
      console.log(`${index + 1}.   | ${name.padEnd(8)} | ${roleText}`);
    });

    // 詢問要設定哪位員工
    rl.question('\n請輸入要設定為管理員的員工編號（輸入 0 離開）: ', async (answer) => {
      const index = parseInt(answer);

      if (index === 0) {
        console.log('👋 已取消');
        rl.close();
        process.exit(0);
      }

      if (isNaN(index) || index < 1 || index > employees.length - 1) {
        console.log('❌ 無效的編號');
        rl.close();
        process.exit(1);
      }

      const selectedRow = employees[index];
      const name = selectedRow[1];
      const currentRole = selectedRow[5] || 'employee';

      if (currentRole === 'admin') {
        console.log(`\n✅ ${name} 已經是管理員了！`);
        rl.close();
        process.exit(0);
      }

      // 更新該員工的 role 為 admin
      const rowNumber = index + 1; // +1 因為有標題列
      await updateSheetData(`員工資料!F${rowNumber}`, 'admin');

      console.log(`\n✅ 成功！${name} 已設定為管理員`);
      console.log('\n📱 現在該員工可以存取管理員後台了：');
      console.log(`   https://liff.line.me/${process.env.LIFF_ID}?page=admin`);

      rl.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ 設定失敗:', error);
    rl.close();
    process.exit(1);
  }
}

setAdmin();
