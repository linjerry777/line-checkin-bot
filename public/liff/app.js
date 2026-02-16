// Global state
let liffConfig = null;
let userProfile = null;
let employeeData = null;
let allRecords = [];
let currentDate = new Date();

// Initialize LIFF
async function initLiff() {
  try {
    // Get LIFF config
    const configRes = await fetch('/api/liff-config');
    liffConfig = await configRes.json();

    // Initialize LIFF
    await liff.init({ liffId: liffConfig.liffId });

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    // Get user profile
    userProfile = await liff.getProfile();

    // Load employee data
    await loadEmployeeData();

    // Update UI
    updateUserInfo();

    // Load records
    await loadRecords();

    // Check location
    checkLocation();

  } catch (error) {
    console.error('LIFF 初始化失敗:', error);
    showToast('系統初始化失敗，請重新整理頁面', 'error');
  }
}

// Load employee data
async function loadEmployeeData() {
  try {
    const res = await fetch(`/api/employee/${userProfile.userId}`);
    if (res.ok) {
      employeeData = await res.json();
    }
  } catch (error) {
    console.error('載入員工資料失敗:', error);
  }
}

// Load records
async function loadRecords() {
  try {
    const res = await fetch(`/api/records/${userProfile.userId}`);
    if (res.ok) {
      const data = await res.json();
      allRecords = data.records || [];
      updateAllStats();
      updateTodayRecords();
      updateAllRecords();
      updateCalendar();
    }
  } catch (error) {
    console.error('載入打卡紀錄失敗:', error);
  }
}

// Update user info
function updateUserInfo() {
  document.getElementById('userName').textContent = employeeData?.name || userProfile.displayName;
  document.getElementById('userAvatar').src = userProfile.pictureUrl || 'https://via.placeholder.com/60';
  document.getElementById('userStatus').textContent = employeeData ? '員工' : '訪客';
}

// Update all statistics
function updateAllStats() {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  // Today status
  const todayRecords = allRecords.filter(r => r.date === today);
  const hasCheckIn = todayRecords.some(r => r.type === 'in');
  const hasCheckOut = todayRecords.some(r => r.type === 'out');
  let todayStatus = '--';
  if (hasCheckIn && hasCheckOut) todayStatus = '✓';
  else if (hasCheckIn) todayStatus = '½';
  else todayStatus = '✗';

  const todayStatusEl = document.getElementById('todayStatus');
  if (todayStatusEl) todayStatusEl.textContent = todayStatus;

  // This month stats
  const monthRecords = allRecords.filter(r => r.date.startsWith(thisMonth));
  const workDays = new Set(monthRecords.map(r => r.date)).size;

  const workDaysEl = document.getElementById('workDays');
  if (workDaysEl) workDaysEl.textContent = workDays;

  // Calculate total hours
  const totalHours = calculateMonthHours(monthRecords);

  const monthHoursEl = document.getElementById('monthHours');
  if (monthHoursEl) monthHoursEl.textContent = totalHours + 'h';

  // Update stats tab
  updateStatsTab(monthRecords, totalHours, workDays);
}

// Calculate month hours
function calculateMonthHours(records) {
  const dailyHours = {};

  records.forEach(record => {
    if (!dailyHours[record.date]) {
      dailyHours[record.date] = { in: null, out: null };
    }

    if (record.type === 'in') {
      dailyHours[record.date].in = record.time;
    } else if (record.type === 'out') {
      dailyHours[record.date].out = record.time;
    }
  });

  let totalMinutes = 0;

  Object.values(dailyHours).forEach(day => {
    if (day.in && day.out) {
      const inTime = parseTime(day.in);
      const outTime = parseTime(day.out);
      const minutes = (outTime - inTime) / 1000 / 60;
      if (minutes > 0 && minutes < 24 * 60) {
        totalMinutes += minutes;
      }
    }
  });

  const hours = Math.floor(totalMinutes / 60);
  return hours;
}

// Parse time string to Date
function parseTime(timeStr) {
  const today = new Date().toISOString().split('T')[0];
  return new Date(`${today}T${timeStr}`);
}

// Update today records
function updateTodayRecords() {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = allRecords.filter(r => r.date === today);

  const container = document.getElementById('todayRecords');

  if (todayRecords.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>今日尚無打卡紀錄</p></div>';
    return;
  }

  container.innerHTML = todayRecords.map(record => `
    <div class="record-item">
      <div class="record-info">
        <div class="record-date">${formatDate(record.date)}</div>
        <div class="record-time">${record.time}</div>
      </div>
      <div class="record-badge ${record.type}">
        ${record.type === 'in' ? '上班' : '下班'}
      </div>
    </div>
  `).join('');
}

// Update all records
function updateAllRecords() {
  const container = document.getElementById('allRecordsList');

  if (allRecords.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>尚無打卡紀錄</p></div>';
    return;
  }

  const sortedRecords = [...allRecords].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.time.localeCompare(a.time);
  });

  container.innerHTML = sortedRecords.slice(0, 30).map(record => `
    <div class="record-item">
      <div class="record-info">
        <div class="record-date">${formatDate(record.date)}</div>
        <div class="record-time">${record.time}</div>
      </div>
      <div class="record-badge ${record.type}">
        ${record.type === 'in' ? '上班' : '下班'}
      </div>
    </div>
  `).join('');
}

// Update stats tab
function updateStatsTab(monthRecords, totalHours, workDays) {
  document.getElementById('totalHoursValue').textContent = totalHours;

  const avgHours = workDays > 0 ? (totalHours / workDays).toFixed(1) : 0;
  document.getElementById('avgHoursValue').textContent = avgHours;

  // Attendance stats
  const checkinCount = monthRecords.filter(r => r.type === 'in').length;
  const checkoutCount = monthRecords.filter(r => r.type === 'out').length;

  const statsContainer = document.getElementById('attendanceStats');
  statsContainer.innerHTML = `
    <div class="record-item">
      <div class="record-info">
        <div class="record-date">出勤天數</div>
        <div class="record-time">${workDays} 天</div>
      </div>
    </div>
    <div class="record-item">
      <div class="record-info">
        <div class="record-date">上班打卡次數</div>
        <div class="record-time">${checkinCount} 次</div>
      </div>
    </div>
    <div class="record-item">
      <div class="record-info">
        <div class="record-date">下班打卡次數</div>
        <div class="record-time">${checkoutCount} 次</div>
      </div>
    </div>
  `;
}

// Update calendar
function updateCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  document.getElementById('calendarMonth').textContent = `${year}年${month + 1}月`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const calendarGrid = document.getElementById('calendarGrid');

  // Previous month days (no headers, already in HTML)
  let html = '';

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    html += `<div class="calendar-day other-month">${day}</div>`;
  }

  // Current month days
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
    const hasRecord = allRecords.some(r => r.date === dateStr);
    const isToday = dateStr === todayStr;

    const classes = ['calendar-day'];
    if (isToday) classes.push('today');
    if (hasRecord) classes.push('has-checkin');

    html += `<div class="${classes.join(' ')}" onclick="selectDate('${dateStr}')">${day}</div>`;
  }

  // Next month days
  const remainingDays = 42 - (startDay + daysInMonth);
  for (let day = 1; day <= remainingDays; day++) {
    html += `<div class="calendar-day other-month">${day}</div>`;
  }

  calendarGrid.innerHTML = html;
}

// Change month
function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  updateCalendar();
}

// Select date
function selectDate(dateStr) {
  const dayRecords = allRecords.filter(r => r.date === dateStr);

  const container = document.getElementById('selectedDayRecords');
  const dateDisplay = document.getElementById('selectedDate');
  const listContainer = document.getElementById('dayRecordsList');

  dateDisplay.textContent = formatDate(dateStr);

  if (dayRecords.length === 0) {
    listContainer.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>當日無打卡紀錄</p></div>';
  } else {
    listContainer.innerHTML = dayRecords.map(record => `
      <div class="record-item">
        <div class="record-info">
          <div class="record-time">${record.time}</div>
        </div>
        <div class="record-badge ${record.type}">
          ${record.type === 'in' ? '上班' : '下班'}
        </div>
      </div>
    `).join('');
  }

  container.style.display = 'block';
}

// Check location
async function checkLocation() {
  const statusEl = document.getElementById('locationStatus');
  const checkinBtn = document.getElementById('checkinBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');

  // 如果未啟用位置檢查，直接允許打卡
  if (!liffConfig.storeLocation.enableLocationCheck) {
    statusEl.className = 'location-status success';
    statusEl.innerHTML = '<i class="fas fa-info-circle"></i> 位置驗證已停用，可直接打卡';
    checkinBtn.disabled = false;
    checkoutBtn.disabled = false;
    return;
  }

  try {
    const position = await getCurrentPosition();
    const distance = calculateDistance(
      position.coords.latitude,
      position.coords.longitude,
      liffConfig.storeLocation.lat,
      liffConfig.storeLocation.lng
    );

    const isNearby = distance <= liffConfig.storeLocation.radius;

    if (isNearby) {
      statusEl.className = 'location-status success';
      statusEl.innerHTML = '<i class="fas fa-check-circle"></i> 位置驗證成功，可以打卡';
      checkinBtn.disabled = false;
      checkoutBtn.disabled = false;
    } else {
      statusEl.className = 'location-status error';
      statusEl.innerHTML = `<i class="fas fa-times-circle"></i> 您不在店家附近（距離 ${Math.round(distance)}m）`;
      checkinBtn.disabled = true;
      checkoutBtn.disabled = true;
    }
  } catch (error) {
    statusEl.className = 'location-status error';
    statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> 無法取得位置，請檢查權限設定';
    checkinBtn.disabled = true;
    checkoutBtn.disabled = true;
  }
}

// Get current position
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('瀏覽器不支援定位功能'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
}

// Calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Handle checkin
async function handleCheckin() {
  await performCheckin('in');
}

// Handle checkout
async function handleCheckout() {
  await performCheckin('out');
}

// Perform checkin
async function performCheckin(type) {
  try {
    const position = await getCurrentPosition();

    const response = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userProfile.userId,
        employeeName: employeeData?.name || userProfile.displayName,
        type: type,
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
      })
    });

    const result = await response.json();

    if (result.success) {
      showToast(`${type === 'in' ? '上班' : '下班'}打卡成功！`, 'success');
      await loadRecords();
    } else {
      showToast(result.error || '打卡失敗', 'error');
    }
  } catch (error) {
    console.error('打卡失敗:', error);
    showToast('打卡失敗，請稍後再試', 'error');
  }
}

// Switch tab
function switchTab(tabName) {
  // Update tab buttons
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.closest('.tab-btn').classList.add('active');

  // Update tab content
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => content.classList.remove('active'));
  document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Show toast
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[date.getDay()];

  return `${year}/${month}/${day} (${weekday})`;
}

// Initialize on load
window.addEventListener('load', initLiff);
