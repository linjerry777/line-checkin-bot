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
    // 正確順序：員工ID, 員工姓名, 類型, 日期, 時間, 完整時間戳記, 位置
    const row = [
      record.userId,           // A 欄：員工ID
      record.employeeName,     // B 欄：員工姓名
      record.type,             // C 欄：類型 (in/out)
      record.date,             // D 欄：日期
      record.time,             // E 欄：時間
      record.fullTimestamp,    // F 欄：完整時間戳記
      record.location || '',   // G 欄：位置
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
    // 正確順序：員工ID(A), 員工姓名(B), 類型(C), 日期(D), 時間(E), 完整時間戳記(F), 位置(G)
    const todayRecords = [];
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (row[3] === today && row[0] === userId) {
        todayRecords.push({
          userId: row[0],
          employeeName: row[1],
          type: row[2],
          date: row[3],
          time: row[4],
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

    // 正確順序：員工ID(A), 員工姓名(B), 類型(C), 日期(D), 時間(E), 完整時間戳記(F), 位置(G)
    return records.slice(1).map(row => ({
      userId: row[0],
      employeeName: row[1],
      type: row[2],
      date: row[3],
      time: row[4],
      fullTimestamp: row[5],
      location: row[6] || null,
    }));
  } catch (error) {
    console.error('取得所有紀錄錯誤:', error);
    return [];
  }
}

/**
 * 取得特定員工所有打卡紀錄（員工端用）
 */
async function getAllRecordsByUserId(userId) {
  try {
    const records = await getSheetData('打卡紀錄!A:G');

    if (!records || records.length <= 1) {
      return [];
    }

    return records.slice(1)
      .filter(row => row[0] === userId)
      .map(row => ({
        userId: row[0],
        employeeName: row[1],
        type: row[2],
        date: row[3],
        time: row[4],
        fullTimestamp: row[5],
        location: row[6] || null,
      }));
  } catch (error) {
    console.error('取得員工紀錄錯誤:', error);
    return [];
  }
}

module.exports = {
  checkIn,
  getTodayRecords,
  getAllRecords,
  getAllRecordsByUserId,
};
