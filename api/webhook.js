const line = require('@line/bot-sdk');
const { handleLineEvent } = require('../controllers/lineBot');

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

// Vercel Serverless Function
module.exports = async (req, res) => {
  // 只接受 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 驗證 LINE 簽名
    const signature = req.headers['x-line-signature'];
    if (!signature) {
      return res.status(401).json({ error: 'No signature' });
    }

    // LINE SDK 會自動驗證簽名
    const events = req.body.events;

    if (!events || events.length === 0) {
      return res.status(200).json({ message: 'No events' });
    }

    // 處理所有事件
    const results = await Promise.all(
      events.map((event) => handleLineEvent(event, client))
    );

    return res.status(200).json({
      status: 'success',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
