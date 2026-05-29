const assert = require('assert');

const { selectGridPunches } = require('../public/liff/adminGridLogic');

function run() {
  const selectedWithManual = selectGridPunches([
    { type: 'in', time: '17:53', isManual: false },
    { type: 'in', time: '17:54', isManual: true },
    { type: 'in', time: '17:54', isManual: true },
    { type: 'out', time: '21:04', isManual: false },
    { type: 'out', time: '21:03', isManual: true },
    { type: 'out', time: '21:03', isManual: true },
  ]);

  assert.deepStrictEqual(selectedWithManual.inRecord, {
    type: 'in',
    time: '17:54',
    isManual: true,
  });
  assert.deepStrictEqual(selectedWithManual.outRecord, {
    type: 'out',
    time: '21:03',
    isManual: true,
  });

  const selectedWithoutManual = selectGridPunches([
    { type: 'in', time: '17:54', isManual: false },
    { type: 'in', time: '17:53', isManual: false },
    { type: 'in', time: '17:54', isManual: false },
    { type: 'out', time: '21:03', isManual: false },
    { type: 'out', time: '21:04', isManual: false },
    { type: 'out', time: '21:03', isManual: false },
  ]);

  assert.deepStrictEqual(selectedWithoutManual.inRecord, {
    type: 'in',
    time: '17:53',
    isManual: false,
  });
  assert.deepStrictEqual(selectedWithoutManual.outRecord, {
    type: 'out',
    time: '21:04',
    isManual: false,
  });
}

run();
console.log('adminGridPunchSelection tests passed');
