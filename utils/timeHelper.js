/**
 * 取得當前時間（台灣時區）
 */
function getCurrentTime() {
  const now = new Date();
  // 轉換為台灣時區 (UTC+8)
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));

  const hours = String(taipeiTime.getHours()).padStart(2, '0');
  const minutes = String(taipeiTime.getMinutes()).padStart(2, '0');
  const seconds = String(taipeiTime.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * 取得今天日期（台灣時區）
 */
function getToday() {
  const now = new Date();
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));

  const year = taipeiTime.getFullYear();
  const month = String(taipeiTime.getMonth() + 1).padStart(2, '0');
  const day = String(taipeiTime.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 取得完整的日期時間字串
 */
function getFullDateTime() {
  return `${getToday()} ${getCurrentTime()}`;
}

module.exports = {
  getCurrentTime,
  getToday,
  getFullDateTime,
};
