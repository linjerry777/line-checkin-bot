const { appendToSheet, getSheetData } = require('../config/googleSheets');
const { getCurrentTime, getToday } = require('../utils/timeHelper');

/**
 * 打卡功能
 */
async function checkIn(userId, employeeName, type, location = null) {
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
      location: location ? `${location.lat},${location.lng}` : null,
    };

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
      record.location || '',
    ];

    await appendToSheet(row, '打卡紀錄!A:G');
    console.log('✅ 已儲存到 Google Sheets');
  } catch (error) {
    console.error('❌ Google Sheets 儲存失敗:', error.message);
    throw error; // 拋出錯誤，讓打卡失敗
  }
}

/**
 * 取得今日打卡紀錄（從 Google Sheets）
 */
async function getTodayRecords(userId) {
  try {
    const today = getToday();
    const records = await getSheetData('打卡紀錄!A:G');

    if (!records || records.length <= 1) {
      return [];
    }

    // 過濾今日該使用者的紀錄
    const todayRecords = [];
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (row[0] === today && row[4] === userId) {
        todayRecords.push({
          date: row[0],
          time: row[1],
          employeeName: row[2],
          type: row[3] === '上班' ? 'in' : 'out',
          userId: row[4],
          fullTimestamp: row[5],
          location: row[6] || null,
        });
      }
    }

    return todayRecords;
  } catch (error) {
    console.error('取得打卡紀錄錯誤:', error);
    return [];
  }
}

/**
 * 取得所有紀錄（管理用）
 */
async function getAllRecords() {
  try {
    const records = await getSheetData('打卡紀錄!A:G');

    if (!records || records.length <= 1) {
      return [];
    }

    return records.slice(1).map(row => ({
      date: row[0],
      time: row[1],
      employeeName: row[2],
      type: row[3] === '上班' ? 'in' : 'out',
      userId: row[4],
      fullTimestamp: row[5],
      location: row[6] || null,
    }));
  } catch (error) {
    console.error('取得所有紀錄錯誤:', error);
    return [];
  }
}

module.exports = {
  checkIn,
  getTodayRecords,
  getAllRecords,
};
