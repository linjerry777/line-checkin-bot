const { appendToSheet } = require('../config/googleSheets');
const { getCurrentTime, getToday } = require('../utils/timeHelper');

// 簡易的記憶體儲存（實際應使用資料庫）
const attendanceRecords = [];

/**
 * 打卡功能
 */
async function checkIn(userId, employeeName, type) {
  try {
    const now = new Date();
    const timestamp = getCurrentTime();
    const date = getToday();

    const record = {
      userId,
      employeeName,
      type, // 'in' or 'out'
      date,
      time: timestamp,
      fullTimestamp: now.toISOString(),
    };

    // 儲存到記憶體
    attendanceRecords.push(record);

    // 儲存到 Google Sheets
    await saveToGoogleSheets(record);

    console.log(`✅ 打卡成功: ${employeeName} - ${type} - ${timestamp}`);

    return {
      success: true,
      time: timestamp,
      record,
    };
  } catch (error) {
    console.error('打卡錯誤:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 儲存到 Google Sheets
 */
async function saveToGoogleSheets(record) {
  try {
    const row = [
      record.date,
      record.time,
      record.employeeName,
      record.type === 'in' ? '上班' : '下班',
      record.userId,
      record.fullTimestamp,
    ];

    await appendToSheet(row);
    console.log('✅ 已儲存到 Google Sheets');
  } catch (error) {
    console.error('❌ Google Sheets 儲存失敗:', error.message);
    // 不要因為 Google Sheets 錯誤而中斷打卡流程
  }
}

/**
 * 取得今日打卡紀錄
 */
function getTodayRecords(userId) {
  const today = getToday();
  return attendanceRecords.filter(
    (record) => record.userId === userId && record.date === today
  );
}

/**
 * 取得所有紀錄（管理用）
 */
function getAllRecords() {
  return attendanceRecords;
}

module.exports = {
  checkIn,
  getTodayRecords,
  getAllRecords,
};
