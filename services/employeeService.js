const { getSheetData, appendToSheet, updateSheetData } = require('../config/googleSheets');

/**
 * 員工管理服務 - 使用 Google Sheets 儲存
 * 工作表名稱：員工資料
 * 欄位：A=userId, B=name, C=lineDisplayName, D=registeredAt, E=status, F=role,
 *       G=weeklySchedule(JSON), H=salaryType(monthly/hourly), I=salaryAmount(數字), J=insurance(勞健保月扣),
 *       K=annualLeaveStartDate, L=annualLeaveGrantDays, M=annualLeaveRemainingDays
 *
 * weeklySchedule JSON 格式：
 *   {"0":"","1":"09:00-18:00","2":"09:00-18:00","3":"09:00-18:00","4":"09:00-18:00","5":"09:00-18:00","6":""}
 *   key 0=週日, 1=週一, …, 6=週六；value "HH:MM-HH:MM" 為上班，"" 為休假
 * salaryType: "monthly"=月薪, "hourly"=時薪, ""=未設定
 * salaryAmount: 月薪金額 或 時薪金額（數字）
 */

/**
 * 解析 Google Sheets 中的週班表 JSON
 */
function parseSchedule(val) {
  if (!val) return {};
  const str = String(val).trim();
  if (!str || str === '{}') return {};
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return {};
}

function normalizeDateString(value) {
  const str = String(value || '').trim();
  if (!str) return '';
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return '';
}

function normalizeNonNegativeNumber(value) {
  const num = parseFloat(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100) / 100;
}

function getTodayDateString() {
  const now = new Date();
  const taiwanNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const yyyy = taiwanNow.getFullYear();
  const mm = String(taiwanNow.getMonth() + 1).padStart(2, '0');
  const dd = String(taiwanNow.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function calculateNextAnnualLeaveGrantDate(startDate, today = getTodayDateString()) {
  const normalizedStart = normalizeDateString(startDate);
  const normalizedToday = normalizeDateString(today);
  if (!normalizedStart || !normalizedToday) return '';

  const [, startMonth, startDay] = normalizedStart.split('-');
  const todayYear = parseInt(normalizedToday.slice(0, 4), 10);
  let candidate = `${todayYear}-${startMonth}-${startDay}`;
  if (candidate <= normalizedToday) {
    candidate = `${todayYear + 1}-${startMonth}-${startDay}`;
  }
  return candidate < normalizedStart ? normalizedStart : candidate;
}

function normalizeAnnualLeaveSettings(settings = {}, today = getTodayDateString()) {
  const annualLeaveStartDate = normalizeDateString(settings.annualLeaveStartDate);
  const annualLeaveGrantDays = normalizeNonNegativeNumber(settings.annualLeaveGrantDays);
  const annualLeaveRemainingDays = normalizeNonNegativeNumber(settings.annualLeaveRemainingDays);

  return {
    annualLeaveStartDate,
    annualLeaveGrantDays,
    annualLeaveRemainingDays,
    annualLeaveNextGrantDate: annualLeaveStartDate
      ? calculateNextAnnualLeaveGrantDate(annualLeaveStartDate, today)
      : '',
  };
}

function rowToEmployee(row) {
  const annualLeave = normalizeAnnualLeaveSettings({
    annualLeaveStartDate: row[10],
    annualLeaveGrantDays: row[11],
    annualLeaveRemainingDays: row[12],
  });

  return {
    userId:          row[0],
    name:            row[1],
    lineDisplayName: row[2],
    registeredAt:    row[3],
    status:          row[4] || 'active',
    role:            row[5] || 'employee',
    weeklySchedule:  parseSchedule(row[6]),
    salaryType:      row[7] || '',
    salaryAmount:    parseFloat(row[8]) || 0,
    insurance:       parseFloat(row[9]) || 0,
    ...annualLeave,
  };
}

/**
 * 取得員工今天（台灣時區）的班別
 * @returns { start, end } 或 null（今天休假）或 { hasSchedule: false }（未設定週班表）
 */
function getEmployeeTodayShift(employee) {
  const schedule = employee.weeklySchedule;
  if (!schedule || Object.keys(schedule).length === 0) {
    return { hasSchedule: false }; // 未設定→使用全域預設
  }
  const now = new Date();
  const taiwanNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const dayKey = String(taiwanNow.getDay()); // 0=Sun,1=Mon,...,6=Sat
  const val = schedule[dayKey];
  if (!val) return null; // 今天休假
  const [start, end] = val.split('-');
  return (start && end) ? { start, end, hasSchedule: true } : null;
}

/**
 * 註冊新員工
 */
async function registerEmployee(userId, name, lineDisplayName) {
  try {
    const existingEmployee = await getEmployeeByUserId(userId);
    if (existingEmployee) {
      return { success: false, error: '此帳號已註冊', employee: existingEmployee };
    }

    const row = [
      userId,
      name,
      lineDisplayName,
      new Date().toISOString(),
      'active',
    ];

    await appendToSheet(row, '員工資料!A:E');
    console.log(`✅ 新員工註冊: ${name} (${userId})`);

    return { success: true, employee: { userId, name, lineDisplayName } };
  } catch (error) {
    console.error('註冊員工錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 根據 LINE User ID 取得員工資料
 */
async function getEmployeeByUserId(userId) {
  try {
    const employees = await getSheetData('員工資料!A:M');
    if (!employees || employees.length <= 1) return null;

    for (let i = 1; i < employees.length; i++) {
      const row = employees[i];
      if (row[0] === userId) {
        return rowToEmployee(row);
      }
    }
    return null;
  } catch (error) {
    console.error('取得員工資料錯誤:', error);
    return null;
  }
}

/**
 * 取得所有員工列表
 */
async function getAllEmployees() {
  try {
    const employees = await getSheetData('員工資料!A:M');
    if (!employees || employees.length <= 1) return [];

    return employees.slice(1).map(rowToEmployee);
  } catch (error) {
    console.error('取得員工列表錯誤:', error);
    return [];
  }
}

/**
 * 更新員工週班表（將 JSON 存入 G 欄）
 */
async function updateEmployeeSchedule(userId, scheduleJSON) {
  try {
    const employees = await getSheetData('員工資料!A:M');
    if (!employees || employees.length <= 1) {
      return { success: false, error: '找不到員工' };
    }
    for (let i = 1; i < employees.length; i++) {
      if (employees[i][0] === userId) {
        await updateSheetData(`員工資料!G${i + 1}`, [scheduleJSON || '{}']);
        return { success: true };
      }
    }
    return { success: false, error: '找不到員工' };
  } catch (error) {
    console.error('更新週班表錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新員工勞健保月扣（J=insurance）
 */
async function updateEmployeeInsurance(userId, insurance) {
  try {
    const employees = await getSheetData('員工資料!A:M');
    if (!employees || employees.length <= 1) return { success: false, error: '找不到員工' };
    for (let i = 1; i < employees.length; i++) {
      if (employees[i][0] === userId) {
        await updateSheetData(`員工資料!J${i + 1}`, [String(insurance || 0)]);
        return { success: true };
      }
    }
    return { success: false, error: '找不到員工' };
  } catch (error) {
    console.error('更新勞健保錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新員工薪資設定（H=salaryType, I=salaryAmount）
 */
async function updateEmployeeSalary(userId, salaryType, salaryAmount) {
  try {
    const employees = await getSheetData('員工資料!A:M');
    if (!employees || employees.length <= 1) {
      return { success: false, error: '找不到員工' };
    }
    for (let i = 1; i < employees.length; i++) {
      if (employees[i][0] === userId) {
        await updateSheetData(`員工資料!H${i + 1}:I${i + 1}`, [salaryType || '', String(salaryAmount || 0)]);
        return { success: true };
      }
    }
    return { success: false, error: '找不到員工' };
  } catch (error) {
    console.error('更新薪資設定錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新員工特休設定（K=起算日, L=每年給假天數, M=剩餘天數）
 */
async function updateEmployeeAnnualLeave(userId, settings) {
  try {
    const employees = await getSheetData('員工資料!A:M');
    if (!employees || employees.length <= 1) {
      return { success: false, error: '找不到員工' };
    }

    const normalized = normalizeAnnualLeaveSettings(settings);
    for (let i = 1; i < employees.length; i++) {
      if (employees[i][0] === userId) {
        await updateSheetData(`員工資料!K${i + 1}:M${i + 1}`, [
          normalized.annualLeaveStartDate,
          String(normalized.annualLeaveGrantDays),
          String(normalized.annualLeaveRemainingDays),
        ]);
        return { success: true };
      }
    }
    return { success: false, error: '找不到員工' };
  } catch (error) {
    console.error('更新特休設定錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 員工自行申請加入（status = pending）
 * 管理員後台審核後再啟用
 */
async function applyEmployee(userId, lineDisplayName) {
  try {
    const existing = await getEmployeeByUserId(userId);
    if (existing) {
      return { success: false, error: existing.status === 'pending' ? '申請已送出，等待管理員審核' : '此帳號已存在' };
    }
    const row = [userId, '', lineDisplayName, new Date().toISOString(), 'pending', '', '{}'];
    await appendToSheet(row, '員工資料!A:G');
    return { success: true };
  } catch (error) {
    console.error('申請員工錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 管理員新增員工（直接 active，指定姓名）
 */
async function adminAddEmployee(userId, name, lineDisplayName) {
  try {
    const existing = await getEmployeeByUserId(userId);
    if (existing) {
      return { success: false, error: existing.status === 'pending' ? 'pending' : '此帳號已存在' };
    }
    const row = [userId, name, lineDisplayName || '', new Date().toISOString(), 'active', '', '{}'];
    await appendToSheet(row, '員工資料!A:G');
    return { success: true };
  } catch (error) {
    console.error('管理員新增員工錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 管理員啟用 pending 員工（設名稱 + status → active）
 */
async function activateEmployee(userId, name) {
  try {
    const employees = await getSheetData('員工資料!A:G');
    if (!employees || employees.length <= 1) return { success: false, error: '找不到員工' };
    for (let i = 1; i < employees.length; i++) {
      if (employees[i][0] === userId) {
        await updateSheetData(`員工資料!B${i + 1}`, [name]);
        await updateSheetData(`員工資料!E${i + 1}`, ['active']);
        return { success: true };
      }
    }
    return { success: false, error: '找不到員工' };
  } catch (error) {
    console.error('啟用員工錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新員工姓名（B 欄）
 */
async function updateEmployeeName(userId, name) {
  if (!name || !name.trim()) return { success: false, error: '名稱不能為空' };
  try {
    const employees = await getSheetData('員工資料!A:M');
    if (!employees || employees.length <= 1) return { success: false, error: '找不到員工' };
    for (let i = 1; i < employees.length; i++) {
      if (employees[i][0] === userId) {
        await updateSheetData(`員工資料!B${i + 1}`, [name.trim()]);
        return { success: true };
      }
    }
    return { success: false, error: '找不到員工' };
  } catch (error) {
    console.error('更新員工姓名錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新員工狀態（active / inactive / resigned）
 */
async function updateEmployeeStatus(userId, status) {
  const allowed = ['active', 'inactive', 'resigned'];
  if (!allowed.includes(status)) return { success: false, error: '無效的狀態值' };
  try {
    const employees = await getSheetData('員工資料!A:M');
    if (!employees || employees.length <= 1) return { success: false, error: '找不到員工' };
    for (let i = 1; i < employees.length; i++) {
      if (employees[i][0] === userId) {
        await updateSheetData(`員工資料!E${i + 1}`, [status]);
        return { success: true };
      }
    }
    return { success: false, error: '找不到員工' };
  } catch (error) {
    console.error('更新員工狀態錯誤:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 取得所有 pending 員工
 */
async function getPendingEmployees() {
  try {
    const all = await getAllEmployees();
    return all.filter(e => e.status === 'pending');
  } catch (error) {
    console.error('取得待審核員工錯誤:', error);
    return [];
  }
}

module.exports = {
  registerEmployee,
  applyEmployee,
  adminAddEmployee,
  activateEmployee,
  getPendingEmployees,
  getEmployeeByUserId,
  getAllEmployees,
  updateEmployeeSchedule,
  updateEmployeeSalary,
  updateEmployeeInsurance,
  updateEmployeeAnnualLeave,
  updateEmployeeStatus,
  updateEmployeeName,
  getEmployeeTodayShift,
  calculateNextAnnualLeaveGrantDate,
  normalizeAnnualLeaveSettings,
  updateEmployeeShift: updateEmployeeSchedule,
};
