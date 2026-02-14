require('dotenv').config();
const employeeService = require('./services/employeeService');

async function testEmployeeService() {
  console.log('🧪 測試員工服務...\n');

  try {
    // Test 1: 註冊新員工
    console.log('Test 1: 註冊新員工');
    const result1 = await employeeService.registerEmployee(
      'TEST_USER_123',
      '測試員工A',
      'Test User A'
    );
    console.log('結果:', result1);
    console.log('');

    // Test 2: 重複註冊（應該失敗）
    console.log('Test 2: 重複註冊（應該回傳已註冊）');
    const result2 = await employeeService.registerEmployee(
      'TEST_USER_123',
      '測試員工A',
      'Test User A'
    );
    console.log('結果:', result2);
    console.log('');

    // Test 3: 取得員工資料
    console.log('Test 3: 取得員工資料');
    const employee = await employeeService.getEmployeeByUserId('TEST_USER_123');
    console.log('結果:', employee);
    console.log('');

    // Test 4: 取得所有員工
    console.log('Test 4: 取得所有員工列表');
    const allEmployees = await employeeService.getAllEmployees();
    console.log('結果:', allEmployees);
    console.log('');

    console.log('✅ 所有測試完成！');
    console.log('\n📊 請檢查 Google Sheets 的「員工資料」工作表，應該會看到測試資料。');

  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

testEmployeeService();
