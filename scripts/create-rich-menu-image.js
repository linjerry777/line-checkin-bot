// 使用 SVG + Sharp 建立 Rich Menu 圖片（完整支援繁體中文）
const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const W = 2500;
const H = 1686;

// 按鈕定義（無管理員後台，使用說明全寬）
const buttons = [
  { x: 0,    y: 0,   w: 833,  h: 843, color: '#06C755', icon: '📱', text: '打卡' },
  { x: 833,  y: 0,   w: 834,  h: 843, color: '#00B900', icon: '📊', text: '本月工時' },
  { x: 1667, y: 0,   w: 833,  h: 843, color: '#007AFF', icon: '📋', text: '查詢紀錄' },
  { x: 0,    y: 843, w: 2500, h: 843, color: '#5856D6', icon: '❓', text: '使用說明' },
];

function makeSvg() {
  const rects = buttons.map(b =>
    `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${b.color}"/>`
  ).join('\n  ');

  const borders = buttons.map(b =>
    `<rect x="${b.x + 3}" y="${b.y + 3}" width="${b.w - 6}" height="${b.h - 6}"
      fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="6"/>`
  ).join('\n  ');

  // 圖示用 emoji（外框用 foreignObject + span 方式無法用 sharp，改用文字）
  const iconTexts = buttons.map(b => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2 - 100;
    return `<text x="${cx}" y="${cy}" font-size="220" text-anchor="middle" dominant-baseline="middle"
      font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Arial">${b.icon}</text>`;
  }).join('\n  ');

  const labelTexts = buttons.map(b => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2 + 160;
    return `<text x="${cx}" y="${cy}" font-size="120" font-weight="bold" text-anchor="middle" dominant-baseline="middle"
      font-family="Microsoft JhengHei, 微軟正黑體, 標楷體, PingFang TC, Noto Sans TC, Arial"
      fill="white">${b.text}</text>`;
  }).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${rects}
  ${borders}
  ${iconTexts}
  ${labelTexts}
</svg>`;
}

async function createRichMenuImage() {
  console.log('🎨 建立 Rich Menu 圖片（SVG → PNG）...\n');

  const svgContent = makeSvg();
  const svgPath    = path.join(__dirname, '../richmenu-image.svg');
  const outputPath = path.join(__dirname, '../richmenu-image.png');

  fs.writeFileSync(svgPath, svgContent, 'utf8');
  console.log(`✅ SVG 已產生: ${svgPath}`);

  await sharp(Buffer.from(svgContent))
    .png()
    .toFile(outputPath);

  console.log(`✅ PNG 已輸出: ${outputPath}`);
  console.log(`📏 尺寸: ${W} x ${H} px`);
}

createRichMenuImage()
  .then(() => {
    console.log('\n🎉 完成！接著執行: node scripts/rebuild-rich-menu.js');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 失敗:', err.message);
    process.exit(1);
  });
