// Vercel Serverless Function - 首頁
module.exports = async (req, res) => {
  return res.status(200).json({
    status: 'LINE 打卡系統運行中 (Vercel Serverless)',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/webhook',
      health: '/',
    },
    message: '請將 LINE Webhook URL 設定為: https://your-domain.vercel.app/webhook'
  });
};
