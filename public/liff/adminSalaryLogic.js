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
    toleranceMinutes = 0,
  }) {
    if (!Number.isFinite(inMinutes) || !Number.isFinite(outMinutes) || outMinutes <= inMinutes) {
      return 0;
    }

    if (hasShift && Number.isFinite(shiftStartMinutes) && Number.isFinite(shiftEndMinutes)) {
      const tolerance = Number.isFinite(Number(toleranceMinutes)) ? Number(toleranceMinutes) : 0;
      const paidStart = inMinutes <= shiftStartMinutes + tolerance ? shiftStartMinutes : inMinutes;
      const paidEnd = outMinutes >= shiftEndMinutes - tolerance ? shiftEndMinutes : outMinutes;
      const regularMinutes = floorToHalfHour(paidEnd - paidStart);

      const earlyArrival = inMinutes < shiftStartMinutes - tolerance ? shiftStartMinutes - inMinutes : 0;
      const lateStay = outMinutes > shiftEndMinutes + tolerance ? outMinutes - shiftEndMinutes : 0;
      const overtimeMinutes = floorToHalfHour(earlyArrival) + floorToHalfHour(lateStay);

      return regularMinutes + overtimeMinutes;
    }

    return floorToHalfHour(outMinutes - inMinutes);
  }

  return {
    floorToHalfHour,
    getHourlyBillableMinutes,
  };
});
