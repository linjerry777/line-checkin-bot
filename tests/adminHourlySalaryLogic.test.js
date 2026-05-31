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
      toleranceMinutes: 10,
    }),
    150,
    'scheduled hourly staff should not count early/late work below a 30-minute overtime unit'
  );

  assert.strictEqual(
    getHourlyBillableMinutes({
      inMinutes: 18 * 60 + 32,
      outMinutes: 21 * 60 + 44,
      shiftStartMinutes: 18 * 60 + 30,
      shiftEndMinutes: 21 * 60,
      hasShift: true,
      toleranceMinutes: 10,
    }),
    180,
    'scheduled hourly staff should treat tolerated lateness as on time and count billable late stay'
  );

  assert.strictEqual(
    getHourlyBillableMinutes({
      inMinutes: 18 * 60 + 44,
      outMinutes: 20 * 60 + 46,
      shiftStartMinutes: 18 * 60 + 30,
      shiftEndMinutes: 21 * 60,
      hasShift: true,
      toleranceMinutes: 10,
    }),
    120,
    'scheduled hourly staff should only lose time after the lateness tolerance is exceeded'
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
