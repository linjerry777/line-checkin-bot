const assert = require('assert');

const { getHourlyBillableMinutes } = require('../public/liff/adminSalaryLogic');

function run() {
  assert.strictEqual(
    getHourlyBillableMinutes({
      inMinutes: 18 * 60 + 17,
      outMinutes: 21 * 60 + 17,
      shiftStartMinutes: 18 * 60 + 30,
      shiftEndMinutes: 21 * 60,
      hasShift: true,
    }),
    150,
    'scheduled hourly staff should only be paid for time inside the shift'
  );

  assert.strictEqual(
    getHourlyBillableMinutes({
      inMinutes: 18 * 60 + 44,
      outMinutes: 20 * 60 + 46,
      shiftStartMinutes: 18 * 60 + 30,
      shiftEndMinutes: 21 * 60,
      hasShift: true,
    }),
    120,
    'scheduled hourly staff still floors paid shift-overlap time to 30-minute units'
  );

  assert.strictEqual(
    getHourlyBillableMinutes({
      inMinutes: 10 * 60 + 10,
      outMinutes: 12 * 60 + 45,
      hasShift: false,
    }),
    150,
    'non-scheduled hourly work should keep using actual worked time floored to 30-minute units'
  );
}

run();
console.log('adminHourlySalaryLogic tests passed');
