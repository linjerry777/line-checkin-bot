require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

async function checkEmployeeSheet() {
  try {
    const credentials = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '員工資料!A:E',
    });

    const data = response.data.values || [];

    console.log('📊 員工資料工作表內容：\n');
    data.forEach((row, index) => {
      console.log(`Row ${index + 1}:`);
      console.log(`  A: ${row[0] || '(空)'}`);
      console.log(`  B: ${row[1] || '(空)'}`);
      console.log(`  C: ${row[2] || '(空)'}`);
      console.log(`  D: ${row[3] || '(空)'}`);
      console.log(`  E: ${row[4] || '(空)'}`);
      console.log('');
    });

    console.log(`\n總共 ${data.length} 行`);

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
  }
}

checkEmployeeSheet();
