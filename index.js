require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { handleLineEvent } = require('./controllers/lineBot');

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

const app = express();
const PORT = process.env.PORT || 3000;

// Webhook 路由
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const results = await Promise.all(
      req.body.events.map((event) => handleLineEvent(event, client))
    );
    res.json({ status: 'success', results });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 健康檢查路由
app.get('/', (req, res) => {
  res.json({
    status: 'LINE 打卡系統運行中',
    timestamp: new Date().toISOString(),
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`✅ 伺服器啟動成功！`);
  console.log(`📍 PORT: ${PORT}`);
  console.log(`🤖 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`\n⚠️  記得使用 ngrok 建立公開 URL 並設定到 LINE Developers Console`);
});
