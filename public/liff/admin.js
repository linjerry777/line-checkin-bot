// Admin Panel JavaScript
let liffConfig = null;
let userProfile = null;
let allEmployees = [];
let allRecords = [];

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

    // Check if user is admin
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
      document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; padding: 20px; text-align: center;">
          <i class="fas fa-lock" style="font-size: 64px; color: #FF3B30; margin-bottom: 20px;"></i>
          <h2 style="margin-bottom: 10px;">權限不足</h2>
          <p style="color: #86868B; margin-bottom: 20px;">您沒有存取管理員後台的權限</p>
          <button onclick="liff.closeWindow()" style="padding: 12px 24px; background: #007AFF; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600;">關閉</button>
        </div>
      `;
      return;
    }

    // Update admin name
    document.getElementById('adminName').textContent = `管理員：${userProfile.displayName}`;

    // Load data
    await loadAllData();

    // Set default date for attendance tab
    document.getElementById('attendanceDate').valueAsDate = new Date();
    document.getElementById('exportMonth').value = new Date().toISOString().slice(0, 7);

  } catch (error) {
    console.error('LIFF 初始化失敗:', error);
    showToast('系統初始化失敗，請重新整理頁面', 'error');
  }
}

// Check admin status
async function checkAdminStatus() {
  try {
    const response = await fetch(`/api/admin/check?userId=${userProfile.userId}`);
    const data = await response.json();
    return data.isAdmin;
  } catch (error) {
    console.error('檢查管理員權限失敗:', error);
    return false;
  }
}

// Load all data
async function loadAllData() {
  try {
    // Load employees
    const empRes = await fetch('/api/admin/employees');
    const empData = await empRes.json();
    allEmployees = empData.employees || [];

    // Load all records
    const recRes = await fetch('/api/admin/records');
    const recData = await recRes.json();
    allRecords = recData.records || [];

    // Update UI
    updateOverview();
    updateEmployeeList();
    loadAttendance();

  } catch (error) {
    console.error('載入資料失敗:', error);
    showToast('載入資料失敗', 'error');
  }
}

// Update overview
function updateOverview() {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  // Total employees
  document.getElementById('totalEmployees').textContent = allEmployees.length;

  // Today present (employees who checked in today)
  const todayCheckins = allRecords.filter(r => r.date === today && r.type === 'in');
  const todayEmployeeIds = new Set(todayCheckins.map(r => r.userId));
  document.getElementById('todayPresent').textContent = todayEmployeeIds.size;

  // Month work days
  const monthRecords = allRecords.filter(r => r.date.startsWith(thisMonth));
  const monthDays = new Set(monthRecords.map(r => r.date));
  document.getElementById('monthWorkDays').textContent = monthDays.size;

  // Total hours this month
  const totalHours = calculateTotalHours(monthRecords);
  document.getElementById('totalHours').textContent = totalHours;

  // Today attendance details
  updateTodayAttendance();

  // Week stats
  updateWeekStats();
}

// Update today attendance
function updateTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];
  const container = document.getElementById('todayAttendance');

  const employeeStatus = allEmployees.map(emp => {
    const todayRecords = allRecords.filter(r => r.userId === emp.userId && r.date === today);
    const checkinRecord = todayRecords.find(r => r.type === 'in');
    const checkoutRecord = todayRecords.find(r => r.type === 'out');

    return {
      name: emp.name,
      status: checkinRecord ? (checkoutRecord ? 'off' : 'present') : 'absent',
      checkin: checkinRecord?.time,
      checkout: checkoutRecord?.time
    };
  });

  container.innerHTML = employeeStatus.map(emp => `
    <div class="employee-item">
      <div class="employee-avatar">${emp.name.charAt(0)}</div>
      <div class="employee-info">
        <div class="employee-name">${emp.name}</div>
        <div class="employee-stats">
          ${emp.checkin ? `上班: ${emp.checkin}` : '未打卡'}
          ${emp.checkout ? ` | 下班: ${emp.checkout}` : ''}
        </div>
      </div>
      <div class="status-badge ${emp.status}">
        ${emp.status === 'present' ? '在班' : emp.status === 'off' ? '已下班' : '未到'}
      </div>
    </div>
  `).join('');
}

// Update week stats
function updateWeekStats() {
  const container = document.getElementById('weekStats');
  const today = new Date();
  const weekDays = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    weekDays.push(date.toISOString().split('T')[0]);
  }

  const weekData = weekDays.map(date => {
    const dayRecords = allRecords.filter(r => r.date === date && r.type === 'in');
    const uniqueEmployees = new Set(dayRecords.map(r => r.userId));
    return {
      date: date,
      count: uniqueEmployees.size
    };
  });

  const maxCount = Math.max(...weekData.map(d => d.count), 1);

  container.innerHTML = `
    <div style="display: flex; justify-content: space-around; align-items: flex-end; height: 150px; padding: 10px 0;">
      ${weekData.map(day => {
        const height = (day.count / maxCount) * 100;
        const dayName = new Date(day.date).toLocaleDateString('zh-TW', { weekday: 'short' });
        return `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1;">
            <div style="font-size: 12px; font-weight: 600; color: var(--primary);">${day.count}</div>
            <div style="width: 100%; max-width: 40px; background: var(--primary); border-radius: 4px 4px 0 0; height: ${height}%;"></div>
            <div style="font-size: 11px; color: var(--text-secondary);">${dayName}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Update employee list
function updateEmployeeList() {
  const container = document.getElementById('employeeList');
  const count = document.getElementById('employeeCount');
  const today = new Date().toISOString().split('T')[0];

  count.textContent = `${allEmployees.length} 位員工`;

  if (allEmployees.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>尚無員工資料</p></div>';
    return;
  }

  container.innerHTML = allEmployees.map(emp => {
    const empRecords = allRecords.filter(r => r.userId === emp.userId);
    const todayRecords = empRecords.filter(r => r.date === today);
    const hasCheckedIn = todayRecords.some(r => r.type === 'in');
    const hasCheckedOut = todayRecords.some(r => r.type === 'out');

    const monthRecords = empRecords.filter(r => r.date.startsWith(new Date().toISOString().slice(0, 7)));
    const workDays = new Set(monthRecords.map(r => r.date)).size;

    let status = 'absent';
    if (hasCheckedIn && !hasCheckedOut) status = 'present';
    if (hasCheckedIn && hasCheckedOut) status = 'off';

    return `
      <div class="employee-item">
        <div class="employee-avatar">${emp.name.charAt(0)}</div>
        <div class="employee-info">
          <div class="employee-name">${emp.name}</div>
          <div class="employee-stats">本月出勤 ${workDays} 天</div>
        </div>
        <div class="status-badge ${status}">
          ${status === 'present' ? '在班' : status === 'off' ? '已下班' : '未到'}
        </div>
      </div>
    `;
  }).join('');
}

// Load attendance for selected date
function loadAttendance() {
  const dateInput = document.getElementById('attendanceDate');
  const selectedDate = dateInput.value;
  const container = document.getElementById('attendanceList');
  const title = document.getElementById('attendanceTitle');

  title.textContent = `${selectedDate} 出勤紀錄`;

  const dayRecords = allRecords.filter(r => r.date === selectedDate);

  if (dayRecords.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>當日無打卡紀錄</p></div>';
    return;
  }

  // Group by employee
  const employeeRecords = {};
  dayRecords.forEach(record => {
    if (!employeeRecords[record.userId]) {
      const emp = allEmployees.find(e => e.userId === record.userId);
      employeeRecords[record.userId] = {
        name: emp?.name || record.employeeName,
        checkin: null,
        checkout: null
      };
    }
    if (record.type === 'in') {
      employeeRecords[record.userId].checkin = record.time;
    } else {
      employeeRecords[record.userId].checkout = record.time;
    }
  });

  container.innerHTML = `
    <table class="attendance-table">
      <thead>
        <tr>
          <th>員工</th>
          <th>上班</th>
          <th>下班</th>
          <th>工時</th>
        </tr>
      </thead>
      <tbody>
        ${Object.values(employeeRecords).map(emp => {
          let hours = '-';
          if (emp.checkin && emp.checkout) {
            const checkinTime = new Date(`${selectedDate}T${emp.checkin}`);
            const checkoutTime = new Date(`${selectedDate}T${emp.checkout}`);
            const diff = (checkoutTime - checkinTime) / 1000 / 60 / 60;
            hours = diff.toFixed(1) + 'h';
          }

          return `
            <tr>
              <td>${emp.name}</td>
              <td class="time-cell">${emp.checkin || '-'}</td>
              <td class="time-cell">${emp.checkout || '-'}</td>
              <td>${hours}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// Calculate total hours
function calculateTotalHours(records) {
  const dailyHours = {};

  records.forEach(record => {
    const key = `${record.userId}-${record.date}`;
    if (!dailyHours[key]) {
      dailyHours[key] = { in: null, out: null };
    }
    if (record.type === 'in') {
      dailyHours[key].in = record.time;
    } else {
      dailyHours[key].out = record.time;
    }
  });

  let totalMinutes = 0;
  Object.values(dailyHours).forEach(day => {
    if (day.in && day.out) {
      const inTime = new Date(`2000-01-01T${day.in}`);
      const outTime = new Date(`2000-01-01T${day.out}`);
      const minutes = (outTime - inTime) / 1000 / 60;
      if (minutes > 0 && minutes < 24 * 60) {
        totalMinutes += minutes;
      }
    }
  });

  return Math.floor(totalMinutes / 60);
}

// Export month data
function exportMonthData() {
  const month = document.getElementById('exportMonth').value;
  if (!month) {
    showToast('請選擇月份', 'error');
    return;
  }

  const monthRecords = allRecords.filter(r => r.date.startsWith(month));

  // Group by employee and date
  const exportData = {};
  allEmployees.forEach(emp => {
    exportData[emp.userId] = {
      name: emp.name,
      days: {}
    };
  });

  monthRecords.forEach(record => {
    if (!exportData[record.userId]) return;

    if (!exportData[record.userId].days[record.date]) {
      exportData[record.userId].days[record.date] = { in: null, out: null };
    }

    if (record.type === 'in') {
      exportData[record.userId].days[record.date].in = record.time;
    } else {
      exportData[record.userId].days[record.date].out = record.time;
    }
  });

  // Generate CSV
  let csv = '員工,日期,上班時間,下班時間,工時\n';

  Object.values(exportData).forEach(emp => {
    Object.entries(emp.days).forEach(([date, times]) => {
      let hours = '';
      if (times.in && times.out) {
        const inTime = new Date(`${date}T${times.in}`);
        const outTime = new Date(`${date}T${times.out}`);
        const diff = (outTime - inTime) / 1000 / 60 / 60;
        hours = diff.toFixed(1);
      }

      csv += `${emp.name},${date},${times.in || ''},${times.out || ''},${hours}\n`;
    });
  });

  // Show preview
  document.getElementById('exportPreview').style.display = 'block';
  document.getElementById('exportContent').textContent = csv;

  // Download CSV
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `出勤記錄_${month}.csv`;
  link.click();

  showToast('CSV 檔案已下載', 'success');
}

// Copy to clipboard
function copyToClipboard() {
  const content = document.getElementById('exportContent').textContent;
  if (!content) {
    showToast('請先匯出資料', 'error');
    return;
  }

  navigator.clipboard.writeText(content).then(() => {
    showToast('已複製到剪貼簿', 'success');
  }).catch(() => {
    showToast('複製失敗', 'error');
  });
}

// Switch tab
function switchTab(tabName) {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.closest('.tab-btn').classList.add('active');

  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => content.classList.remove('active'));
  document.getElementById(`${tabName}Tab`).classList.add('active');

  // Load data for specific tabs
  if (tabName === 'attendance') {
    loadAttendance();
  }
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

// Initialize on load
window.addEventListener('load', initLiff);
