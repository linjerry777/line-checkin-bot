const { getSheetData, appendToSheet, updateSheetData } = require('../config/googleSheets');
const { getEmployeeByUserId, updateEmployeeAnnualLeave } = require('./employeeService');

/**
 * 請假服務 - 使用 Google Sheets「請假紀錄」工作表
 *
 * 欄位定義 (A~O):
 * A: leaveId      (唯一 ID)
 * B: userId
 * C: employeeName
 * D: leaveType    (annual/sick/personal/other)
 * E: startDate    (YYYY-MM-DD)
 * F: endDate      (YYYY-MM-DD)
 * G: days         (天數，半天為 0.5)
 * H: reason       (原因)
 * I: status       (pending/approved/rejected)
 * J: reviewedBy
 * K: reviewedAt
 * L: rejectReason
 * M: createdAt
 * N: startTime    (HH:MM, 空 = 全天)
 * O: endTime      (HH:MM, 空 = 全天)
 */

const SHEET_NAME = '請假紀錄';
const SHEET_RANGE = `${SHEET_NAME}!A:O`;

const LEAVE_TYPES = {
  annual:   '特休',
  sick:     '病假',
  personal: '事假',
  other:    '其他',
};

const ANNUAL_LEAVE_HOURS_PER_DAY = 8;

async function getAllLeaves() {
  try {
    const data = await getSheetData(SHEET_RANGE);
    if (!data || data.length <= 1) return [];
    return data.slice(1).map(rowToLeave).filter(Boolean);
  } catch (error) {
    console.error('取得請假紀錄失敗:', error);
    return [];
  }
}

async function getLeavesByUserId(userId) {
  const all = await getAllLeaves();
  return all.filter(l => l.userId === userId);
}

async function getPendingLeaves() {
  const all = await getAllLeaves();
  return all.filter(l => l.status === 'pending');
}

async function getAnnualLeaveSummary(userId) {
  const employee = await getEmployeeByUserId(userId);
  if (!employee) return calculateAnnualLeaveSummary({}, []);
  const leaves = await getLeavesByUserId(userId);
  return calculateAnnualLeaveSummary(employee, leaves);
}

/**
 * 申請請假
 * startTime / endTime: 'HH:MM' or '' (全天)
 */
async function applyLeave({ userId, employeeName, leaveType, startDate, endDate, reason, startTime, endTime }) {
  try {
    const isPartialDay = !!(startTime && endTime && startDate === endDate);
    let days;
    if (isPartialDay) {
      // 計算部分天數
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      // 以 30 分鐘為單位取整，最小 0.5h，存為 8h 工作日的分數
      const roundedMins = mins > 0 ? Math.max(30, Math.round(mins / 30) * 30) : 0;
      days = roundedMins / 480;
    } else {
      days = calcDays(startDate, endDate);
    }
    if (days <= 0) return { success: false, error: '結束時間必須晚於開始時間' };

    const existing = await getLeavesByUserId(userId);
    if (leaveType === 'annual') {
      const employee = await getEmployeeByUserId(userId);
      const annualLeaveSummary = calculateAnnualLeaveSummary(employee, existing);
      if (days > annualLeaveSummary.availableDays) {
        return { success: false, error: `特休餘額不足（可申請 ${formatAnnualLeaveDaysHours(annualLeaveSummary.availableDays)}）` };
      }
    }

    const conflict = existing.find(l =>
      l.status !== 'rejected' && datesOverlap(l.startDate, l.endDate, startDate, endDate)
    );
    if (conflict) return { success: false, error: `與既有請假（${conflict.startDate}~${conflict.endDate}）重疊` };

    const leaveId = `${startDate.replace(/-/g, '')}-${userId.slice(-6)}-${Date.now()}`;
    const now = new Date().toISOString();

    const row = [
      leaveId, userId, employeeName, leaveType,
      startDate, endDate, days, reason || '',
      'pending', '', '', '', now,
      startTime || '', endTime || '',
    ];

    await appendToSheet(row, SHEET_RANGE);
    return { success: true, leaveId, days };
  } catch (error) {
    console.error('申請請假失敗:', error);
    return { success: false, error: error.message };
  }
}

async function reviewLeave({ leaveId, action, reviewerUserId, rejectReason }) {
  try {
    const data = await getSheetData(SHEET_RANGE);
    if (!data || data.length <= 1) return { success: false, error: '找不到請假紀錄' };

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === leaveId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) return { success: false, error: '找不到此請假申請' };

    const leave = rowToLeave(data[rowIndex - 1]);
    if (leave.status !== 'pending') {
      return { success: false, error: '此請假申請已審核' };
    }

    if (action === 'approve' && leave.leaveType === 'annual') {
      const employee = await getEmployeeByUserId(leave.userId);
      const annualLeaveSummary = calculateAnnualLeaveSummary(employee, getLeavesFromRows(data, leave.userId));
      const remaining = annualLeaveSummary.remainingDays;
      const leaveDays = Number(leave.days) || 0;
      if (leaveDays > remaining) {
        return { success: false, error: `特休餘額不足（剩餘 ${formatAnnualLeaveDaysHours(remaining)}）` };
      }
    }

    const now = new Date().toISOString();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await updateSheetData(`${SHEET_NAME}!I${rowIndex}:L${rowIndex}`, [
      newStatus, reviewerUserId, now, rejectReason || '',
    ]);

    if (newStatus === 'approved' && leave.leaveType === 'annual') {
      const employee = await getEmployeeByUserId(leave.userId);
      const annualLeaveSummary = calculateAnnualLeaveSummary(employee, getLeavesFromRows(data, leave.userId));
      const remaining = roundDays(Math.max(0, annualLeaveSummary.remainingDays - (Number(leave.days) || 0)));
      await updateEmployeeAnnualLeave(leave.userId, {
        annualLeaveStartDate: employee?.annualLeaveStartDate || '',
        annualLeaveGrantDays: employee?.annualLeaveGrantDays || 0,
        annualLeaveRemainingDays: remaining,
      });
    }
    return { success: true, status: newStatus };
  } catch (error) {
    console.error('審核請假失敗:', error);
    return { success: false, error: error.message };
  }
}

// ── helpers ──────────────────────────────────────────────

function rowToLeave(row) {
  if (!row || !row[0]) return null;
  return {
    leaveId:      row[0]  || '',
    userId:       row[1]  || '',
    employeeName: row[2]  || '',
    leaveType:    row[3]  || 'other',
    leaveTypeText: LEAVE_TYPES[row[3]] || row[3] || '其他',
    startDate:    row[4]  || '',
    endDate:      row[5]  || '',
    days:         Number(row[6]) || 1,
    reason:       row[7]  || '',
    status:       row[8]  || 'pending',
    reviewedBy:   row[9]  || '',
    reviewedAt:   row[10] || '',
    rejectReason: row[11] || '',
    createdAt:    row[12] || '',
    startTime:    row[13] || '',
    endTime:      row[14] || '',
  };
}

function getLeavesFromRows(rows, userId) {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(rowToLeave).filter(l => l && l.userId === userId);
}

function normalizeDateString(value) {
  const str = String(value || '').trim();
  if (!str) return '';
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return '';
}

function getTodayDateString() {
  const now = new Date();
  const taiwanNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const yyyy = taiwanNow.getFullYear();
  const mm = String(taiwanNow.getMonth() + 1).padStart(2, '0');
  const dd = String(taiwanNow.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addYearsToDateString(dateString, years) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

function getAnnualLeaveCycle(startDate, today = getTodayDateString()) {
  const normalizedStart = normalizeDateString(startDate);
  const normalizedToday = normalizeDateString(today);
  if (!normalizedStart || !normalizedToday) {
    return { cycleStartDate: '', cycleEndDate: '' };
  }

  const [, startMonth, startDay] = normalizedStart.split('-');
  const todayYear = parseInt(normalizedToday.slice(0, 4), 10);
  let cycleStartDate = `${todayYear}-${startMonth}-${startDay}`;
  if (cycleStartDate > normalizedToday) {
    cycleStartDate = `${todayYear - 1}-${startMonth}-${startDay}`;
  }
  if (cycleStartDate < normalizedStart) {
    cycleStartDate = normalizedStart;
  }

  return {
    cycleStartDate,
    cycleEndDate: addYearsToDateString(cycleStartDate, 1),
  };
}

function roundDays(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 1000) / 1000;
}

function daysToHours(days) {
  return Math.round(roundDays(days) * ANNUAL_LEAVE_HOURS_PER_DAY * 100) / 100;
}

function formatAnnualLeaveDaysHours(days) {
  const totalHours = daysToHours(days);
  const wholeDays = Math.floor(totalHours / ANNUAL_LEAVE_HOURS_PER_DAY);
  const hours = Math.round((totalHours - wholeDays * ANNUAL_LEAVE_HOURS_PER_DAY) * 100) / 100;
  if (wholeDays <= 0) return `${hours} 小時`;
  if (hours <= 0) return `${wholeDays} 天`;
  return `${wholeDays} 天 ${hours} 小時`;
}

function calculateAnnualLeaveSummary(employee = {}, leaves = [], today = getTodayDateString()) {
  const grantDays = roundDays(employee.annualLeaveGrantDays || 0);
  const { cycleStartDate, cycleEndDate } = getAnnualLeaveCycle(employee.annualLeaveStartDate, today);
  const annualLeaves = leaves.filter(leave => {
    if (!leave || leave.leaveType !== 'annual') return false;
    if (!cycleStartDate || !cycleEndDate) return true;
    const leaveDate = normalizeDateString(leave.startDate);
    return leaveDate >= cycleStartDate && leaveDate < cycleEndDate;
  });

  const usedDays = roundDays(annualLeaves
    .filter(leave => leave.status === 'approved')
    .reduce((sum, leave) => sum + (Number(leave.days) || 0), 0));
  const pendingDays = roundDays(annualLeaves
    .filter(leave => leave.status === 'pending')
    .reduce((sum, leave) => sum + (Number(leave.days) || 0), 0));
  const remainingDays = roundDays(Math.max(0, grantDays - usedDays));
  const availableDays = roundDays(Math.max(0, remainingDays - pendingDays));

  return {
    grantDays,
    usedDays,
    pendingDays,
    remainingDays,
    availableDays,
    grantHours: daysToHours(grantDays),
    usedHours: daysToHours(usedDays),
    pendingHours: daysToHours(pendingDays),
    remainingHours: daysToHours(remainingDays),
    availableHours: daysToHours(availableDays),
    cycleStartDate,
    cycleEndDate,
  };
}

function calcDays(startDate, endDate) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function datesOverlap(s1, e1, s2, e2) {
  return s1 <= e2 && e1 >= s2;
}

module.exports = {
  getAllLeaves,
  getLeavesByUserId,
  getPendingLeaves,
  getAnnualLeaveSummary,
  applyLeave,
  reviewLeave,
  calculateAnnualLeaveSummary,
  formatAnnualLeaveDaysHours,
  LEAVE_TYPES,
};
