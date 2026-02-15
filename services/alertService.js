// 異常打卡警報服務
const { getSheetData, appendToSheet } = require('../config/googleSheets');
const { getAllSettings } = require('./settingsService');
const { getAllEmployees } = require('./employeeService');

/**
 * 異常類型定義
 */
const ALERT_TYPES = {
  LATE: 'late',           // 遲到
  EARLY: 'early',         // 早退
  MISSING: 'missing',     // 未打卡
  DUPLICATE: 'duplicate', // 重複打卡
  UNUSUAL_TIME: 'unusual' // 非常規時間打卡（深夜、凌晨）
};

/**
 * 檢查今日所有異常並記錄
 */
async function checkTodayAnomalies() {
  const today = new Date().toISOString().split('T')[0];
  const anomalies = [];

  try {
    const settings = await getAllSettings();
    const employees = await getAllEmployees();
    const activeEmployees = employees.filter(emp => emp.status === 'active');

    // 取得今日打卡紀錄
    const records = await getSheetData('打卡紀錄!A:G');
    const todayRecords = records.slice(1).filter(row => row[3] === today);

    // 檢查每位員工
    for (const employee of activeEmployees) {
      const employeeRecords = todayRecords.filter(r => r[0] === employee.userId);

      // 1. 檢查遲到
      const lateCheck = checkLate(employeeRecords, settings);
      if (lateCheck) anomalies.push({ ...lateCheck, employee });

      // 2. 檢查早退
      const earlyCheck = checkEarly(employeeRecords, settings);
      if (earlyCheck) anomalies.push({ ...earlyCheck, employee });

      // 3. 檢查未打卡
      const missingCheck = checkMissing(employeeRecords, settings);
      if (missingCheck) anomalies.push({ ...missingCheck, employee });

      // 4. 檢查重複打卡
      const duplicateCheck = checkDuplicate(employeeRecords);
      if (duplicateCheck) anomalies.push({ ...duplicateCheck, employee });

      // 5. 檢查非常規時間
      const unusualCheck = checkUnusualTime(employeeRecords);
      if (unusualCheck) anomalies.push({ ...unusualCheck, employee });
    }

    // 記錄異常到 Google Sheets
    if (anomalies.length > 0) {
      await saveAnomalies(anomalies);
    }

    return anomalies;

  } catch (error) {
    console.error('檢查異常錯誤:', error);
    throw error;
  }
}

/**
 * 檢查遲到（上班打卡時間晚於標準時間）
 */
function checkLate(employeeRecords, settings) {
  const checkIn = employeeRecords.find(r => r[2] === 'in');
  if (!checkIn) return null;

  const checkInTime = checkIn[4]; // 時間欄位
  const workStartTime = settings.workStartTime || '09:00';
  const lateThreshold = parseInt(settings.lateThreshold || '15'); // 遲到容忍分鐘數

  if (isLaterThan(checkInTime, workStartTime, lateThreshold)) {
    const minutesLate = getMinutesDifference(workStartTime, checkInTime);
    return {
      type: ALERT_TYPES.LATE,
      severity: minutesLate > 30 ? 'high' : 'medium',
      message: `遲到 ${minutesLate} 分鐘`,
      time: checkInTime,
      expectedTime: workStartTime,
      minutesLate
    };
  }

  return null;
}

/**
 * 檢查早退（下班打卡時間早於標準時間）
 */
function checkEarly(employeeRecords, settings) {
  const checkOut = employeeRecords.find(r => r[2] === 'out');
  if (!checkOut) return null;

  const checkOutTime = checkOut[4];
  const workEndTime = settings.workEndTime || '18:00';
  const earlyThreshold = parseInt(settings.earlyThreshold || '15'); // 早退容忍分鐘數

  if (isEarlierThan(checkOutTime, workEndTime, earlyThreshold)) {
    const minutesEarly = getMinutesDifference(checkOutTime, workEndTime);
    return {
      type: ALERT_TYPES.EARLY,
      severity: minutesEarly > 30 ? 'high' : 'medium',
      message: `早退 ${minutesEarly} 分鐘`,
      time: checkOutTime,
      expectedTime: workEndTime,
      minutesEarly
    };
  }

  return null;
}

/**
 * 檢查未打卡（當天應該要有上班或下班打卡）
 */
function checkMissing(employeeRecords, settings) {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const workStartTime = settings.workStartTime || '09:00';
  const workEndTime = settings.workEndTime || '18:00';

  const hasCheckIn = employeeRecords.some(r => r[2] === 'in');
  const hasCheckOut = employeeRecords.some(r => r[2] === 'out');

  // 如果已經過了上班時間 1 小時，還沒打上班卡
  if (!hasCheckIn && isLaterThan(currentTime, workStartTime, 60)) {
    return {
      type: ALERT_TYPES.MISSING,
      severity: 'high',
      message: '未打上班卡',
      expectedTime: workStartTime,
      missingType: 'check-in'
    };
  }

  // 如果已經過了下班時間 1 小時，有上班卡但沒下班卡
  if (hasCheckIn && !hasCheckOut && isLaterThan(currentTime, workEndTime, 60)) {
    return {
      type: ALERT_TYPES.MISSING,
      severity: 'medium',
      message: '未打下班卡',
      expectedTime: workEndTime,
      missingType: 'check-out'
    };
  }

  return null;
}

/**
 * 檢查重複打卡（同一類型打卡超過 1 次）
 */
function checkDuplicate(employeeRecords) {
  const checkInCount = employeeRecords.filter(r => r[2] === 'in').length;
  const checkOutCount = employeeRecords.filter(r => r[2] === 'out').length;

  if (checkInCount > 1) {
    return {
      type: ALERT_TYPES.DUPLICATE,
      severity: 'low',
      message: `重複上班打卡 ${checkInCount} 次`,
      count: checkInCount,
      duplicateType: 'check-in'
    };
  }

  if (checkOutCount > 1) {
    return {
      type: ALERT_TYPES.DUPLICATE,
      severity: 'low',
      message: `重複下班打卡 ${checkOutCount} 次`,
      count: checkOutCount,
      duplicateType: 'check-out'
    };
  }

  return null;
}

/**
 * 檢查非常規時間打卡（深夜 23:00-05:00）
 */
function checkUnusualTime(employeeRecords) {
  for (const record of employeeRecords) {
    const time = record[4];
    const hour = parseInt(time.split(':')[0]);

    if (hour >= 23 || hour < 5) {
      return {
        type: ALERT_TYPES.UNUSUAL_TIME,
        severity: 'medium',
        message: `非常規時間打卡（${time}）`,
        time,
        recordType: record[2]
      };
    }
  }

  return null;
}

/**
 * 儲存異常到 Google Sheets
 */
async function saveAnomalies(anomalies) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  for (const anomaly of anomalies) {
    const row = [
      today,                          // A 欄：日期
      now,                            // B 欄：偵測時間
      anomaly.employee.userId,        // C 欄：員工ID
      anomaly.employee.name,          // D 欄：員工姓名
      anomaly.type,                   // E 欄：異常類型
      anomaly.severity,               // F 欄：嚴重程度
      anomaly.message,                // G 欄：訊息
      JSON.stringify(anomaly)         // H 欄：完整資料（JSON）
    ];

    await appendToSheet(row, '異常警報!A:H');
  }
}

/**
 * 取得今日異常列表
 */
async function getTodayAnomalies() {
  const today = new Date().toISOString().split('T')[0];

  try {
    const data = await getSheetData('異常警報!A:H');

    if (!data || data.length <= 1) {
      return [];
    }

    const anomalies = data.slice(1)
      .filter(row => row[0] === today)
      .map(row => ({
        date: row[0],
        detectedAt: row[1],
        userId: row[2],
        employeeName: row[3],
        type: row[4],
        severity: row[5],
        message: row[6],
        details: row[7] ? JSON.parse(row[7]) : null
      }));

    return anomalies;

  } catch (error) {
    console.error('取得異常列表錯誤:', error);
    return [];
  }
}

/**
 * 取得指定日期範圍的異常統計
 */
async function getAnomalyStats(startDate, endDate) {
  try {
    const data = await getSheetData('異常警報!A:H');

    if (!data || data.length <= 1) {
      return { total: 0, byType: {}, bySeverity: {}, byEmployee: {} };
    }

    const anomalies = data.slice(1)
      .filter(row => row[0] >= startDate && row[0] <= endDate)
      .map(row => ({
        date: row[0],
        userId: row[2],
        employeeName: row[3],
        type: row[4],
        severity: row[5]
      }));

    const stats = {
      total: anomalies.length,
      byType: {},
      bySeverity: {},
      byEmployee: {}
    };

    anomalies.forEach(a => {
      stats.byType[a.type] = (stats.byType[a.type] || 0) + 1;
      stats.bySeverity[a.severity] = (stats.bySeverity[a.severity] || 0) + 1;

      if (!stats.byEmployee[a.employeeName]) {
        stats.byEmployee[a.employeeName] = { count: 0, types: {} };
      }
      stats.byEmployee[a.employeeName].count++;
      stats.byEmployee[a.employeeName].types[a.type] =
        (stats.byEmployee[a.employeeName].types[a.type] || 0) + 1;
    });

    return stats;

  } catch (error) {
    console.error('取得異常統計錯誤:', error);
    return { total: 0, byType: {}, bySeverity: {}, byEmployee: {} };
  }
}

// 工具函數
function isLaterThan(time1, time2, thresholdMinutes = 0) {
  const minutes1 = timeToMinutes(time1);
  const minutes2 = timeToMinutes(time2);
  return minutes1 > (minutes2 + thresholdMinutes);
}

function isEarlierThan(time1, time2, thresholdMinutes = 0) {
  const minutes1 = timeToMinutes(time1);
  const minutes2 = timeToMinutes(time2);
  return minutes1 < (minutes2 - thresholdMinutes);
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function getMinutesDifference(time1, time2) {
  return Math.abs(timeToMinutes(time2) - timeToMinutes(time1));
}

module.exports = {
  ALERT_TYPES,
  checkTodayAnomalies,
  getTodayAnomalies,
  getAnomalyStats
};
