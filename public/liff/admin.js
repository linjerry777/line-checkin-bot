// Admin Panel JavaScript
let liffConfig = null;
let userProfile = null;
let allEmployees = [];
let allRecords = [];

// Get today's date string in LOCAL timezone (avoids UTC midnight shift bug in Taiwan UTC+8)
function getTodayLocalAdmin() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function getThisMonthLocalAdmin() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

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

    // Set default date for attendance tab (use local date string to avoid UTC offset bug)
    const todayLocal = getTodayLocalAdmin();
    const attendanceDateEl = document.getElementById('attendanceDate');
    if (attendanceDateEl) attendanceDateEl.value = todayLocal;
    const exportMonthEl = document.getElementById('exportMonth');
    if (exportMonthEl) exportMonthEl.value = todayLocal.slice(0, 7);

  } catch (error) {
    console.error('LIFF 初始化失敗:', error);
    showToast('系統初始化失敗，請重新整理頁面', 'error');
  }
}

// Check admin status
async function checkAdminStatus() {
  try {
    const response = await fetch(`/api/admin?action=check&userId=${userProfile.userId}`);
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
    const empRes = await fetch(`/api/admin?action=employees&userId=${userProfile.userId}`);
    const empData = await empRes.json();
    allEmployees = empData.employees || [];

    // Load all records
    const recRes = await fetch(`/api/admin?action=records&userId=${userProfile.userId}`);
    const recData = await recRes.json();
    allRecords = recData.records || [];

    // Update UI
    updateOverview();
    updateEmployeeList();
    loadAttendance();

    // Pre-load leave pending count for badge
    loadPendingLeaveBadge();

  } catch (error) {
    console.error('載入資料失敗:', error);
    showToast('載入資料失敗', 'error');
  }
}

// Only load pending count for tab badge (lightweight)
async function loadPendingLeaveBadge() {
  try {
    const res = await fetch(`/api/admin?action=leave-pending&userId=${userProfile.userId}`);
    const data = await res.json();
    if (!data.success) return;
    const count = (data.leaves || []).length;
    const badge = document.getElementById('pendingLeaveCount');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  } catch (_) { /* silent */ }
}

// Update overview
function updateOverview() {
  const today = getTodayLocalAdmin();
  const thisMonth = getThisMonthLocalAdmin();

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
  const today = getTodayLocalAdmin();
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
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d2 = String(date.getDate()).padStart(2, '0');
    weekDays.push(`${y}-${mo}-${d2}`);
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
    <div class="bar-chart">
      ${weekData.map(day => {
        const height = Math.max((day.count / maxCount) * 100, 4);
        const dayName = new Date(day.date).toLocaleDateString('zh-TW', { weekday: 'short' });
        return `
          <div class="bar-col">
            <div class="bar-value">${day.count}</div>
            <div class="bar" style="height: ${height}%;"></div>
            <div class="bar-label">${dayName}</div>
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
  const today = getTodayLocalAdmin();
  const thisMonth = getThisMonthLocalAdmin();

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

    const monthRecords = empRecords.filter(r => r.date.startsWith(thisMonth));
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
    <table class="data-table">
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
function switchTab(tabName, btnEl) {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => content.classList.remove('active'));
  const targetTab = document.getElementById(`${tabName}Tab`);
  if (targetTab) targetTab.classList.add('active');

  // Load data for specific tabs
  if (tabName === 'attendance') {
    loadAttendance();
  } else if (tabName === 'settings') {
    loadSettings();
  } else if (tabName === 'alerts') {
    loadAlerts();
  } else if (tabName === 'leave') {
    loadAllLeaves();
  }
}

// Show toast
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast'; // reset
  if (type === 'success') toast.classList.add('success');
  if (type === 'error')   toast.classList.add('error');
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Load system settings
async function loadSettings() {
  try {
    const response = await fetch(`/api/admin?action=get-settings&userId=${userProfile.userId}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '載入設定失敗');
    }

    const settings = data.settings;

    // 填入表單
    document.getElementById('workStartTime').value = settings.workStartTime || '09:00';
    document.getElementById('workEndTime').value = settings.workEndTime || '18:00';
    document.getElementById('storeAddress').value = settings.storeAddress || '';
    document.getElementById('storeLatitude').value = settings.storeLatitude || '';
    document.getElementById('storeLongitude').value = settings.storeLongitude || '';
    document.getElementById('storeRadius').value = settings.storeRadius || '100';
    document.getElementById('morningReminderTime').value = settings.morningReminderTime || '09:00';
    document.getElementById('eveningReminderTime').value = settings.eveningReminderTime || '18:00';
    document.getElementById('enableLocationCheck').checked = settings.enableLocationCheck === 'true';
    document.getElementById('enableReminders').checked = settings.enableReminders === 'true';
    document.getElementById('lateThreshold').value = settings.lateThreshold || '15';
    document.getElementById('earlyThreshold').value = settings.earlyThreshold || '15';
    document.getElementById('enableAlerts').checked = settings.enableAlerts === 'true';

  } catch (error) {
    console.error('載入設定錯誤:', error);
    showSettingsMessage('載入設定失敗：' + error.message, 'error');
  }
}

// Save system settings
async function saveSettings() {
  try {
    // 收集表單資料
    const settings = {
      workStartTime: document.getElementById('workStartTime').value,
      workEndTime: document.getElementById('workEndTime').value,
      storeAddress: document.getElementById('storeAddress').value,
      storeLatitude: document.getElementById('storeLatitude').value,
      storeLongitude: document.getElementById('storeLongitude').value,
      storeRadius: document.getElementById('storeRadius').value,
      morningReminderTime: document.getElementById('morningReminderTime').value,
      eveningReminderTime: document.getElementById('eveningReminderTime').value,
      enableLocationCheck: document.getElementById('enableLocationCheck').checked ? 'true' : 'false',
      enableReminders: document.getElementById('enableReminders').checked ? 'true' : 'false',
      lateThreshold: document.getElementById('lateThreshold').value,
      earlyThreshold: document.getElementById('earlyThreshold').value,
      enableAlerts: document.getElementById('enableAlerts').checked ? 'true' : 'false'
    };

    // 發送更新請求
    const response = await fetch(`/api/admin?action=update-settings&userId=${userProfile.userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });

    const data = await response.json();

    if (!data.success) {
      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors.join('\n'));
      }
      throw new Error(data.error || '儲存設定失敗');
    }

    showSettingsMessage('✅ 設定已成功儲存', 'success');
    showToast('設定已儲存', 'success');

    // 3 秒後重新載入設定
    setTimeout(() => {
      loadSettings();
    }, 1000);

  } catch (error) {
    console.error('儲存設定錯誤:', error);
    showSettingsMessage('❌ ' + error.message, 'error');
    showToast('儲存失敗', 'error');
  }
}

// Show settings message
function showSettingsMessage(message, type) {
  const msgDiv = document.getElementById('settingsMessage');
  if (!msgDiv) return;
  msgDiv.textContent = message;
  msgDiv.className = `settings-msg ${type}`;
  msgDiv.style.display = 'block';

  setTimeout(() => {
    msgDiv.style.display = 'none';
  }, 5000);
}

// Load alerts
async function loadAlerts() {
  try {
    // 載入今日異常
    const response = await fetch(`/api/admin?action=anomalies&userId=${userProfile.userId}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '載入異常失敗');
    }

    const anomalies = data.anomalies;
    document.getElementById('alertCount').textContent = `共 ${anomalies.length} 個`;

    // 顯示摘要
    displayAlertSummary(anomalies);

    // 顯示異常列表
    displayAlertList(anomalies);

    // 載入統計資料
    loadAlertStats();

  } catch (error) {
    console.error('載入異常錯誤:', error);
    document.getElementById('alertList').innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
        載入失敗：${error.message}
      </div>
    `;
  }
}

// Display alert summary
function displayAlertSummary(anomalies) {
  if (anomalies.length === 0) {
    document.getElementById('alertSummary').innerHTML = `
      <div style="text-align: center; padding: 20px; background: rgba(52, 199, 89, 0.1); border-radius: 8px; color: var(--success);">
        <i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 8px;"></i>
        <div style="font-weight: 600;">今日無異常</div>
      </div>
    `;
    return;
  }

  const bySeverity = anomalies.reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});

  const summaryHtml = `
    <div class="summary-grid">
      <div class="summary-card high">
        <div class="summary-value">${bySeverity.high || 0}</div>
        <div class="summary-label">高嚴重度</div>
      </div>
      <div class="summary-card medium">
        <div class="summary-value">${bySeverity.medium || 0}</div>
        <div class="summary-label">中嚴重度</div>
      </div>
      <div class="summary-card low">
        <div class="summary-value">${bySeverity.low || 0}</div>
        <div class="summary-label">低嚴重度</div>
      </div>
    </div>
  `;

  document.getElementById('alertSummary').innerHTML = summaryHtml;
}

// Display alert list
function displayAlertList(anomalies) {
  if (anomalies.length === 0) {
    document.getElementById('alertList').innerHTML = '';
    return;
  }

  const typeEmoji = {
    late: '⏰',
    early: '🏃',
    missing: '❌',
    duplicate: '🔄',
    unusual: '🌙'
  };

  const typeName = {
    late: '遲到',
    early: '早退',
    missing: '未打卡',
    duplicate: '重複打卡',
    unusual: '非常規時間'
  };

  const severityColor = {
    high: '#FF3B30',
    medium: '#FF9500',
    low: '#34C759'
  };

  const severityName = {
    high: '高',
    medium: '中',
    low: '低'
  };

  const typeIcon = {
    late: 'fa-clock', early: 'fa-running', missing: 'fa-times-circle',
    duplicate: 'fa-redo', unusual: 'fa-moon'
  };

  const html = anomalies.map(a => `
    <div class="alert-item">
      <div class="alert-icon ${a.severity}">
        <i class="fas ${typeIcon[a.type] || 'fa-exclamation'}"></i>
      </div>
      <div class="alert-info">
        <div class="alert-name">${a.employeeName}</div>
        <div class="alert-msg">${a.message}</div>
        <div class="alert-time">${a.detectedAt} &middot; ${typeName[a.type]}</div>
      </div>
      <div class="sev-badge ${a.severity}">${severityName[a.severity]}</div>
    </div>
  `).join('');

  document.getElementById('alertList').innerHTML = html;
}

// Load alert statistics
async function loadAlertStats() {
  try {
    const response = await fetch(`/api/admin?action=anomaly-stats&userId=${userProfile.userId}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '載入統計失敗');
    }

    const stats = data.stats;

    const typeNames = {
      late: '遲到',
      early: '早退',
      missing: '未打卡',
      duplicate: '重複打卡',
      unusual: '非常規時間'
    };

    const typeStatsHtml = Object.entries(stats.byType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
          <span style="font-size: 14px;">${typeNames[type] || type}</span>
          <span style="font-weight: 600; color: var(--primary);">${count} 次</span>
        </div>
      `).join('');

    const employeeStatsHtml = Object.entries(stats.byEmployee)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, info]) => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
          <span style="font-size: 14px;">${name}</span>
          <span style="font-weight: 600; color: var(--warning);">${info.count} 次</span>
        </div>
      `).join('');

    const html = `
      <div style="margin-bottom: 20px;">
        <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">異常類型分布</div>
        ${typeStatsHtml || '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">無資料</div>'}
      </div>

      <div>
        <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">員工異常次數 TOP 5</div>
        ${employeeStatsHtml || '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">無資料</div>'}
      </div>

      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">
        <div style="font-size: 28px; font-weight: 700; color: var(--danger);">${stats.total}</div>
        <div style="font-size: 13px; color: var(--text-secondary);">總異常次數（30 天）</div>
      </div>
    `;

    document.getElementById('alertStats').innerHTML = html;

  } catch (error) {
    console.error('載入統計錯誤:', error);
    document.getElementById('alertStats').innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
        載入失敗
      </div>
    `;
  }
}

// ── Leave System ────────────────────────────────────────

let allLeaves = [];
let leaveFilter = 'all';

const LEAVE_TYPE_TEXT_ADMIN = {
  annual: '特休', sick: '病假', personal: '事假', other: '其他'
};

// Load all leaves and update pending badge
async function loadAllLeaves() {
  const container = document.getElementById('leaveList');
  if (container) container.innerHTML = '<div class="loading">載入中...</div>';

  try {
    const res = await fetch(`/api/admin?action=leave-all&userId=${userProfile.userId}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.error);

    allLeaves = data.leaves || [];

    // Update pending badge in tab nav
    const pending = allLeaves.filter(l => l.status === 'pending');
    const badge = document.getElementById('pendingLeaveCount');
    if (badge) {
      if (pending.length > 0) {
        badge.textContent = pending.length;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    renderLeaves();
  } catch (error) {
    console.error('載入請假失敗:', error);
    if (container) container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">載入失敗</div>';
  }
}

// Filter and render leaves
function filterLeaves(filter, chipEl) {
  leaveFilter = filter;
  // Update chip styles
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (chipEl) chipEl.classList.add('active');
  renderLeaves();
}

function renderLeaves() {
  const container = document.getElementById('leaveList');
  if (!container) return;

  let filtered = [...allLeaves];
  if (leaveFilter !== 'all') {
    filtered = filtered.filter(l => l.status === leaveFilter);
  }

  // Sort: pending first, then by createdAt desc
  filtered.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
        <i class="fas fa-inbox" style="font-size:36px;opacity:0.4;display:block;margin-bottom:10px;"></i>
        無${leaveFilter !== 'all' ? ['', '待審核', '已批准', '已拒絕'][['all','pending','approved','rejected'].indexOf(leaveFilter)] : ''}請假紀錄
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(leave => {
    const typeText   = LEAVE_TYPE_TEXT_ADMIN[leave.leaveType] || leave.leaveType;
    const statusMap  = { pending: '待審核', approved: '已批准', rejected: '已拒絕' };
    const statusText = statusMap[leave.status] || leave.status;
    const datesText  = leave.startDate === leave.endDate
      ? leave.startDate
      : `${leave.startDate} ~ ${leave.endDate}`;
    const initials = (leave.employeeName || '?').charAt(0);

    const actionHtml = leave.status === 'pending' ? `
      <div class="leave-action-row">
        <button class="btn-approve" onclick="reviewLeave('${leave.leaveId}', 'approve', this)">
          <i class="fas fa-check"></i> 批准
        </button>
        <button class="btn-reject" onclick="toggleRejectInput('${leave.leaveId}', this)">
          <i class="fas fa-times"></i> 拒絕
        </button>
      </div>
      <input type="text" id="rejectInput-${leave.leaveId}" class="reject-reason-input"
        placeholder="請填寫拒絕原因…">
      <div id="confirmReject-${leave.leaveId}" style="display:none; margin-top:8px;">
        <button class="btn-reject" style="width:100%;" onclick="reviewLeave('${leave.leaveId}', 'reject', this)">
          <i class="fas fa-times-circle"></i> 確認拒絕
        </button>
      </div>
    ` : (leave.status === 'rejected' && leave.rejectReason ? `
      <div class="leave-reject-row">
        <i class="fas fa-circle-xmark"></i> 拒絕原因：${leave.rejectReason}
      </div>` : '');

    return `
      <div class="leave-card" id="leaveCard-${leave.leaveId}">
        <div class="leave-card-header">
          <div class="leave-card-name">
            <div class="lc-avatar">${initials}</div>
            <span>${leave.employeeName}</span>
          </div>
          <span class="leave-status-badge ${leave.status}">${statusText}</span>
        </div>
        <div class="leave-card-meta">
          <span class="leave-type-tag">${typeText}</span>
          ${datesText}（${leave.days} 天）
        </div>
        ${leave.reason ? `<div class="leave-card-reason"><i class="fas fa-comment-dots" style="color:var(--text-muted);margin-right:4px;"></i>${leave.reason}</div>` : ''}
        ${actionHtml}
      </div>`;
  }).join('');
}

// Toggle reject reason input
function toggleRejectInput(leaveId, btn) {
  const input   = document.getElementById(`rejectInput-${leaveId}`);
  const confirm = document.getElementById(`confirmReject-${leaveId}`);
  if (!input || !confirm) return;
  const isVisible = input.style.display !== 'none';
  input.style.display   = isVisible ? 'none' : 'block';
  confirm.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) input.focus();
}

// Review a leave (approve or reject)
async function reviewLeave(leaveId, action, btn) {
  let rejectReason = '';
  if (action === 'reject') {
    const input = document.getElementById(`rejectInput-${leaveId}`);
    rejectReason = input?.value?.trim();
    if (!rejectReason) {
      showToast('請填寫拒絕原因', 'error');
      return;
    }
  }

  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`/api/admin?action=leave-review&userId=${userProfile.userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userProfile.userId,
        leaveId,
        reviewAction: action,
        rejectReason,
      }),
    });

    const result = await res.json();

    if (result.success) {
      const actionText = action === 'approve' ? '已批准' : '已拒絕';
      showToast(`請假申請${actionText}`, 'success');
      // Reload leaves
      await loadAllLeaves();
    } else {
      showToast(result.error || '審核失敗', 'error');
      if (btn) btn.disabled = false;
    }
  } catch (error) {
    console.error('審核請假失敗:', error);
    showToast('操作失敗，請稍後再試', 'error');
    if (btn) btn.disabled = false;
  }
}

// Initialize on load
window.addEventListener('load', initLiff);
