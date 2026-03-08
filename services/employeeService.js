const { getSheetData, appendToSheet, updateSheetData } = require('../config/googleSheets');

/**
 * 員工管理服務 - 使用 Google Sheets 儲存
 * 工作表名稱：員工資料
 * 欄位：A=userId, B=name, C=lineDisplayName, D=registeredAt, E=status, F=role, G=weeklySchedule(JSON)
 *
 * weeklySchedule JSON 格式：
 *   {"0":"","1":"09:00-18:00","2":"09:00-18:00","3":"09:00-18:00","4":"09:00-18:00","5":"09:00-18:00","6":""}
 *   key 0=週日, 1=週一, …, 6=週六；value "HH:MM-HH:MM" 為上班，"" 為休假
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
    const employees = await getSheetData('員工資料!A:G');
    if (!employees || employees.length <= 1) return null;

    for (let i = 1; i < employees.length; i++) {
      const row = employees[i];
      if (row[0] === userId) {
        return {
          userId:          row[0],
          name:            row[1],
          lineDisplayName: row[2],
          registeredAt:    row[3],
          status:          row[4] || 'active',
          role:            row[5] || 'employee',
          weeklySchedule:  parseSchedule(row[6]),
        };
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
    const employees = await getSheetData('員工資料!A:G');
    if (!employees || employees.length <= 1) return [];

    return employees.slice(1).map(row => ({
      userId:          row[0],
      name:            row[1],
      lineDisplayName: row[2],
      registeredAt:    row[3],
      status:          row[4] || 'active',
      role:            row[5] || 'employee',
      weeklySchedule:  parseSchedule(row[6]),
    }));
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
    const employees = await getSheetData('員工資料!A:G');
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

module.exports = {
  registerEmployee,
  getEmployeeByUserId,
  getAllEmployees,
  updateEmployeeSchedule,
  getEmployeeTodayShift,
  // Keep old name as alias for backward compat during transition
  updateEmployeeShift: updateEmployeeSchedule,
};
