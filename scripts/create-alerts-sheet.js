// 建立異常警報資料表
require('dotenv').config();
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

async function createAlertsSheet() {
  try {
    console.log('🚨 開始建立異常警報資料表...\n');

    // 初始化 Google Sheets API
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 1. 建立新的工作表
    console.log('📋 建立「異常警報」工作表...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: '異常警報',
              gridProperties: {
                rowCount: 1000,
                columnCount: 8
              }
            }
          }
        }]
      }
    });

    console.log('✅ 工作表建立成功\n');

    // 2. 設定標題列
    console.log('📝 寫入標題列...');
    const headers = [['日期', '偵測時間', '員工ID', '員工姓名', '異常類型', '嚴重程度', '訊息', '完整資料']];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: '異常警報!A1:H1',
      valueInputOption: 'RAW',
      resource: {
        values: headers
      }
    });

    console.log('✅ 標題列寫入完成\n');

    // 3. 美化表格
    console.log('🎨 美化表格...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: await getSheetId(sheets, '異常警報'),
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 1, green: 0.35, blue: 0.35 },
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
                sheetId: await getSheetId(sheets, '異常警報'),
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 1
              },
              properties: { pixelSize: 100 },
              fields: 'pixelSize'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: await getSheetId(sheets, '異常警報'),
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
                sheetId: await getSheetId(sheets, '異常警報'),
                dimension: 'COLUMNS',
                startIndex: 2,
                endIndex: 3
              },
              properties: { pixelSize: 150 },
              fields: 'pixelSize'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: await getSheetId(sheets, '異常警報'),
                dimension: 'COLUMNS',
                startIndex: 3,
                endIndex: 4
              },
              properties: { pixelSize: 100 },
              fields: 'pixelSize'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: await getSheetId(sheets, '異常警報'),
                dimension: 'COLUMNS',
                startIndex: 4,
                endIndex: 5
              },
              properties: { pixelSize: 100 },
              fields: 'pixelSize'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: await getSheetId(sheets, '異常警報'),
                dimension: 'COLUMNS',
                startIndex: 5,
                endIndex: 6
              },
              properties: { pixelSize: 100 },
              fields: 'pixelSize'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: await getSheetId(sheets, '異常警報'),
                dimension: 'COLUMNS',
                startIndex: 6,
                endIndex: 7
              },
              properties: { pixelSize: 200 },
              fields: 'pixelSize'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: await getSheetId(sheets, '異常警報'),
                dimension: 'COLUMNS',
                startIndex: 7,
                endIndex: 8
              },
              properties: { pixelSize: 300 },
              fields: 'pixelSize'
            }
          }
        ]
      }
    });

    console.log('✅ 表格美化完成\n');

    console.log('🎉 異常警報資料表建立完成！');
    console.log('\n📊 異常類型說明：');
    console.log('   ⏰ late - 遲到');
    console.log('   🏃 early - 早退');
    console.log('   ❌ missing - 未打卡');
    console.log('   🔄 duplicate - 重複打卡');
    console.log('   🌙 unusual - 非常規時間打卡\n');

    console.log('📋 嚴重程度：');
    console.log('   🔴 high - 高（需立即處理）');
    console.log('   🟡 medium - 中（需注意）');
    console.log('   🟢 low - 低（僅記錄）\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ 建立失敗:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n💡 「異常警報」工作表已存在');
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

createAlertsSheet();
