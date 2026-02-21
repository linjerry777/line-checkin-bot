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
    await liff.init({
      liffId: liffConfig.liffId,
      withLoginOnExternalBrowser: true,
    });

    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
      return;
    }

    // Get user profile - force re-login if token expired
    try {
      userProfile = await liff.getProfile();
    } catch (e) {
      console.error('[getProfile] 失敗:', e.message);
      // Token 過期 → 強制登出再重新登入
      if (e.message && (e.message.includes('expired') || e.message.includes('token') || e.message.includes('401'))) {
        liff.logout();
        setTimeout(() => liff.login({ redirectUri: window.location.href }), 300);
        return;
      }
      // 其他錯誤 fallback 到 idToken
      const idToken = liff.getDecodedIDToken();
      if (idToken && idToken.sub) {
        userProfile = {
          userId: idToken.sub,
          displayName: idToken.name || idToken.sub,
          pictureUrl: idToken.picture || '',
        };
      } else {
        // 全部失敗 → 強制重新登入
        liff.logout();
        setTimeout(() => liff.login({ redirectUri: window.location.href }), 300);
        return;
      }
    }

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
  const userNameEl = document.getElementById('userName');
  if (userNameEl) {
    const name = employeeData?.name || userProfile.displayName;
    userNameEl.textContent = name;
    userNameEl.style.display = 'block';
  }
}

// Update all statistics
function updateAllStats() {
  const today = getTodayLocal();
  const thisMonth = getThisMonthLocal();

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

// Parse time string to Date (use local date to avoid UTC offset issues)
function parseTime(timeStr) {
  const today = getTodayLocal();
  return new Date(`${today}T${timeStr}`);
}

// Update today records
function updateTodayRecords() {
  const today = getTodayLocal();
  const todayRecords = allRecords.filter(r => r.date === today);

  const container = document.getElementById('todayRecords');
  if (!container) return;

  if (todayRecords.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p class="empty-state-text">今日尚無打卡紀錄</p></div>';
    return;
  }

  container.innerHTML = todayRecords.map(record => `
    <div class="record-item">
      <div class="record-icon ${record.type}">
        <i class="fas fa-${record.type === 'in' ? 'sign-in-alt' : 'sign-out-alt'}"></i>
      </div>
      <div class="record-details">
        <div class="record-type">${record.type === 'in' ? '上班打卡' : '下班打卡'}</div>
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
  if (!container) return;

  if (allRecords.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p class="empty-state-text">尚無打卡紀錄</p></div>';
    return;
  }

  const sortedRecords = [...allRecords].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.time.localeCompare(a.time);
  });

  container.innerHTML = sortedRecords.slice(0, 30).map(record => `
    <div class="record-item">
      <div class="record-icon ${record.type}">
        <i class="fas fa-${record.type === 'in' ? 'sign-in-alt' : 'sign-out-alt'}"></i>
      </div>
      <div class="record-details">
        <div class="record-type">${formatDate(record.date)}</div>
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
  const totalHoursEl = document.getElementById('totalHours');
  if (totalHoursEl) totalHoursEl.textContent = totalHours + 'h';

  const avgHours = workDays > 0 ? (totalHours / workDays).toFixed(1) : 0;
  const avgHoursEl = document.getElementById('avgHours');
  if (avgHoursEl) avgHoursEl.textContent = avgHours + 'h';

  // Attendance stats
  const checkinCount = monthRecords.filter(r => r.type === 'in').length;
  const checkoutCount = monthRecords.filter(r => r.type === 'out').length;

  const statsContainer = document.getElementById('dailyStatsList');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="record-row">
        <span class="record-row-label">出勤天數</span>
        <span class="record-row-value">${workDays} 天</span>
      </div>
      <div class="record-row">
        <span class="record-row-label">上班打卡次數</span>
        <span class="record-row-value">${checkinCount} 次</span>
      </div>
      <div class="record-row">
        <span class="record-row-label">下班打卡次數</span>
        <span class="record-row-value">${checkoutCount} 次</span>
      </div>
    `;
  }
}

// Update calendar
function updateCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarMonthEl = document.getElementById('calendarMonth');
  if (calendarMonthEl) {
    calendarMonthEl.textContent = `${year}年${month + 1}月`;
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const calendarGrid = document.getElementById('calendarGrid');
  if (!calendarGrid) return;

  // Previous month days (no headers, already in HTML)
  let html = '';

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    html += `<div class="calendar-day other-month">${day}</div>`;
  }

  // Current month days
  const todayStr = getTodayLocal();
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

  if (!container || !dateDisplay || !listContainer) return;

  dateDisplay.textContent = formatDate(dateStr);

  if (dayRecords.length === 0) {
    listContainer.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p class="empty-state-text">當日無打卡紀錄</p></div>';
  } else {
    listContainer.innerHTML = dayRecords.map(record => `
      <div class="record-item">
        <div class="record-icon ${record.type}">
          <i class="fas fa-${record.type === 'in' ? 'sign-in-alt' : 'sign-out-alt'}"></i>
        </div>
        <div class="record-details">
          <div class="record-type">${record.type === 'in' ? '上班打卡' : '下班打卡'}</div>
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

// Switch tab  (btnEl is passed as `this` from onclick)
function switchTab(tabName, btnEl) {
  // Update tab buttons
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  const activeBtn = btnEl ? btnEl.closest('.tab-btn') : null;
  if (activeBtn) activeBtn.classList.add('active');

  // Update tab content
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => content.classList.remove('active'));
  const targetTab = document.getElementById(`${tabName}Tab`);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  // Tab-specific data loading
  if (tabName === 'leave') {
    initLeaveForm();
    if (userProfile) loadMyLeaves();
  }
}

// Show toast
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = 'toast'; // reset classes
  if (type === 'success') toast.classList.add('success');
  if (type === 'error') toast.classList.add('error');
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

// Get today's date string in LOCAL timezone (YYYY-MM-DD)
// Using toISOString() gives UTC date which is wrong in Taiwan (UTC+8) after midnight
function getTodayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get current month string in LOCAL timezone (YYYY-MM)
function getThisMonthLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ── Leave System ────────────────────────────────────────

const LEAVE_TYPE_TEXT = {
  annual:   '特休',
  sick:     '病假',
  personal: '事假',
  other:    '其他',
};

// Initialize leave form dates (default: today ~ today)
function initLeaveForm() {
  const today = getTodayLocal();
  const startEl = document.getElementById('leaveStartDate');
  const endEl   = document.getElementById('leaveEndDate');
  if (startEl && !startEl.value) startEl.value = today;
  if (endEl   && !endEl.value)   endEl.value   = today;
}

// Load and render employee's leave records
async function loadMyLeaves() {
  const container = document.getElementById('myLeavesList');
  if (!container) return;

  try {
    const res = await fetch(`/api/admin?action=leave-my&userId=${userProfile.userId}`);
    const data = await res.json();

    if (!data.success || data.leaves.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p class="empty-state-text">尚無請假紀錄</p></div>';
      return;
    }

    // Sort by createdAt desc
    const sorted = [...data.leaves].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    container.innerHTML = sorted.map(leave => {
      const typeText   = LEAVE_TYPE_TEXT[leave.leaveType] || leave.leaveType;
      const statusMap  = { pending: '審核中', approved: '已批准', rejected: '已拒絕' };
      const statusText = statusMap[leave.status] || leave.status;
      const datesText  = leave.startDate === leave.endDate
        ? leave.startDate
        : `${leave.startDate} ~ ${leave.endDate}`;

      return `
        <div class="leave-item">
          <div class="leave-item-header">
            <div class="leave-item-type">
              <i class="fas fa-umbrella-beach"></i>
              <span class="leave-type-chip">${typeText}</span>
              ${leave.days} 天
            </div>
            <span class="leave-status ${leave.status}">${statusText}</span>
          </div>
          <div class="leave-item-dates"><i class="fas fa-calendar" style="color:var(--primary);margin-right:4px;"></i>${datesText}</div>
          ${leave.reason ? `<div class="leave-item-reason">${leave.reason}</div>` : ''}
          ${leave.status === 'rejected' && leave.rejectReason
            ? `<div class="leave-item-reject"><i class="fas fa-circle-xmark"></i>${leave.rejectReason}</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('載入請假紀錄失敗:', error);
    container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p class="empty-state-text">載入失敗，請重試</p></div>';
  }
}

// Submit leave application
async function submitLeave() {
  const btn       = document.getElementById('leaveSubmitBtn');
  const leaveType = document.getElementById('leaveType')?.value;
  const startDate = document.getElementById('leaveStartDate')?.value;
  const endDate   = document.getElementById('leaveEndDate')?.value;
  const reason    = document.getElementById('leaveReason')?.value?.trim();

  if (!startDate || !endDate) {
    showToast('請選擇請假日期', 'error');
    return;
  }
  if (startDate > endDate) {
    showToast('結束日期不能早於開始日期', 'error');
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送出中…'; }

  try {
    const res = await fetch(`/api/admin?action=leave-apply&userId=${userProfile.userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userProfile.userId,
        employeeName: employeeData?.name || userProfile.displayName,
        leaveType,
        startDate,
        endDate,
        reason,
      }),
    });

    const result = await res.json();

    if (result.success) {
      showToast(`請假申請成功（${result.days} 天），等待審核`, 'success');
      // Reset form
      document.getElementById('leaveReason').value = '';
      // Reload list
      await loadMyLeaves();
    } else {
      showToast(result.error || '申請失敗', 'error');
    }
  } catch (error) {
    console.error('送出請假失敗:', error);
    showToast('送出失敗，請稍後再試', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> 送出申請'; }
  }
}

// Initialize on load
window.addEventListener('load', initLiff);
