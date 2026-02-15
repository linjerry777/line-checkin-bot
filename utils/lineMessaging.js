// LINE Messaging API utilities
const axios = require('axios');

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

/**
 * 推送訊息給指定使用者
 * @param {string} userId - LINE 使用者 ID
 * @param {object|string} message - 訊息內容（Flex Message 或純文字）
 */
async function pushMessage(userId, message) {
  try {
    const messages = Array.isArray(message) ? message : [
      typeof message === 'string' ? { type: 'text', text: message } : message
    ];

    const response = await axios.post(
      `${LINE_MESSAGING_API}/push`,
      {
        to: userId,
        messages: messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('推送訊息失敗:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 推送訊息給多位使用者
 * @param {string[]} userIds - LINE 使用者 ID 陣列（最多 500 個）
 * @param {object|string} message - 訊息內容
 */
async function multicast(userIds, message) {
  try {
    if (userIds.length === 0) {
      throw new Error('使用者列表不能為空');
    }

    if (userIds.length > 500) {
      throw new Error('一次最多只能推送給 500 位使用者');
    }

    const messages = Array.isArray(message) ? message : [
      typeof message === 'string' ? { type: 'text', text: message } : message
    ];

    const response = await axios.post(
      `${LINE_MESSAGING_API}/multicast`,
      {
        to: userIds,
        messages: messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('群發訊息失敗:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 回覆訊息（用於 webhook）
 * @param {string} replyToken - Reply token
 * @param {object|string} message - 訊息內容
 */
async function replyMessage(replyToken, message) {
  try {
    const messages = Array.isArray(message) ? message : [
      typeof message === 'string' ? { type: 'text', text: message } : message
    ];

    const response = await axios.post(
      `${LINE_MESSAGING_API}/reply`,
      {
        replyToken: replyToken,
        messages: messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('回覆訊息失敗:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  pushMessage,
  multicast,
  replyMessage
};
