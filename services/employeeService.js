const { getSheetData, appendToSheet, updateSheetData } = require('../config/googleSheets');

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
    const employees = await getSheetData('員工資料!A:E');

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
    const employees = await getSheetData('員工資料!A:E');

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
    }));
  } catch (error) {
    console.error('取得員工列表錯誤:', error);
    return [];
  }
}

module.exports = {
  registerEmployee,
  getEmployeeByUserId,
  getAllEmployees,
};
