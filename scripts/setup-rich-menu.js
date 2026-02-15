// 設定 LINE Rich Menu
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/richmenu';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function setupRichMenu() {
  try {
    console.log('🎨 開始設定 Rich Menu...\n');

    // 1. 讀取 Rich Menu 設定
    const richMenuConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../config/richMenu.json'), 'utf8')
    );

    console.log('1️⃣ Rich Menu 設定已載入');
    console.log(`   名稱: ${richMenuConfig.name}`);
    console.log(`   按鈕數量: ${richMenuConfig.areas.length}\n`);

    // 2. 建立 Rich Menu
    console.log('2️⃣ 正在建立 Rich Menu...');
    const createResponse = await axios.post(
      LINE_MESSAGING_API,
      richMenuConfig,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    const richMenuId = createResponse.data.richMenuId;
    console.log(`   ✅ Rich Menu 已建立`);
    console.log(`   Rich Menu ID: ${richMenuId}\n`);

    // 3. 上傳圖片（簡單的預設圖片提示）
    console.log('3️⃣ 圖片上傳步驟：');
    console.log('   ⚠️  需要手動上傳 Rich Menu 圖片');
    console.log('   圖片尺寸: 2500 x 1686 px');
    console.log('   圖片格式: JPG 或 PNG');
    console.log('\n   使用以下指令上傳圖片:');
    console.log(`   curl -X POST https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content \\`);
    console.log(`     -H "Authorization: Bearer ${CHANNEL_ACCESS_TOKEN}" \\`);
    console.log(`     -H "Content-Type: image/png" \\`);
    console.log(`     --data-binary @richmenu-image.png\n`);

    // 4. 設定為預設 Rich Menu
    console.log('4️⃣ 設定為預設 Rich Menu...');
    await axios.post(
      `${LINE_MESSAGING_API}/default`,
      { richMenuId },
      {
        headers: {
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
        }
      }
    );
    console.log('   ✅ 已設定為預設選單\n');

    console.log('🎉 Rich Menu 設定完成！\n');
    console.log('📝 Rich Menu ID 已保存，請記錄：');
    console.log(`   ${richMenuId}\n`);

    console.log('📱 Rich Menu 按鈕配置：');
    console.log('   ┌─────────┬─────────┬─────────┐');
    console.log('   │  打卡   │ 本月工時 │ 查詢紀錄 │');
    console.log('   ├─────────┴─────────┴─────────┤');
    console.log('   │   管理員後台   │   使用說明   │');
    console.log('   └────────────────┴────────────┘\n');

    console.log('⚠️  下一步：請建立並上傳 Rich Menu 圖片');
    console.log('   1. 建立 2500x1686 的圖片');
    console.log('   2. 按照上方按鈕配置設計');
    console.log('   3. 使用上方指令上傳圖片');

    // 保存 Rich Menu ID 到環境變數檔案
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    if (!envContent.includes('RICH_MENU_ID')) {
      envContent += `\n# Rich Menu ID\nRICH_MENU_ID=${richMenuId}\n`;
      fs.writeFileSync(envPath, envContent);
      console.log('\n✅ Rich Menu ID 已保存到 .env 檔案');
    }

  } catch (error) {
    console.error('❌ 設定失敗:', error.response?.data || error.message);

    if (error.response?.status === 400) {
      console.log('\n💡 提示：如果已經有 Rich Menu，請先刪除舊的：');
      console.log('   node scripts/delete-rich-menu.js');
    }

    process.exit(1);
  }
}

setupRichMenu();
