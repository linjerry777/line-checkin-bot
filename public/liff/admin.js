// Admin Panel JavaScript
let liffConfig = null;
let userProfile = null;
let allEmployees = [];
let allRecords   = [];
let allLeavesData = [];  // all leave records (loaded in loadAllData)

// Normalize Google Sheets time values to HH:MM for <input type="time">
// Handles: decimal (0.375), "下午4:00", "4:00 PM", "09:00", "09:00:00"
function normTimeInput(val, fallback) {
  if (!val) return fallback;
  const str = String(val).trim();
  const num = parseFloat(str);
  if (!isNaN(num) && !str.includes(':')) {
    const totalMin = Math.round(num * 24 * 60);
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (/pm/i.test(str) && h !== 12) h += 12;
    if (/am/i.test(str) && h === 12) h = 0;
    if (/下午/.test(str) && h !== 12) h += 12;
    if (/上午/.test(str) && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return fallback;
}

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

const SESSION_KEY = 'adminSession_v1';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ── 密碼登入 ────────────────────────────────────────────

function showLoginScreen() {
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('mainContent').style.display = 'none';
  setTimeout(() => document.getElementById('adminPasswordInput').focus(), 100);
}

function showMainScreen() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
}

async function adminLogin() {
  const password = document.getElementById('adminPasswordInput').value;
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');

  if (!password) { errEl.textContent = '請輸入密碼'; return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 驗證中…';
  errEl.textContent = '';

  try {
    const res = await fetch('/api/admin?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (!data.success) {
      errEl.textContent = data.error || '密碼錯誤';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登入';
      return;
    }

    // Save session
    userProfile = { userId: data.userId, displayName: data.displayName };
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...userProfile,
      expires: Date.now() + SESSION_TTL,
    }));

    showMainScreen();
    await initAdminPanel();

  } catch (e) {
    errEl.textContent = '網路錯誤，請重試';
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登入';
  }
}

function adminLogout() {
  localStorage.removeItem(SESSION_KEY);
  userProfile = null;
  document.getElementById('adminPasswordInput').value = '';
  showLoginScreen();
}

// Allow Enter key on password input
function onPasswordKeydown(e) {
  if (e.key === 'Enter') adminLogin();
}

// ── 初始化 ───────────────────────────────────────────────

async function initAdmin() {
  // Check stored session
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (session.expires > Date.now() && session.userId) {
        userProfile = { userId: session.userId, displayName: session.displayName };
        showMainScreen();
        await initAdminPanel();
        return;
      }
    }
  } catch (_) {}
  showLoginScreen();
}

async function initAdminPanel() {
  const adminNameEl = document.getElementById('adminName');
  if (adminNameEl) adminNameEl.textContent = `管理員：${userProfile.displayName}`;

  const todayLocal = getTodayLocalAdmin();
  const attendanceDateEl = document.getElementById('attendanceDate');
  if (attendanceDateEl) attendanceDateEl.value = todayLocal;
  const exportMonthEl = document.getElementById('exportMonth');
  if (exportMonthEl) exportMonthEl.value = todayLocal.slice(0, 7);

  await loadAllData();
}

// Load all data
async function loadAllData() {
  // Load employees
  try {
    const empRes = await fetch(`/api/admin?action=employees&userId=${userProfile.userId}`);
    if (!empRes.ok) throw new Error(`HTTP ${empRes.status}`);
    const empData = await empRes.json();
    allEmployees = empData.employees || [];
    console.log('[loadAllData] 員工數:', allEmployees.length);
  } catch (e) {
    console.error('[loadAllData] employees 失敗:', e);
    allEmployees = [];
  }

  // Load all records
  try {
    const recRes = await fetch(`/api/admin?action=records&userId=${userProfile.userId}`);
    if (!recRes.ok) throw new Error(`HTTP ${recRes.status}`);
    const recData = await recRes.json();
    allRecords = recData.records || [];
    console.log('[loadAllData] 紀錄數:', allRecords.length);
  } catch (e) {
    console.error('[loadAllData] records 失敗:', e);
    allRecords = [];
  }

  // Load all leaves (for 曠職/請假 cross-reference)
  try {
    const lvRes = await fetch(`/api/admin?action=leave-all&userId=${userProfile.userId}`);
    if (lvRes.ok) {
      const lvData = await lvRes.json();
      allLeavesData = lvData.leaves || [];
    }
  } catch (e) {
    console.error('[loadAllData] leaves 失敗:', e);
    allLeavesData = [];
  }

  // Update UI (these are sync, won't throw)
  try { updateOverview(); } catch (e) { console.error('updateOverview:', e); }
  try { updateEmployeeList(); } catch (e) { console.error('updateEmployeeList:', e); }
  try { loadAttendance(); } catch (e) { console.error('loadAttendance:', e); }

  // Badge (async, fire-and-forget)
  loadPendingLeaveBadge().catch(() => {});
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

    // Build a compact schedule summary e.g. "一~五 09:00-18:00 ｜ 六 09:00-14:00"
    const sched = emp.weeklySchedule || {};
    const hasSchedule = Object.values(sched).some(v => v);
    const dayNames = ['日','一','二','三','四','五','六'];
    let schedLabel = hasSchedule ? '' : '未設定班表';
    if (hasSchedule) {
      // Group consecutive days with same time
      const groups = {};
      ['1','2','3','4','5','6','0'].forEach(k => {
        const v = sched[k] || '';
        if (!v) return;
        if (!groups[v]) groups[v] = [];
        groups[v].push(dayNames[parseInt(k)]);
      });
      schedLabel = Object.entries(groups).map(([time, days]) => `${days.join('')} ${time}`).join(' ｜ ');
    }

    return `
      <div class="employee-item">
        <div class="employee-avatar">${emp.name.charAt(0)}</div>
        <div class="employee-info">
          <div class="employee-name">${emp.name}</div>
          <div class="employee-stats" style="font-size:11px;">${schedLabel}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button onclick="openShiftEdit('${emp.userId}','${emp.name}')"
            style="background:var(--bg2);color:var(--primary);border:none;padding:7px 10px;border-radius:8px;cursor:pointer;font-size:13px;">
            <i class="fas fa-calendar-week"></i>
          </button>
          <div class="status-badge ${status}">
            ${status === 'present' ? '在班' : status === 'off' ? '已下班' : '未到'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Helper: parse "HH:MM" or "HH:MM:SS" → total minutes
function parseMinutes(t) {
  if (!t) return null;
  const p = String(t).split(':');
  return parseInt(p[0], 10) * 60 + (parseInt(p[1], 10) || 0);
}

// Helper: get employee's shift for a specific date (not today)
function getShiftForDate(emp, dateStr) {
  const schedule = emp.weeklySchedule;
  if (!schedule || Object.keys(schedule).length === 0) return { hasSchedule: false };
  // Use noon to avoid DST ambiguity
  const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun...6=Sat
  const val = schedule[String(dayOfWeek)];
  if (!val) return null; // day off
  const [start, end] = val.split('-');
  return (start && end) ? { start, end } : null;
}

// Load attendance for selected date
function loadAttendance() {
  const dateInput    = document.getElementById('attendanceDate');
  const selectedDate = dateInput.value;
  const container    = document.getElementById('attendanceList');
  const title        = document.getElementById('attendanceTitle');

  title.textContent = `${selectedDate} 出勤紀錄`;

  const dayRecords = allRecords.filter(r => r.date === selectedDate);

  // Build check-in/out map from actual records
  const recordMap = {};
  dayRecords.forEach(record => {
    if (!recordMap[record.userId]) {
      recordMap[record.userId] = { checkin: null, checkout: null, lateReason: '', overtimeReason: '' };
    }
    if (record.type === 'in') {
      if (!recordMap[record.userId].checkin) recordMap[record.userId].checkin = record.time;
      if (record.reason) recordMap[record.userId].lateReason = record.reason;
    } else {
      recordMap[record.userId].checkout = record.time; // keep last out
      if (record.reason) recordMap[record.userId].overtimeReason = record.reason;
    }
  });

  // Approved leaves on this date
  const dayLeaves = allLeavesData.filter(l =>
    l.status === 'approved' && l.startDate <= selectedDate && l.endDate >= selectedDate
  );
  const leaveUserIds = new Set(dayLeaves.map(l => l.userId));

  // Build rows: all active employees
  const rows = [];

  allEmployees.filter(e => e.status === 'active').forEach(emp => {
    const shift = getShiftForDate(emp, selectedDate);
    const rec   = recordMap[emp.userId];

    // Determine row type
    let rowType = 'normal'; // normal / absent / leave / offday
    if (!rec) {
      if (leaveUserIds.has(emp.userId)) rowType = 'leave';
      else if (shift === null) rowType = 'offday';
      else if (shift && shift.start) rowType = 'absent'; // scheduled but no punch
      else rowType = 'normal'; // no schedule set, just skip
    } else if (shift === null) {
      rowType = 'nonscheduled'; // worked on a day-off (e.g. unscheduled Saturday)
    }

    // Skip: offday AND no punch record
    if (rowType === 'offday') return;
    // Skip: no schedule AND no punch
    if (!rec && !shift && !leaveUserIds.has(emp.userId)) return;

    // Actual hours worked
    let workedMin = null;
    if (rec?.checkin && rec?.checkout) {
      const diff = parseMinutes(rec.checkout) - parseMinutes(rec.checkin);
      if (diff > 0 && diff < 1440) workedMin = diff;
    }

    // Overtime / early-departure calculations (only when shift is known)
    let shiftNote = '';
    let overtimeMin = 0;  // total daily overtime minutes (saved for export)
    if (rec && shift && shift.start && shift.end) {
      const schedStart = parseMinutes(shift.start);
      const schedEnd   = parseMinutes(shift.end);
      const actualIn   = parseMinutes(rec.checkin);
      const actualOut  = parseMinutes(rec.checkout);
      const notes = [];

      // Early arrival = overtime
      const earlyArrival = (actualIn  !== null && actualIn  < schedStart) ? (schedStart - actualIn)  : 0;
      // Late departure   = overtime
      const lateStay     = (actualOut !== null && actualOut > schedEnd)   ? (actualOut  - schedEnd)   : 0;
      // Early departure  = early leave (NOT overtime)
      const earlyLeave   = (actualOut !== null && actualOut < schedEnd)   ? (schedEnd   - actualOut)  : 0;

      overtimeMin = earlyArrival + lateStay;

      if (overtimeMin > 0) {
        const parts = [];
        if (earlyArrival > 0) parts.push(`提前${earlyArrival}分`);
        if (lateStay     > 0) parts.push(`延後${lateStay}分`);
        notes.push(`加班 ${overtimeMin} 分${parts.length ? '（' + parts.join('＋') + '）' : ''}`);
      }
      if (earlyLeave > 0) {
        notes.push(`早退 ${earlyLeave} 分`);
      }
      if (notes.length) shiftNote = notes.join('、');
    } else if (rowType === 'nonscheduled' && rec?.checkin) {
      shiftNote = '非排班日出勤';
    }

    // Leave info for this employee on this date
    const leave = dayLeaves.find(l => l.userId === emp.userId);

    rows.push({ emp, rec, rowType, workedMin, shiftNote, shift, leave, overtimeMin });
  });

  if (rows.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>當日無出勤紀錄</p></div>';
    return;
  }

  const mkReason = (reason) => reason
    ? `<span style="color:#D97706;font-size:12px;" title="${reason}">⚠️ ${reason.length > 22 ? reason.slice(0, 22) + '…' : reason}</span>`
    : '<span style="color:#94A3B8;font-size:12px;">-</span>';

  const mkNote = (note) => note
    ? `<span style="color:#0891b2;font-size:12px;">${note}</span>`
    : '<span style="color:#94A3B8;font-size:12px;">-</span>';

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>員工</th>
          <th>上班</th>
          <th>下班</th>
          <th>工時</th>
          <th>加班/早退</th>
          <th>遲到原因</th>
          <th>加班原因</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(({ emp, rec, rowType, workedMin, shiftNote, leave }) => {
          if (rowType === 'absent') {
            return `<tr style="background:#fff1f0;">
              <td>${emp.name}</td>
              <td colspan="6" style="color:#e53935;font-weight:600;">🚫 曠職（應出勤未打卡）</td>
            </tr>`;
          }
          if (rowType === 'leave') {
            const lt = leave ? ` - ${leave.leaveTypeText}${leave.startTime ? ' ' + leave.startTime + '–' + leave.endTime : ''}` : '';
            return `<tr style="background:#f0f9ff;">
              <td>${emp.name}</td>
              <td colspan="6" style="color:#0891b2;font-weight:600;">🏖️ 請假${lt}</td>
            </tr>`;
          }
          const hours = workedMin !== null ? (workedMin / 60).toFixed(1) + 'h' : '-';
          const schedHint = shiftNote ? '' : (rec?.checkin && !rec?.checkout ? '<span style="color:#f59e0b;font-size:11px;">未下班打卡</span>' : '');
          return `
            <tr>
              <td>${emp.name}</td>
              <td class="time-cell">${rec?.checkin || '-'}</td>
              <td class="time-cell">${rec?.checkout || '-'}</td>
              <td>${hours}${schedHint}</td>
              <td>${mkNote(shiftNote)}</td>
              <td>${mkReason(rec?.lateReason)}</td>
              <td>${mkReason(rec?.overtimeReason)}</td>
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
      const toMin = t => { const p = t.split(':'); return parseInt(p[0])*60 + parseInt(p[1]); };
      const minutes = toMin(day.out) - toMin(day.in);
      if (minutes > 0 && minutes < 24 * 60) {
        totalMinutes += minutes;
      }
    }
  });

  return Math.floor(totalMinutes / 60);
}

// ── Overtime salary calculation helpers ──────────────────────────────────────

/**
 * For a given employee, calculate per-day data for a month.
 *
 * Returns {
 *   perDayData[],           // one entry per calendar day (index = day-1)
 *   totalRegularHours,      // string "XXX.X"
 *   totalOvertimeHours,     // string "XXX.X"
 *   basePay,                // number
 *   overtimePay,            // number
 *   deductions,             // number (lateness + early-leave + leave)
 *   totalPay,               // number = basePay + overtimePay - deductions
 *   hasSalary               // boolean
 * }
 *
 * perDayData[i] = {
 *   dateStr, inStr, outStr,
 *   shift,       // {start,end} | null (day-off) | {hasSchedule:false}
 *   leave,       // leave object or null
 *   onLeave,     // boolean
 *   otDetail,    // e.g. "加班80分(提前80分)：前80分×1.34=NT$89 合計NT$89"
 *   deductDetail,// e.g. "遲到40分(2單位) 扣-NT$208"
 *   dailyPayStr, // e.g. "NT$1820"
 *   dayOTMin     // raw OT minutes
 * }
 *
 * Overtime rules:
 *  - Scheduled work day : earlyArrival + lateStay = OT
 *  - Scheduled day-off  : entire worked duration = OT
 *  - No schedule set    : entire worked duration = OT
 *
 * Deduction rules (monthly salary only, half-hour unit):
 *  - unit_rate = salary / 30 / 16
 *  - units = ceil(lateMin / 30) + ceil(earlyLvMin / 30)
 *  - deduction = units × unit_rate
 *
 * Leave deduction: full daily rate deducted for each leave day (no punch)
 */
function calcEmpMonthSalary(emp, month) {
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();

  const salaryType   = emp.salaryType   || '';
  const salaryAmount = emp.salaryAmount || 0;
  // Hourly equivalent rate: monthly → ÷240 (based on 240h/month); hourly → as-is
  const hourlyRate   = salaryType === 'monthly' ? salaryAmount / 240 : salaryAmount;
  // Daily rate & half-hour deduction unit (monthly only)
  const dailyRate    = salaryType === 'monthly' && salaryAmount > 0 ? salaryAmount / 30 : 0;
  const halfHourRate = dailyRate / 16; // 8h day = 16 half-hour units

  let totalRegularMin  = 0;
  let totalOvertimeMin = 0;
  let totalOvertimePay = 0;
  let totalDeductions  = 0;

  // Approved leaves this month for this employee (fix operator-precedence bug with parentheses)
  const empLeaves = allLeavesData.filter(l =>
    l.userId === emp.userId &&
    l.status === 'approved' &&
    (l.startDate.slice(0, 7) === month || l.endDate.slice(0, 7) === month)
  );

  const perDayData = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const shift   = getShiftForDate(emp, dateStr);

    // First punch-in of the day, last punch-out
    const dayRecs = allRecords.filter(r => r.userId === emp.userId && r.date === dateStr);
    let inStr = null, outStr = null, lateReason = '', otReason = '';
    dayRecs.forEach(r => {
      if (r.type === 'in'  && !inStr) { inStr = r.time; lateReason = r.reason || ''; }
      if (r.type === 'out')           { outStr = r.time; otReason   = r.reason || ''; }
    });

    const leave   = empLeaves.find(l => l.startDate <= dateStr && l.endDate >= dateStr) || null;
    const onLeave = !!leave;

    let otDetail = '', deductDetail = '', dailyPayStr = '';
    let dayOTMin = 0, dayOTPay = 0, dayDeduction = 0;

    if (onLeave && !inStr) {
      // ── Approved full-day leave, no attendance ────────────────────────
      if (salaryType === 'monthly' && salaryAmount > 0) {
        dayDeduction = Math.round(dailyRate);
        totalDeductions += dayDeduction;
        deductDetail = `${leave.leaveTypeText || '請假'}全天 扣-NT$${dayDeduction}`;
      }
      dailyPayStr = leave.leaveTypeText || '請假';

    } else if (inStr) {
      const aIn  = parseMinutes(inStr);
      const aOut = outStr ? parseMinutes(outStr) : null;
      const hasShift = !!(shift && shift.start && shift.end);
      const isOffDay = shift === null;

      if (hasShift) {
        // ── Normal scheduled work day ─────────────────────────────────
        const ss = parseMinutes(shift.start);
        const se = parseMinutes(shift.end);
        totalRegularMin += (se - ss);

        const earlyArr = aIn  < ss ? ss - aIn  : 0;
        const lateArr  = aIn  > ss ? aIn - ss  : 0;
        const lateStay = aOut !== null && aOut > se ? aOut - se : 0;
        const earlyLv  = aOut !== null && aOut < se ? se - aOut : 0;
        dayOTMin = earlyArr + lateStay;
        totalOvertimeMin += dayOTMin;

        // OT pay + detail
        if (dayOTMin > 0 && hourlyRate > 0) {
          const first2h  = Math.min(dayOTMin, 120) / 60;
          const beyond2h = Math.max(0, dayOTMin - 120) / 60;
          const pay1 = first2h  * hourlyRate * 1.34;
          const pay2 = beyond2h * hourlyRate * 1.67;
          dayOTPay = Math.round(pay1 + pay2);
          totalOvertimePay += dayOTPay;

          const otParts = [];
          if (earlyArr > 0) otParts.push(`提前${earlyArr}分`);
          if (lateStay > 0) otParts.push(`延後${lateStay}分`);
          otDetail = `加班${dayOTMin}分`;
          if (otParts.length) otDetail += `(${otParts.join('+')})`;
          otDetail += '：';
          if (dayOTMin <= 120) {
            otDetail += `前${dayOTMin}分×1.34=NT$${Math.round(pay1)}`;
          } else {
            otDetail += `前120分×1.34=NT$${Math.round(pay1)} 後${dayOTMin - 120}分×1.67=NT$${Math.round(pay2)}`;
          }
          otDetail += ` 合計NT$${dayOTPay}`;
        }

        // Deduction: lateness + early-leave (monthly only, half-hour units)
        if (salaryType === 'monthly' && salaryAmount > 0 && (lateArr > 0 || earlyLv > 0)) {
          const lateUnits  = lateArr > 0  ? Math.ceil(lateArr  / 30) : 0;
          const earlyUnits = earlyLv > 0  ? Math.ceil(earlyLv  / 30) : 0;
          dayDeduction = Math.round(halfHourRate * (lateUnits + earlyUnits));
          totalDeductions += dayDeduction;
          const dParts = [];
          if (lateArr > 0) dParts.push(`遲到${lateArr}分(${lateUnits}單位)`);
          if (earlyLv > 0) dParts.push(`早退${earlyLv}分(${earlyUnits}單位)`);
          deductDetail = dParts.join(' ') + ` 扣-NT$${dayDeduction}`;
        }

      } else if (isOffDay || !shift || shift.hasSchedule === false) {
        // ── Scheduled day-off OR no schedule → all worked time = OT ─────
        if (aOut !== null && aOut > aIn) {
          dayOTMin = aOut - aIn;
          totalOvertimeMin += dayOTMin;
          const label = isOffDay ? '休假日出勤' : '非排班出勤';

          if (hourlyRate > 0) {
            const first2h  = Math.min(dayOTMin, 120) / 60;
            const beyond2h = Math.max(0, dayOTMin - 120) / 60;
            const pay1 = first2h  * hourlyRate * 1.34;
            const pay2 = beyond2h * hourlyRate * 1.67;
            dayOTPay = Math.round(pay1 + pay2);
            totalOvertimePay += dayOTPay;

            otDetail = `加班${dayOTMin}分(${label})：`;
            if (dayOTMin <= 120) {
              otDetail += `前${dayOTMin}分×1.34=NT$${Math.round(pay1)}`;
            } else {
              otDetail += `前120分×1.34=NT$${Math.round(pay1)} 後${dayOTMin - 120}分×1.67=NT$${Math.round(pay2)}`;
            }
            otDetail += ` 合計NT$${dayOTPay}`;
          }
        }
      }

      // Daily pay string
      if (salaryType === 'monthly' && salaryAmount > 0) {
        const net = Math.round(dailyRate) + dayOTPay - dayDeduction;
        dailyPayStr = `NT$${net}`;
      } else if (salaryType === 'hourly' && salaryAmount > 0) {
        const workedMin = aOut !== null && aOut > aIn ? aOut - aIn : 0;
        const schedMin  = hasShift ? parseMinutes(shift.end) - parseMinutes(shift.start) : 0;
        const regMin    = schedMin > 0 ? Math.min(workedMin, schedMin) : workedMin;
        dailyPayStr = `NT$${Math.round((regMin / 60) * salaryAmount) + dayOTPay}`;
      }
    }

    perDayData.push({
      dateStr, inStr, outStr, lateReason, otReason,
      shift, leave, onLeave,
      otDetail, deductDetail, dailyPayStr, dayOTMin,
    });
  }

  let basePay = 0;
  if (salaryType === 'monthly') {
    basePay = salaryAmount;
  } else if (salaryType === 'hourly') {
    basePay = (totalRegularMin / 60) * salaryAmount;
  }

  return {
    perDayData,
    totalRegularHours:  (totalRegularMin  / 60).toFixed(1),
    totalOvertimeHours: (totalOvertimeMin / 60).toFixed(1),
    basePay:     Math.round(basePay),
    overtimePay: Math.round(totalOvertimePay),
    deductions:  Math.round(totalDeductions),
    totalPay:    Math.round(basePay + totalOvertimePay - totalDeductions),
    hasSalary:   !!salaryType && salaryAmount > 0,
  };
}

// ── Export: 日期為列（每日1列）、員工為欄（每人5欄橫向）────────────────────────
// Layout:
//   Row 1 : 日期 | 星期 | 員工A（月薪） |      |        |    |        | 員工B…
//   Row 2 :      |      | 上班          | 下班  | 加班明細| 扣薪 | 當日薪資 | 上班…
//   Row 3~: 1(日)| 日   | 09:05         | 18:45 | 加班45… |    | NT$1820  | …
function exportMonthData() {
  const month = document.getElementById('exportMonth').value;
  if (!month) { showToast('請選擇月份', 'error'); return; }

  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const DOW_NAMES   = ['日','一','二','三','四','五','六'];

  const activeEmps = allEmployees.filter(e => e.status === 'active');

  // Pre-compute per-employee monthly data (includes per-day breakdown)
  const empSalaries = activeEmps.map(emp => calcEmpMonthSalary(emp, month));

  const csvRows = [];

  // ── Header row 1: 日期 | 星期 | 員工A（佔5欄）| 員工B（佔5欄）| … ───────────
  const nameRow = ['日期', '星期'];
  activeEmps.forEach(emp => {
    const salLbl = emp.salaryType === 'monthly' ? '（月薪）'
                 : emp.salaryType === 'hourly'  ? '（時薪）' : '';
    nameRow.push(`${emp.name}${salLbl}`, '', '', '', '');
  });
  csvRows.push(nameRow);

  // ── Header row 2: | | 上班 | 下班 | 加班明細 | 扣薪 | 當日薪資 | … ──────────
  const subRow = ['', ''];
  activeEmps.forEach(() => subRow.push('上班', '下班', '加班明細', '扣薪', '當日薪資'));
  csvRows.push(subRow);

  // ── Data rows: 1 row per date, 5 cells per employee ───────────────────
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const dow     = new Date(dateStr + 'T12:00:00').getDay();
    const row     = [d, DOW_NAMES[dow]];

    activeEmps.forEach((emp, ei) => {
      const sal = empSalaries[ei];
      const dd  = sal.perDayData[d - 1];
      const { inStr, outStr, shift, leave, onLeave, otDetail, deductDetail, dailyPayStr,
              lateReason, otReason } = dd;
      const hasShift = !!(shift && shift.start && shift.end);
      const isOffDay = shift === null;

      // 上班
      let inCell;
      if (onLeave && !inStr)       inCell = leave?.leaveTypeText || '請假';
      else if (isOffDay && !inStr) inCell = '休';
      else if (hasShift && !inStr) inCell = '曠';
      else                         inCell = inStr ? inStr.slice(0, 5) : '';

      // 下班
      let outCell;
      if (onLeave && !inStr)       outCell = '';
      else if (isOffDay && !inStr) outCell = '';
      else if (hasShift && !inStr) outCell = '曠';
      else                         outCell = inStr ? (outStr ? outStr.slice(0, 5) : '--') : '';

      // 加班明細（含加班備註理由）
      let otCell = (hasShift && !inStr) ? '應出勤未打卡' : (otDetail || '');
      if (otReason) otCell += (otCell ? ' ' : '') + `[加班:${otReason}]`;

      // 扣薪（含遲到備註理由）
      let dedCell = deductDetail || '';
      if (lateReason) dedCell += (dedCell ? ' ' : '') + `[遲到:${lateReason}]`;

      // 當日薪資
      const payCell = dailyPayStr || '';

      row.push(inCell, outCell, otCell, dedCell, payCell);
    });

    csvRows.push(row);
  }

  // ── Summary rows ───────────────────────────────────────────────────────
  csvRows.push([]);

  const summaryDefs = [
    ['總工時(h)',   sal => sal.totalRegularHours],
    ['加班時數(h)', sal => sal.totalOvertimeHours],
    ['扣薪合計',   sal => sal.hasSalary ? `-NT$${sal.deductions}`  : '-'],
    ['基本薪資',   sal => sal.hasSalary ? `NT$${sal.basePay}`      : '-'],
    ['加班費',     sal => sal.hasSalary ? `NT$${sal.overtimePay}`  : '-'],
    ['合計薪資',   sal => sal.hasSalary ? `NT$${sal.totalPay}`     : '-'],
  ];

  summaryDefs.forEach(([label, fn]) => {
    const row = [label, ''];
    empSalaries.forEach(sal => row.push(fn(sal), '', '', '', ''));
    csvRows.push(row);
  });

  // ── Serialize to CSV ───────────────────────────────────────────────────
  const escapeCsv = v => {
    const s = String(v ?? '');
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = csvRows.map(r => r.map(escapeCsv).join(',')).join('\n');

  document.getElementById('exportPreview').style.display = 'block';
  document.getElementById('exportContent').textContent = csv;

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `出勤報表_${month}.csv`;
  link.click();

  showToast('CSV 已下載', 'success');
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

// ── Weekly Schedule Modal ─────────────────────────────────
// Days displayed Mon→Sun (JS day keys: 1,2,3,4,5,6,0)
const SCHEDULE_DAYS = ['1','2','3','4','5','6','0'];

function updateSalaryLabel() {
  const type = document.getElementById('shiftSalaryType').value;
  const label = document.getElementById('shiftSalaryAmountLabel');
  const hint  = document.getElementById('shiftSalaryHint');
  if (type === 'monthly') {
    label.textContent = '月薪金額（元）';
    hint.textContent  = '加班時薪 = 月薪 ÷ 240，前2小時×1.34，之後×1.67';
  } else if (type === 'hourly') {
    label.textContent = '時薪（元/小時）';
    hint.textContent  = '加班：前2小時×1.34，之後×1.67';
  } else {
    label.textContent = '金額（元）';
    hint.textContent  = '';
  }
}

function openShiftEdit(userId, name) {
  const modal = document.getElementById('shiftEditModal');
  const emp = allEmployees.find(e => e.userId === userId);
  const schedule = emp?.weeklySchedule || {};

  document.getElementById('shiftEditEmpName').textContent = name;
  modal.dataset.userId = userId;

  SCHEDULE_DAYS.forEach(key => {
    const val = schedule[key] || '';
    const working = val !== '';
    const [start, end] = working ? val.split('-') : ['', ''];

    const cb = document.getElementById(`day-active-${key}`);
    const s  = document.getElementById(`day-start-${key}`);
    const e2 = document.getElementById(`day-end-${key}`);
    if (!cb) return;

    cb.checked    = working;
    s.value       = start || '';
    e2.value      = end   || '';
    s.disabled    = !working;
    e2.disabled   = !working;
  });

  // Load salary
  const st = document.getElementById('shiftSalaryType');
  const sa = document.getElementById('shiftSalaryAmount');
  st.value = emp?.salaryType  || '';
  sa.value = emp?.salaryAmount || '';
  updateSalaryLabel();

  modal.classList.add('show');
}

function toggleDay(key) {
  const cb = document.getElementById(`day-active-${key}`);
  const s  = document.getElementById(`day-start-${key}`);
  const e2 = document.getElementById(`day-end-${key}`);
  const working = cb.checked;
  s.disabled  = !working;
  e2.disabled = !working;
  // Auto-fill default 09:00-18:00 when checking a day with no time set
  if (working && !s.value && !e2.value) {
    s.value  = '09:00';
    e2.value = '18:00';
  }
}

function closeShiftEdit() {
  document.getElementById('shiftEditModal').classList.remove('show');
}

async function saveShift() {
  const modal      = document.getElementById('shiftEditModal');
  const userId     = modal.dataset.userId;
  const salaryType = document.getElementById('shiftSalaryType').value;
  const salaryAmt  = parseFloat(document.getElementById('shiftSalaryAmount').value) || 0;

  const schedule = {};
  SCHEDULE_DAYS.forEach(key => {
    const cb    = document.getElementById(`day-active-${key}`);
    const start = document.getElementById(`day-start-${key}`).value;
    const end   = document.getElementById(`day-end-${key}`).value;
    schedule[key] = (cb?.checked && start && end) ? `${start}-${end}` : '';
  });

  try {
    // Save schedule and salary in parallel
    const [shiftRes, salaryRes] = await Promise.all([
      fetch(`/api/admin?action=update-employee-shift&userId=${userProfile.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, schedule: JSON.stringify(schedule) }),
      }),
      fetch(`/api/admin?action=update-salary&userId=${userProfile.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, salaryType, salaryAmount: salaryAmt }),
      }),
    ]);
    const shiftResult  = await shiftRes.json();
    const salaryResult = await salaryRes.json();

    if (shiftResult.success && salaryResult.success) {
      const emp = allEmployees.find(e => e.userId === userId);
      if (emp) {
        emp.weeklySchedule = schedule;
        emp.salaryType     = salaryType;
        emp.salaryAmount   = salaryAmt;
      }
      closeShiftEdit();
      showToast('週班表與薪資設定已儲存', 'success');
      updateEmployeeList();
    } else {
      showToast((shiftResult.error || salaryResult.error) || '儲存失敗', 'error');
    }
  } catch (e) {
    showToast('儲存失敗，請稍後再試', 'error');
  }
}

// ── Add Employee ──────────────────────────────────────
function openAddEmployee() {
  document.getElementById('newEmpUserId').value = '';
  document.getElementById('newEmpName').value = '';
  document.getElementById('addEmpMsg').textContent = '';
  document.getElementById('addEmployeeModal').classList.add('show');
}

function closeAddEmployee() {
  document.getElementById('addEmployeeModal').classList.remove('show');
}

async function saveAddEmployee() {
  const userId = document.getElementById('newEmpUserId').value.trim();
  const name   = document.getElementById('newEmpName').value.trim();
  const msgEl  = document.getElementById('addEmpMsg');
  const btn    = document.getElementById('saveAddEmpBtn');

  if (!userId || !name) {
    msgEl.style.color = '#e53935';
    msgEl.textContent = '請填寫 LINE User ID 和員工姓名';
    return;
  }

  btn.disabled = true;
  btn.textContent = '新增中…';
  msgEl.textContent = '';

  try {
    const res = await fetch(`/api/admin?action=add-employee&userId=${userProfile.userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId, name }),
    });
    const result = await res.json();
    if (result.success) {
      closeAddEmployee();
      showToast(`✅ ${name} 已新增`, 'success');
      await loadEmployees();
    } else {
      msgEl.style.color = '#e53935';
      msgEl.textContent = result.error || '新增失敗';
    }
  } catch (e) {
    msgEl.style.color = '#e53935';
    msgEl.textContent = '新增失敗，請稍後再試';
  } finally {
    btn.disabled = false;
    btn.textContent = '新增';
  }
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
    document.getElementById('storeAddress').value = settings.storeAddress || '';
    document.getElementById('storeLatitude').value = settings.storeLatitude || '';
    document.getElementById('storeLongitude').value = settings.storeLongitude || '';
    document.getElementById('storeRadius').value = settings.storeRadius || '100';
    document.getElementById('enableLocationCheck').checked = settings.enableLocationCheck === 'true';
document.getElementById('lateThreshold').value = settings.lateThreshold || '15';
    document.getElementById('earlyThreshold').value = settings.earlyThreshold || '15';
    document.getElementById('enableAlerts').checked = settings.enableAlerts === 'true';
    // 第二打卡位置
    document.getElementById('storeAddress2').value = settings.storeAddress2 || '';
    document.getElementById('storeLatitude2').value = settings.storeLatitude2 || '';
    document.getElementById('storeLongitude2').value = settings.storeLongitude2 || '';
    document.getElementById('storeRadius2').value = settings.storeRadius2 || '100';
    document.getElementById('enableLocation2').checked = settings.enableLocation2 === 'true';

  } catch (error) {
    console.error('載入設定錯誤:', error);
    showSettingsMessage('載入設定失敗：' + error.message, 'error');
  }
}

// Save system settings
async function saveSettings() {
  const btn = document.getElementById('saveSettingsBtn');
  const originalHTML = btn ? btn.innerHTML : null;

  // 按鈕 loading 狀態
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 儲存中…';
    btn.style.background = 'linear-gradient(135deg, #aaa, #888)';
  }

  try {
    // 收集表單資料
    const settings = {
      storeAddress: document.getElementById('storeAddress').value,
      storeLatitude: document.getElementById('storeLatitude').value,
      storeLongitude: document.getElementById('storeLongitude').value,
      storeRadius: document.getElementById('storeRadius').value,
      enableLocationCheck: document.getElementById('enableLocationCheck').checked ? 'true' : 'false',
lateThreshold: document.getElementById('lateThreshold').value,
      earlyThreshold: document.getElementById('earlyThreshold').value,
      enableAlerts: document.getElementById('enableAlerts').checked ? 'true' : 'false',
      // 第二打卡位置
      storeAddress2: document.getElementById('storeAddress2').value,
      storeLatitude2: document.getElementById('storeLatitude2').value,
      storeLongitude2: document.getElementById('storeLongitude2').value,
      storeRadius2: document.getElementById('storeRadius2').value,
      enableLocation2: document.getElementById('enableLocation2').checked ? 'true' : 'false',
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

    // 按鈕成功狀態
    if (btn) {
      btn.innerHTML = '<i class="fas fa-check"></i> 儲存成功！';
      btn.style.background = 'linear-gradient(135deg, #34C759, #28a745)';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
        btn.disabled = false;
      }, 2000);
    }

    // 1 秒後重新載入設定（讓勾勾反映最新狀態）
    setTimeout(() => loadSettings(), 1000);

  } catch (error) {
    console.error('儲存設定錯誤:', error);
    showSettingsMessage('❌ ' + error.message, 'error');
    showToast('儲存失敗', 'error');

    // 按鈕錯誤狀態，恢復
    if (btn) {
      btn.innerHTML = '<i class="fas fa-times"></i> 儲存失敗';
      btn.style.background = 'linear-gradient(135deg, #FF3B30, #c0392b)';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
        btn.disabled = false;
      }, 2000);
    }
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
window.addEventListener('load', initAdmin);
