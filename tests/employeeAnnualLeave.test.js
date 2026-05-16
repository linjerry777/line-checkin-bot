const assert = require('assert');

const googleSheetsPath = require.resolve('../config/googleSheets');
let capturedUpdate = null;

require.cache[googleSheetsPath] = {
  exports: {
    getSheetData: async () => [
      ['userId', 'name'],
      ['u1', 'Alice'],
      ['u2', 'Bob'],
    ],
    appendToSheet: async () => {},
    updateSheetData: async (range, values) => {
      capturedUpdate = { range, values };
    },
  },
};

const {
  calculateNextAnnualLeaveGrantDate,
  normalizeAnnualLeaveSettings,
  updateEmployeeAnnualLeave,
} = require('../services/employeeService');

async function run() {
  assert.deepStrictEqual(
    normalizeAnnualLeaveSettings({}, '2026-05-16'),
    {
      annualLeaveStartDate: '',
      annualLeaveGrantDays: 0,
      annualLeaveRemainingDays: 0,
      annualLeaveNextGrantDate: '',
    },
    'unset annual leave settings should default to zero values'
  );

  assert.strictEqual(
    calculateNextAnnualLeaveGrantDate('2026-01-01', '2026-05-16'),
    '2027-01-01',
    'next grant should be the next yearly anniversary'
  );

  assert.deepStrictEqual(
    normalizeAnnualLeaveSettings({
      annualLeaveStartDate: '2026-01-01',
      annualLeaveGrantDays: '7',
      annualLeaveRemainingDays: '3.5',
    }, '2026-05-16'),
    {
      annualLeaveStartDate: '2026-01-01',
      annualLeaveGrantDays: 7,
      annualLeaveRemainingDays: 3.5,
      annualLeaveNextGrantDate: '2027-01-01',
    },
    'configured annual leave settings should preserve grant and remaining days'
  );

  const result = await updateEmployeeAnnualLeave('u2', {
    annualLeaveStartDate: '2026-01-01',
    annualLeaveGrantDays: 7,
    annualLeaveRemainingDays: 7,
  });

  assert.deepStrictEqual(result, { success: true });
  assert.deepStrictEqual(capturedUpdate, {
    range: '員工資料!K3:M3',
    values: ['2026-01-01', '7', '7'],
  });
}

run()
  .then(() => {
    console.log('employeeAnnualLeave tests passed');
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
