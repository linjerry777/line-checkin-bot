const { TextMessage } = require('@line/bot-sdk');
const attendanceService = require('../services/attendanceService');
const employeeService = require('../services/employeeService');
const { getCurrentTime } = require('../utils/timeHelper');

/**
 * 處理 LINE 事件
 */
async function handleLineEvent(event, client) {
  // 只處理文字訊息
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const userMessage = event.message.text.trim();

  console.log(`收到訊息: ${userMessage} (來自: ${userId})`);

  try {
    // 取得使用者資料
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
 * 處理使用者指令
 */
async function processCommand(userId, profile, message) {
  // 註冊指令
  if (message.startsWith('註冊')) {
    const name = message.replace('註冊', '').trim();
    if (!name) {
      return '請使用格式：註冊 [姓名]\n例如：註冊 王小明';
    }

    // 使用 Employee Service 註冊
    const result = await employeeService.registerEmployee(userId, name, profile.displayName);

    if (!result.success) {
      if (result.error === '此帳號已註冊') {
        return `⚠️ 您已經註冊過了！\n\n員工姓名：${result.employee.name}\n\n可直接使用打卡功能`;
      }
      return `❌ 註冊失敗：${result.error}`;
    }

    console.log(`✅ 新員工註冊: ${name} (${userId})`);
    return `✅ 註冊成功！\n\n員工姓名：${name}\n\n您現在可以使用以下指令：\n• 上班 - 上班打卡\n• 下班 - 下班打卡\n• 查詢 - 查詢今日紀錄`;
  }

  // 檢查是否已註冊
  const employee = await employeeService.getEmployeeByUserId(userId);
  if (!employee) {
    return '❌ 您尚未註冊\n\n請先使用「註冊 [姓名]」進行註冊\n例如：註冊 王小明';
  }

  // 上班打卡
  if (message === '上班' || message === '打卡') {
    const result = await attendanceService.checkIn(userId, employee.name, 'in');
    return result.success ? `✅ 上班打卡成功！\n\n員工：${employee.name}\n時間：${result.time}` : `❌ 打卡失敗：${result.error}`;
  }

  // 下班打卡
  if (message === '下班') {
    const result = await attendanceService.checkIn(userId, employee.name, 'out');
    return result.success ? `✅ 下班打卡成功！\n\n員工：${employee.name}\n時間：${result.time}` : `❌ 打卡失敗：${result.error}`;
  }

  // 查詢紀錄
  if (message === '查詢' || message === '查詢紀錄') {
    const records = await attendanceService.getTodayRecords(userId);
    if (records.length === 0) {
      return '今日尚無打卡紀錄';
    }

    let response = `📋 ${employee.name} 今日打卡紀錄：\n\n`;
    records.forEach((record, index) => {
      response += `${index + 1}. ${record.type === 'in' ? '上班' : '下班'} - ${record.time}\n`;
    });
    return response;
  }

  // 本月工時統計
  if (message === '本月工時' || message === '工時' || message === '統計') {
    const allRecords = await attendanceService.getAllRecords();
    const thisMonth = new Date().toISOString().slice(0, 7);

    // 過濾本月該員工的紀錄
    const monthRecords = allRecords.filter(r =>
      r.userId === userId && r.date.startsWith(thisMonth)
    );

    if (monthRecords.length === 0) {
      return `📊 ${employee.name} 本月統計\n\n本月尚無打卡紀錄`;
    }

    // 計算工作天數
    const workDays = new Set(monthRecords.map(r => r.date)).size;

    // 計算總工時
    const dailyHours = {};
    monthRecords.forEach(record => {
      if (!dailyHours[record.date]) {
        dailyHours[record.date] = { in: null, out: null };
      }
      if (record.type === 'in') {
        dailyHours[record.date].in = record.time;
      } else if (record.type === 'out') {
        dailyHours[record.date].out = record.time;
      }
    });

    let totalMinutes = 0;
    let completeDays = 0;

    Object.values(dailyHours).forEach(day => {
      if (day.in && day.out) {
        const inTime = new Date(`2000-01-01T${day.in}`);
        const outTime = new Date(`2000-01-01T${day.out}`);
        const minutes = (outTime - inTime) / 1000 / 60;
        if (minutes > 0 && minutes < 24 * 60) {
          totalMinutes += minutes;
          completeDays++;
        }
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const avgHours = completeDays > 0 ? (totalMinutes / 60 / completeDays).toFixed(1) : 0;

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
    helpText += `• 註冊 [姓名] - 員工註冊\n`;
    helpText += `• 上班 - 上班打卡\n`;
    helpText += `• 下班 - 下班打卡\n`;
    helpText += `• 查詢 - 查詢今日紀錄\n`;
    helpText += `• 本月工時 - 查看本月統計\n\n`;
    helpText += `📱 網頁功能：\n`;
    helpText += `• 打卡介面 - 含日曆、統計\n`;

    // 如果是管理員，顯示管理員功能
    if (employee.role === 'admin') {
      helpText += `• 管理員後台 - 查看所有員工\n\n`;
      helpText += `👨‍💼 管理員功能：\n`;
      helpText += `• 查看所有員工出勤\n`;
      helpText += `• 匯出月報表\n`;
      helpText += `• 出勤統計分析\n`;
    }

    return helpText;
  }

  // 未知指令
  return '❓ 未知的指令\n\n請輸入「說明」查看可用指令';
}

module.exports = {
  handleLineEvent,
};
