// 一鍵重建 Rich Menu（刪舊的 → 建新的 → 上傳圖片 → 設為預設）
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API = 'https://api.line.me/v2/bot/richmenu';
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const headers = { Authorization: `Bearer ${TOKEN}` };

async function run() {
  console.log('🔄 開始重建 Rich Menu...\n');

  // 1. 列出並刪除所有舊的 rich menu
  console.log('1️⃣  刪除舊的 Rich Menu...');
  try {
    const list = await axios.get(API + '/list', { headers });
    const menus = list.data.richmenus || [];
    if (menus.length === 0) {
      console.log('   （無舊選單）');
    }
    for (const m of menus) {
      await axios.delete(`${API}/${m.richMenuId}`, { headers });
      console.log(`   ✅ 已刪除: ${m.richMenuId} (${m.name})`);
    }
  } catch (e) {
    console.error('   ⚠️  刪除失敗:', e.response?.data || e.message);
  }

  // 2. 建立新 Rich Menu
  console.log('\n2️⃣  建立新 Rich Menu...');
  const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/richMenu.json'), 'utf8')
  );
  const createRes = await axios.post(API, config, {
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
  const richMenuId = createRes.data.richMenuId;
  console.log(`   ✅ Rich Menu 已建立: ${richMenuId}`);

  // 3. 上傳圖片
  console.log('\n3️⃣  上傳 Rich Menu 圖片...');
  const imgPath = path.join(__dirname, '../richmenu-image.png');
  if (!fs.existsSync(imgPath)) {
    console.error('   ❌ 找不到圖片: richmenu-image.png');
    console.log('   請先執行: node scripts/create-rich-menu-image.js');
    process.exit(1);
  }
  const imgBuffer = fs.readFileSync(imgPath);
  await axios.post(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    imgBuffer,
    { headers: { ...headers, 'Content-Type': 'image/png' } }
  );
  console.log('   ✅ 圖片上傳成功');

  // 4. 設為預設選單（正確 endpoint：PUT /user/all/richmenu/{id}）
  console.log('\n4️⃣  設為預設 Rich Menu...');
  await axios.post(
    `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
    {},
    { headers }
  );
  console.log('   ✅ 已設為預設');

  console.log('\n🎉 Rich Menu 重建完成！');
  console.log(`   Rich Menu ID: ${richMenuId}`);
  console.log('\n📱 新選單按鈕：');
  console.log('   ┌─────────┬─────────┬─────────┐');
  console.log('   │  打卡   │ 本月工時 │ 查詢紀錄 │');
  console.log('   ├─────────────────────────────┤');
  console.log('   │           使用說明           │');
  console.log('   └─────────────────────────────┘');
}

run().catch(err => {
  console.error('\n❌ 失敗:', err.response?.data || err.message);
  process.exit(1);
});
