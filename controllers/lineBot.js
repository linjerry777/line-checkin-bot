const attendanceService = require('../services/attendanceService');
const employeeService = require('../services/employeeService');

/**
 * 處理 LINE 事件
 */
async function handleLineEvent(event, client) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const userMessage = event.message.text.trim();

  console.log(`收到訊息: ${userMessage} (來自: ${userId})`);

  try {
    const profile = await client.getProfile(userId);
    const replyMessage = await processCommand(userId, profile, userMessage);

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: replyMessage }],
    });
  } catch (error) {
    console.error('處理訊息錯誤:', error);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: '系統錯誤，請稍後再試' }],
    });
  }
}

/**
 * 將 "H:MM:SS" 或 "HH:MM:SS" 或 "HH:MM" 轉成分鐘數
 */
function timeToMinutes(t) {
  if (!t) return null;
  const parts = String(t).split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * 處理使用者指令
 */
async function processCommand(userId, profile, message) {
  // 查詢自己的 LINE ID（給管理員新增帳號用）
  if (message === '我的ID' || message === 'ID' || message === 'id') {
    return `🪪 您的 LINE User ID：\n\n${userId}\n\n請將此 ID 提供給管理員，由管理員為您建立帳號`;
  }

  // 自行註冊
  if (message.startsWith('註冊')) {
    const name = message.replace('註冊', '').trim();
    if (!name) return '請使用格式：註冊 [姓名]\n例如：註冊 王小明';
    const result = await employeeService.registerEmployee(userId, name, profile.displayName);
    if (!result.success) {
      if (result.error === '此帳號已註冊') return `⚠️ 您已經註冊過了！\n\n員工姓名：${result.employee.name}\n\n可直接使用打卡功能`;
      return `❌ 註冊失敗：${result.error}`;
    }
    return `✅ 註冊成功！\n\n員工姓名：${name}\n\n您現在可以使用：\n• 上班 - 上班打卡\n• 下班 - 下班打卡\n• 查詢 - 查詢今日紀錄`;
  }

  // 檢查是否已有帳號
  const employee = await employeeService.getEmployeeByUserId(userId);
  if (!employee) {
    return '❌ 您尚未建立帳號\n\n請使用「註冊 [姓名]」自行註冊\n例如：註冊 王小明';
  }

  // 上班打卡
  if (message === '上班' || message === '打卡') {
    const result = await attendanceService.checkIn(userId, employee.name, 'in');
    return result.success
      ? `✅ 上班打卡成功！\n\n員工：${employee.name}\n時間：${result.time}`
      : `❌ 打卡失敗：${result.error}`;
  }

  // 下班打卡
  if (message === '下班') {
    const result = await attendanceService.checkIn(userId, employee.name, 'out');
    return result.success
      ? `✅ 下班打卡成功！\n\n員工：${employee.name}\n時間：${result.time}`
      : `❌ 打卡失敗：${result.error}`;
  }

  // 查詢紀錄
  if (message === '查詢' || message === '查詢紀錄') {
    const records = await attendanceService.getTodayRecords(userId);
    if (records.length === 0) return '今日尚無打卡紀錄';

    let response = `📋 ${employee.name} 今日打卡紀錄：\n\n`;
    records.forEach((record, index) => {
      response += `${index + 1}. ${record.type === 'in' ? '上班' : '下班'} - ${record.time}\n`;
    });
    return response;
  }

  // 本月工時統計
  if (message === '本月工時' || message === '工時' || message === '統計') {
    const allRecords = await attendanceService.getAllRecords();

    // 使用台灣時間取本月 YYYY-MM
    const thisMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }).slice(0, 7);

    const monthRecords = allRecords.filter(r =>
      r.userId === userId && r.date && r.date.startsWith(thisMonth)
    );

    if (monthRecords.length === 0) {
      return `📊 ${employee.name} 本月統計\n\n本月尚無打卡紀錄`;
    }

    // 每天：取「第一筆 in」和「最後一筆 out」（與 LIFF app 邏輯一致）
    const dailyHours = {};
    monthRecords.forEach(record => {
      if (!dailyHours[record.date]) {
        dailyHours[record.date] = { in: null, out: null };
      }
      if (record.type === 'in' && !dailyHours[record.date].in) {
        dailyHours[record.date].in = record.time;   // 只取第一筆 in
      } else if (record.type === 'out') {
        dailyHours[record.date].out = record.time;  // 取最後一筆 out
      }
    });

    const workDays = new Set(monthRecords.filter(r => r.type === 'in').map(r => r.date)).size;
    let totalMinutes = 0;
    let completeDays = 0;

    Object.values(dailyHours).forEach(day => {
      if (day.in && day.out) {
        const inMin  = timeToMinutes(day.in);
        const outMin = timeToMinutes(day.out);
        const diff = outMin - inMin;
        if (diff > 0 && diff < 24 * 60) {
          totalMinutes += diff;
          completeDays++;
        }
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const avgHours   = completeDays > 0 ? (totalMinutes / 60 / completeDays).toFixed(1) : 0;

    let response = `📊 ${employee.name} 本月統計\n`;
    response += `━━━━━━━━━━━━━━━\n\n`;
    response += `📅 出勤天數：${workDays} 天\n`;
    response += `⏱️  總工時：${totalHours} 小時\n`;
    response += `📈 平均工時：${avgHours} 小時/天\n`;
    response += `✅ 完整出勤：${completeDays} 天\n\n`;
    response += `💡 點選下方選單可查看詳細資料`;

    return response;
  }

  // 說明指令
  if (message === '說明' || message === '幫助' || message === 'help' || message === '使用說明') {
    let helpText = `🤖 LINE 打卡系統使用說明\n`;
    helpText += `━━━━━━━━━━━━━━━\n\n`;
    helpText += `📝 基本指令：\n`;
    helpText += `• 上班 - 上班打卡\n`;
    helpText += `• 下班 - 下班打卡\n`;
    helpText += `• 查詢 - 查詢今日紀錄\n`;
    helpText += `• 本月工時 - 查看本月統計\n`;
    helpText += `• 註冊 [姓名] - 首次使用請先註冊\n`;
    helpText += `• 我的ID - 取得 LINE ID\n`;
    return helpText;
  }

  // 還在加班
  if (message === '還在加班' || message === '還在加班中' || message === '加班中') {
    return `⌚ 收到！繼續加油 ${employee.name}！\n\n記得完成後打下班卡喔 💪`;
  }

  // 稍後提醒
  if (message === '稍後提醒' || message === '稍後提醒我') {
    return `⏰ 好的，稍後記得打上班卡喔！\n\n${employee.name} 加油 😊`;
  }

  return '❓ 未知的指令\n\n請輸入「說明」查看可用指令';
}

module.exports = { handleLineEvent };
