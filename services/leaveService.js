const { getSheetData, appendToSheet, updateSheetData } = require('../config/googleSheets');

/**
 * 請假服務 - 使用 Google Sheets「請假紀錄」工作表
 *
 * 欄位定義 (A~J):
 * A: leaveId      (唯一 ID, YYYYMMDD-userId-timestamp)
 * B: userId
 * C: employeeName
 * D: leaveType    (annual/sick/personal/other)
 * E: startDate    (YYYY-MM-DD)
 * F: endDate      (YYYY-MM-DD)
 * G: days         (天數)
 * H: reason       (原因)
 * I: status       (pending/approved/rejected)
 * J: reviewedBy   (審核者 userId)
 * K: reviewedAt   (審核時間 ISO)
 * L: rejectReason (拒絕原因)
 * M: createdAt    (申請時間 ISO)
 */

const SHEET_NAME = '請假紀錄';
const SHEET_RANGE = `${SHEET_NAME}!A:M`;

const LEAVE_TYPES = {
  annual:   '特休',
  sick:     '病假',
  personal: '事假',
  other:    '其他',
};

/**
 * 取得所有請假紀錄
 */
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

/**
 * 取得指定員工的請假紀錄
 */
async function getLeavesByUserId(userId) {
  const all = await getAllLeaves();
  return all.filter(l => l.userId === userId);
}

/**
 * 取得待審核的請假紀錄
 */
async function getPendingLeaves() {
  const all = await getAllLeaves();
  return all.filter(l => l.status === 'pending');
}

/**
 * 申請請假
 */
async function applyLeave({ userId, employeeName, leaveType, startDate, endDate, reason }) {
  try {
    // 計算天數
    const days = calcDays(startDate, endDate);
    if (days <= 0) {
      return { success: false, error: '結束日期必須大於或等於開始日期' };
    }

    // 檢查同期間是否已有申請
    const existing = await getLeavesByUserId(userId);
    const conflict = existing.find(l =>
      l.status !== 'rejected' &&
      datesOverlap(l.startDate, l.endDate, startDate, endDate)
    );
    if (conflict) {
      return { success: false, error: `與既有請假（${conflict.startDate}~${conflict.endDate}）重疊` };
    }

    const leaveId = `${startDate.replace(/-/g, '')}-${userId.slice(-6)}-${Date.now()}`;
    const now = new Date().toISOString();

    const row = [
      leaveId,
      userId,
      employeeName,
      leaveType,
      startDate,
      endDate,
      days,
      reason || '',
      'pending',
      '',   // reviewedBy
      '',   // reviewedAt
      '',   // rejectReason
      now,  // createdAt
    ];

    await appendToSheet(row, SHEET_RANGE);
    console.log(`✅ 請假申請: ${employeeName} ${startDate}~${endDate}`);

    return { success: true, leaveId, days };
  } catch (error) {
    console.error('申請請假失敗:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 審核請假（approve / reject）
 */
async function reviewLeave({ leaveId, action, reviewerUserId, rejectReason }) {
  try {
    const data = await getSheetData(SHEET_RANGE);
    if (!data || data.length <= 1) {
      return { success: false, error: '找不到請假紀錄' };
    }

    // 找到該筆紀錄的行號（1-indexed, row 1 = headers）
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === leaveId) {
        rowIndex = i + 1; // Sheets 行號從 1 起算，且 row 1 是標題
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: '找不到此請假申請' };
    }

    const now = new Date().toISOString();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // 更新 I(status) J(reviewedBy) K(reviewedAt) L(rejectReason)
    await updateSheetData(`${SHEET_NAME}!I${rowIndex}:L${rowIndex}`, [
      newStatus,
      reviewerUserId,
      now,
      rejectReason || '',
    ]);

    console.log(`✅ 請假審核: ${leaveId} → ${newStatus}`);
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
  };
}

function calcDays(startDate, endDate) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  const diff  = (end - start) / (1000 * 60 * 60 * 24);
  return Math.floor(diff) + 1;
}

function datesOverlap(s1, e1, s2, e2) {
  return s1 <= e2 && e1 >= s2;
}

module.exports = {
  getAllLeaves,
  getLeavesByUserId,
  getPendingLeaves,
  applyLeave,
  reviewLeave,
  LEAVE_TYPES,
};
