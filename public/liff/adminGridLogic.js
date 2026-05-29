(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LineCheckinAdminGridLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function parseMinutes(time) {
    if (!time) return null;
    const parts = String(time).split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10) || 0;
    if (!Number.isFinite(hours)) return null;
    return hours * 60 + minutes;
  }

  function pickRecord(records, type, direction) {
    const typed = records.filter(record => record && record.type === type && record.time);
    const manual = typed.filter(record => record.isManual);
    const candidates = manual.length > 0 ? manual : typed;
    if (candidates.length === 0) return null;

    return candidates.reduce((best, record) => {
      if (!best) return record;
      const bestMin = parseMinutes(best.time);
      const recordMin = parseMinutes(record.time);
      if (recordMin === null) return best;
      if (bestMin === null) return record;
      return direction === 'earliest'
        ? (recordMin < bestMin ? record : best)
        : (recordMin > bestMin ? record : best);
    }, null);
  }

  function selectGridPunches(records) {
    const dayRecords = Array.isArray(records) ? records : [];
    return {
      inRecord: pickRecord(dayRecords, 'in', 'earliest'),
      outRecord: pickRecord(dayRecords, 'out', 'latest'),
    };
  }

  return { selectGridPunches };
});
