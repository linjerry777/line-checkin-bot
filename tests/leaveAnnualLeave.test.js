const assert = require('assert');

const googleSheetsPath = require.resolve('../config/googleSheets');
const employeeServicePath = require.resolve('../services/employeeService');

let leaveRows = [];
let employee = null;
let updatedAnnualLeave = null;
let appendedLeave = null;

require.cache[googleSheetsPath] = {
  exports: {
    getSheetData: async () => leaveRows,
    appendToSheet: async values => {
      appendedLeave = values;
    },
    updateSheetData: async () => {},
  },
};

require.cache[employeeServicePath] = {
  exports: {
    getEmployeeByUserId: async () => employee,
    updateEmployeeAnnualLeave: async (userId, settings) => {
      updatedAnnualLeave = { userId, settings };
      return { success: true };
    },
  },
};

const { applyLeave, reviewLeave, calculateAnnualLeaveSummary } = require('../services/leaveService');

async function run() {
  leaveRows = [['請假ID']];
  employee = { userId: 'u1', annualLeaveRemainingDays: 1 };
  appendedLeave = null;

  const insufficient = await applyLeave({
    userId: 'u1',
    employeeName: 'Alice',
    leaveType: 'annual',
    startDate: '2026-05-16',
    endDate: '2026-05-17',
    reason: '',
    startTime: '',
    endTime: '',
  });

  assert.strictEqual(insufficient.success, false);
  assert.match(insufficient.error, /特休/);
  assert.strictEqual(appendedLeave, null, 'insufficient annual leave should not append a row');

  leaveRows = [
    ['請假ID', '員工ID', '員工姓名', '假別', '開始日期', '結束日期', '天數', '原因', '狀態'],
    ['L1', 'u1', 'Alice', 'annual', '2026-05-16', '2026-05-16', '0.5', '', 'pending'],
  ];
  employee = {
    userId: 'u1',
    annualLeaveStartDate: '2026-01-01',
    annualLeaveGrantDays: 7,
    annualLeaveRemainingDays: 2,
  };
  updatedAnnualLeave = null;

  const approved = await reviewLeave({
    leaveId: 'L1',
    action: 'approve',
    reviewerUserId: 'admin',
    rejectReason: '',
  });

  assert.strictEqual(approved.success, true);
  assert.deepStrictEqual(updatedAnnualLeave, {
    userId: 'u1',
    settings: {
      annualLeaveStartDate: '2026-01-01',
      annualLeaveGrantDays: 7,
      annualLeaveRemainingDays: 6.5,
    },
  });

  const summary = calculateAnnualLeaveSummary(
    {
      annualLeaveStartDate: '2026-01-01',
      annualLeaveGrantDays: 7,
    },
    [
      { leaveType: 'annual', status: 'approved', startDate: '2026-05-16', endDate: '2026-05-16', days: 0.125 },
      { leaveType: 'annual', status: 'pending', startDate: '2026-05-17', endDate: '2026-05-17', days: 0.25 },
      { leaveType: 'annual', status: 'rejected', startDate: '2026-05-18', endDate: '2026-05-18', days: 1 },
      { leaveType: 'sick', status: 'approved', startDate: '2026-05-19', endDate: '2026-05-19', days: 1 },
    ],
    '2026-05-16'
  );

  assert.deepStrictEqual(summary, {
    grantDays: 7,
    usedDays: 0.125,
    pendingDays: 0.25,
    remainingDays: 6.875,
    availableDays: 6.625,
    grantHours: 56,
    usedHours: 1,
    pendingHours: 2,
    remainingHours: 55,
    availableHours: 53,
    cycleStartDate: '2026-01-01',
    cycleEndDate: '2027-01-01',
  });
}

run()
  .then(() => {
    console.log('leaveAnnualLeave tests passed');
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
