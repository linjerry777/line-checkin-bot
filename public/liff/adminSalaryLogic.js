(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LineCheckinAdminSalaryLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function floorToHalfHour(minutes) {
    const num = Number(minutes);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.floor(num / 30) * 30;
  }

  function getHourlyBillableMinutes({
    inMinutes,
    outMinutes,
    shiftStartMinutes,
    shiftEndMinutes,
    hasShift,
  }) {
    if (!Number.isFinite(inMinutes) || !Number.isFinite(outMinutes) || outMinutes <= inMinutes) {
      return 0;
    }

    if (hasShift && Number.isFinite(shiftStartMinutes) && Number.isFinite(shiftEndMinutes)) {
      const paidStart = Math.max(inMinutes, shiftStartMinutes);
      const paidEnd = Math.min(outMinutes, shiftEndMinutes);
      return floorToHalfHour(paidEnd - paidStart);
    }

    return floorToHalfHour(outMinutes - inMinutes);
  }

  return {
    floorToHalfHour,
    getHourlyBillableMinutes,
  };
});
