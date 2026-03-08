const { getSheetData, appendToSheet, updateSheetData } = require('../config/googleSheets');

// Normalize Sheets time value to "HH:MM" string
function normTime(val) {
  if (!val) return '';
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
  return '';
}

/**
 * 員工管理服務 - 使用 Google Sheets 儲存
 * 工作表名稱：員工資料
 */

/**
 * 註冊新員工
 */
async function registerEmployee(userId, name, lineDisplayName) {
  try {
    // 檢查是否已註冊
    const existingEmployee = await getEmployeeByUserId(userId);
    if (existingEmployee) {
      return {
        success: false,
        error: '此帳號已註冊',
        employee: existingEmployee,
      };
    }

    // 新增員工資料
    const row = [
      userId,
      name,
      lineDisplayName,
      new Date().toISOString(), // 註冊時間
      'active', // 狀態
    ];

    await appendToSheet(row, '員工資料!A:E');

    console.log(`✅ 新員工註冊: ${name} (${userId})`);

    return {
      success: true,
      employee: {
        userId,
        name,
        lineDisplayName,
      },
    };
  } catch (error) {
    console.error('註冊員工錯誤:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 根據 LINE User ID 取得員工資料
 */
async function getEmployeeByUserId(userId) {
  try {
    const employees = await getSheetData('員工資料!A:H');

    if (!employees || employees.length <= 1) {
      // 只有標題列或沒資料
      return null;
    }

    // 跳過標題列，尋找符合的員工
    for (let i = 1; i < employees.length; i++) {
      const row = employees[i];
      if (row[0] === userId) {
        return {
          userId: row[0],
          name: row[1],
          lineDisplayName: row[2],
          registeredAt: row[3],
          status: row[4] || 'active',
          role: row[5] || 'employee',
          shiftStart: normTime(row[6]),
          shiftEnd: normTime(row[7]),
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
    const employees = await getSheetData('員工資料!A:H');

    if (!employees || employees.length <= 1) {
      return [];
    }

    // 轉換成物件陣列（跳過標題列）
    return employees.slice(1).map(row => ({
      userId: row[0],
      name: row[1],
      lineDisplayName: row[2],
      registeredAt: row[3],
      status: row[4] || 'active',
      role: row[5] || 'employee',
      shiftStart: normTime(row[6]),
      shiftEnd: normTime(row[7]),
    }));
  } catch (error) {
    console.error('取得員工列表錯誤:', error);
    return [];
  }
}

/**
 * 更新員工班別時間
 */
async function updateEmployeeShift(userId, shiftStart, shiftEnd) {
  try {
    const employees = await getSheetData('員工資料!A:H');
    if (!employees || employees.length <= 1) {
      return { success: false, error: '找不到員工' };
    }
    for (let i = 1; i < employees.length; i++) {
      if (employees[i][0] === userId) {
        // Row i in array = row i+1 in sheet (1-indexed, +1 for header)
        await updateSheetData(`員工資料!G${i + 1}:H${i + 1}`, [shiftStart || '', shiftEnd || '']);
        return { success: true };
      }
    }
    return { success: false, error: '找不到員工' };
  } catch (error) {
    console.error('更新班別錯誤:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  registerEmployee,
  getEmployeeByUserId,
  getAllEmployees,
  updateEmployeeShift,
};
