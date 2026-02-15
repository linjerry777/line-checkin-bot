// 統計分析服務
const { getSheetData } = require('../config/googleSheets');

/**
 * 計算遲到早退統計
 * @param {string} month - 格式：YYYY-MM
 * @param {object} settings - 設定 { workStartTime, workEndTime }
 */
async function getLateEarlyStats(month, settings = { workStartTime: '09:00', workEndTime: '18:00' }) {
  try {
    const records = await getSheetData('打卡紀錄!A:G');

    if (!records || records.length <= 1) {
      return { employees: [], summary: { total: 0, lateCount: 0, earlyCount: 0 } };
    }

    // 過濾該月份的紀錄
    const monthRecords = records.slice(1).filter(row => row[3]?.startsWith(month));

    // 按員工分組
    const employeeStats = {};

    monthRecords.forEach(row => {
      const userId = row[0];
      const employeeName = row[1];
      const type = row[2];
      const date = row[3];
      const time = row[4];

      if (!userId || !date || !time) return;

      if (!employeeStats[userId]) {
        employeeStats[userId] = {
          userId,
          name: employeeName,
          lateCount: 0,
          earlyCount: 0,
          lateDays: [],
          earlyDays: [],
          totalDays: new Set()
        };
      }

      employeeStats[userId].totalDays.add(date);

      // 檢查遲到（上班打卡）
      if (type === 'in') {
        const checkInTime = time.split(':').slice(0, 2).join(':'); // 取 HH:MM
        if (checkInTime > settings.workStartTime) {
          employeeStats[userId].lateCount++;
          employeeStats[userId].lateDays.push({ date, time });
        }
      }

      // 檢查早退（下班打卡）
      if (type === 'out') {
        const checkOutTime = time.split(':').slice(0, 2).join(':');
        if (checkOutTime < settings.workEndTime) {
          employeeStats[userId].earlyCount++;
          employeeStats[userId].earlyDays.push({ date, time });
        }
      }
    });

    // 轉換為陣列並計算百分比
    const employees = Object.values(employeeStats).map(emp => ({
      userId: emp.userId,
      name: emp.name,
      totalDays: emp.totalDays.size,
      lateCount: emp.lateCount,
      earlyCount: emp.earlyCount,
      lateRate: emp.totalDays.size > 0 ? (emp.lateCount / emp.totalDays.size * 100).toFixed(1) : 0,
      earlyRate: emp.totalDays.size > 0 ? (emp.earlyCount / emp.totalDays.size * 100).toFixed(1) : 0,
      lateDays: emp.lateDays,
      earlyDays: emp.earlyDays
    }));

    // 計算總計
    const summary = {
      total: employees.reduce((sum, emp) => sum + emp.totalDays, 0),
      lateCount: employees.reduce((sum, emp) => sum + emp.lateCount, 0),
      earlyCount: employees.reduce((sum, emp) => sum + emp.earlyCount, 0)
    };

    return { employees, summary, settings };

  } catch (error) {
    console.error('計算遲到早退統計錯誤:', error);
    return { employees: [], summary: { total: 0, lateCount: 0, earlyCount: 0 } };
  }
}

/**
 * 取得本月工時排行
 */
async function getMonthHoursRanking(month) {
  try {
    const records = await getSheetData('打卡紀錄!A:G');

    if (!records || records.length <= 1) {
      return [];
    }

    // 過濾該月份的紀錄
    const monthRecords = records.slice(1).filter(row => row[3]?.startsWith(month));

    // 按員工和日期分組
    const employeeHours = {};

    monthRecords.forEach(row => {
      const userId = row[0];
      const employeeName = row[1];
      const type = row[2];
      const date = row[3];
      const time = row[4];

      if (!userId || !date || !time) return;

      if (!employeeHours[userId]) {
        employeeHours[userId] = {
          name: employeeName,
          days: {}
        };
      }

      if (!employeeHours[userId].days[date]) {
        employeeHours[userId].days[date] = { in: null, out: null };
      }

      if (type === 'in') {
        employeeHours[userId].days[date].in = time;
      } else if (type === 'out') {
        employeeHours[userId].days[date].out = time;
      }
    });

    // 計算每個員工的總工時
    const ranking = Object.entries(employeeHours).map(([userId, data]) => {
      let totalMinutes = 0;
      let workDays = 0;

      Object.values(data.days).forEach(day => {
        if (day.in && day.out) {
          const inTime = new Date(`2000-01-01T${day.in}`);
          const outTime = new Date(`2000-01-01T${day.out}`);
          const minutes = (outTime - inTime) / 1000 / 60;
          if (minutes > 0 && minutes < 24 * 60) {
            totalMinutes += minutes;
            workDays++;
          }
        }
      });

      const hours = totalMinutes / 60;

      return {
        userId,
        name: data.name,
        totalHours: hours.toFixed(1),
        workDays,
        avgHours: workDays > 0 ? (hours / workDays).toFixed(1) : 0
      };
    });

    // 依總工時排序
    ranking.sort((a, b) => parseFloat(b.totalHours) - parseFloat(a.totalHours));

    return ranking;

  } catch (error) {
    console.error('取得工時排行錯誤:', error);
    return [];
  }
}

module.exports = {
  getLateEarlyStats,
  getMonthHoursRanking
};
