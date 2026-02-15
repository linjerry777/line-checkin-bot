// 設定預設 Rich Menu
require('dotenv').config();
const axios = require('axios');

const RICH_MENU_ID = 'richmenu-990fe8072fb20552635d7531bef608c6';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function setDefaultRichMenu() {
  try {
    console.log('📱 設定預設 Rich Menu...\n');
    console.log(`Rich Menu ID: ${RICH_MENU_ID}\n`);

    const response = await axios.post(
      `https://api.line.me/v2/bot/user/all/richmenu/${RICH_MENU_ID}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    console.log('✅ 已設定為預設 Rich Menu！');
    console.log('\n📱 現在打開 LINE 應該可以看到底部選單了！');
    console.log('\n選單按鈕：');
    console.log('┌─────────┬─────────┬─────────┐');
    console.log('│  打卡   │ 本月工時 │ 查詢紀錄 │');
    console.log('├─────────┴─────────┴─────────┤');
    console.log('│   管理員後台   │   使用說明   │');
    console.log('└────────────────┴────────────┘');

    process.exit(0);

  } catch (error) {
    console.error('❌ 設定失敗:', error.response?.data || error.message);

    if (error.response?.status === 400) {
      console.log('\n💡 可能的原因：');
      console.log('   1. Rich Menu ID 不存在');
      console.log('   2. 圖片尚未上傳');
      console.log('   3. Channel Access Token 錯誤');
    }

    process.exit(1);
  }
}

setDefaultRichMenu();
