// 建立系統設定資料表
require('dotenv').config();
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

async function createSettingsSheet() {
  try {
    console.log('🔧 開始建立系統設定資料表...\n');

    // 初始化 Google Sheets API
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 1. 建立新的工作表
    console.log('📋 建立「系統設定」工作表...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: '系統設定',
              gridProperties: {
                rowCount: 20,
                columnCount: 3
              }
            }
          }
        }]
      }
    });

    console.log('✅ 工作表建立成功\n');

    // 2. 設定標題列
    console.log('📝 寫入設定項目...');
    const headers = [['設定項目', '數值', '說明']];

    // 3. 預設設定值
    const defaultSettings = [
      ['workStartTime', '09:00', '標準上班時間（格式：HH:MM）'],
      ['workEndTime', '18:00', '標準下班時間（格式：HH:MM）'],
      ['storeLatitude', '24.8356', '店家位置緯度'],
      ['storeLongitude', '121.0145', '店家位置經度'],
      ['storeRadius', '50000', '打卡允許範圍（公尺）'],
      ['storeAddress', '30268新竹縣竹北市縣政二路422號1樓', '店家地址'],
      ['morningReminderTime', '09:00', '早上提醒時間（格式：HH:MM）'],
      ['eveningReminderTime', '18:00', '晚上提醒時間（格式：HH:MM）'],
      ['enableReminders', 'true', '是否啟用自動提醒（true/false）'],
      ['enableLocationCheck', 'true', '是否啟用位置驗證（true/false）']
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: '系統設定!A1:C11',
      valueInputOption: 'RAW',
      resource: {
        values: [headers[0], ...defaultSettings]
      }
    });

    console.log('✅ 設定項目寫入完成\n');

    // 4. 美化表格
    console.log('🎨 美化表格...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: await getSheetId(sheets, '系統設定'),
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.6, blue: 0.86 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    fontSize: 11,
                    bold: true
                  },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: await getSheetId(sheets, '系統設定'),
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 1
              },
              properties: { pixelSize: 200 },
              fields: 'pixelSize'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: await getSheetId(sheets, '系統設定'),
                dimension: 'COLUMNS',
                startIndex: 1,
                endIndex: 2
              },
              properties: { pixelSize: 150 },
              fields: 'pixelSize'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: await getSheetId(sheets, '系統設定'),
                dimension: 'COLUMNS',
                startIndex: 2,
                endIndex: 3
              },
              properties: { pixelSize: 300 },
              fields: 'pixelSize'
            }
          }
        ]
      }
    });

    console.log('✅ 表格美化完成\n');

    console.log('🎉 系統設定資料表建立完成！');
    console.log('\n📊 已建立以下設定項目：');
    console.log('   ⏰ 上下班時間');
    console.log('   📍 店家位置與範圍');
    console.log('   🔔 提醒時間設定');
    console.log('   ⚙️  功能開關\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ 建立失敗:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n💡 「系統設定」工作表已存在');
      console.log('   如需重新建立，請先手動刪除該工作表\n');
    }

    process.exit(1);
  }
}

async function getSheetId(sheets, sheetName) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID
  });
  const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
  return sheet.properties.sheetId;
}

createSettingsSheet();
