// 使用 Canvas 建立 Rich Menu 圖片
const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

function createRichMenuImage() {
  console.log('🎨 開始建立 Rich Menu 圖片...\n');

  // 建立 2500x1686 的 canvas
  const width = 2500;
  const height = 1686;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 背景色
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 定義按鈕區域和顏色
  const buttons = [
    { x: 0, y: 0, w: 833, h: 843, color: '#06C755', icon: '📱', text: '打卡' },
    { x: 833, y: 0, w: 834, h: 843, color: '#00B900', icon: '📊', text: '本月工時' },
    { x: 1667, y: 0, w: 833, h: 843, color: '#007AFF', icon: '📋', text: '查詢紀錄' },
    { x: 0, y: 843, w: 1250, h: 843, color: '#FF9500', icon: '👨‍💼', text: '管理員後台' },
    { x: 1250, y: 843, w: 1250, h: 843, color: '#5856D6', icon: '❓', text: '使用說明' }
  ];

  // 繪製每個按鈕
  buttons.forEach((btn, index) => {
    // 按鈕背景
    ctx.fillStyle = btn.color;
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

    // 按鈕邊框
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(btn.x + 2, btn.y + 2, btn.w - 4, btn.h - 4);

    // 圖示 (emoji)
    ctx.font = 'bold 200px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.icon, btn.x + btn.w / 2, btn.y + btn.h / 2 - 80);

    // 文字
    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2 + 120);
  });

  // 儲存圖片
  const outputPath = path.join(__dirname, '../richmenu-image.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log('✅ Rich Menu 圖片已建立');
  console.log(`📁 檔案位置: ${outputPath}`);
  console.log(`📏 圖片尺寸: ${width} x ${height} px\n`);

  return outputPath;
}

// 執行
try {
  const imagePath = createRichMenuImage();
  console.log('🎉 完成！');
  process.exit(0);
} catch (error) {
  console.error('❌ 建立圖片失敗:', error.message);
  console.log('\n💡 提示：需要安裝 canvas 套件');
  console.log('   npm install canvas');
  process.exit(1);
}
