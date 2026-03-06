// Evening Check-out Reminder (每天下午 18:00)
const { getAllEmployees } = require('../../services/employeeService');
const { getSheetData } = require('../../config/googleSheets');
const { pushMessage } = require('../../utils/lineMessaging');
const { getAllSettings } = require('../../services/settingsService');

module.exports = async (req, res) => {
  // 驗證 Vercel Cron secret（安全性）
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('⏰ 執行下班打卡提醒...');

    // 檢查是否啟用提醒功能
    const settings = await getAllSettings();
    if (settings.enableReminders !== 'true') {
      console.log('⚠️  提醒功能已停用，跳過推送');
      return res.status(200).json({
        success: true,
        message: '提醒功能已停用',
        skipped: true
      });
    }

    // 取得所有活躍員工
    const employees = await getAllEmployees();
    const activeEmployees = employees.filter(emp => emp.status === 'active');

    // 取得今日打卡紀錄
    const today = new Date().toISOString().split('T')[0];
    const records = await getSheetData('打卡紀錄!A:G');

    console.log(`📋 找到 ${activeEmployees.length} 位活躍員工`);

    // 推送提醒訊息給每位員工
    const results = await Promise.allSettled(
      activeEmployees.map(async (employee) => {
        // 檢查今天是否已經上班打卡
        const todayRecords = records
          .slice(1) // 跳過標題列
          .filter(row => row[0] === employee.userId && row[3] === today);

        const hasCheckedIn = todayRecords.some(row => row[2] === 'in');
        const hasCheckedOut = todayRecords.some(row => row[2] === 'out');

        // 如果今天沒有上班打卡，就不提醒下班
        if (!hasCheckedIn) {
          console.log(`⏭️  ${employee.name} 今天沒有上班打卡，跳過下班提醒`);
          return { success: true, skipped: true, employee: employee.name };
        }

        // 如果已經下班打卡，也跳過
        if (hasCheckedOut) {
          console.log(`✅ ${employee.name} 已經下班打卡，跳過提醒`);
          return { success: true, skipped: true, employee: employee.name };
        }

        // 計算今天的工作時數
        const checkinRecord = todayRecords.find(row => row[2] === 'in');
        const checkinTime = checkinRecord ? checkinRecord[4] : null;

        let workHours = '';
        if (checkinTime) {
          // 正規化時間格式：單位數小時 "0:11:14" → "00:11:14"
          const tp = checkinTime.split(':');
          const normalizedTime = [
            tp[0].padStart(2, '0'),
            (tp[1] || '00').padStart(2, '0'),
            (tp[2] || '00').padStart(2, '0')
          ].join(':');
          const checkinDate = new Date(`${today}T${normalizedTime}`);
          const now = new Date();
          const diffMs = now - checkinDate;
          if (!isNaN(diffMs) && diffMs > 0) {
            const hours = Math.floor(diffMs / 1000 / 60 / 60);
            const minutes = Math.floor((diffMs / 1000 / 60) % 60);
            workHours = `已工作 ${hours} 小時 ${minutes} 分鐘`;
          }
        }

        const message = {
          type: 'flex',
          altText: '辛苦了！該下班打卡囉 🌙',
          contents: {
            type: 'bubble',
            hero: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '🌙',
                  size: '4xl',
                  align: 'center',
                  margin: 'md'
                }
              ],
              backgroundColor: '#E6E6FA',
              paddingAll: '20px'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `辛苦了，${employee.name}！`,
                  weight: 'bold',
                  size: 'xl',
                  margin: 'md'
                },
                {
                  type: 'text',
                  text: '一天的工作結束了，記得打卡下班喔！',
                  size: 'sm',
                  color: '#666666',
                  margin: 'md',
                  wrap: true
                },
                {
                  type: 'separator',
                  margin: 'lg'
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'lg',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'box',
                      layout: 'horizontal',
                      contents: [
                        {
                          type: 'text',
                          text: '⏰',
                          size: 'sm',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: '現在時間',
                          size: 'sm',
                          color: '#666666',
                          flex: 0,
                          margin: 'sm'
                        },
                        {
                          type: 'text',
                          text: new Date().toLocaleTimeString('zh-TW', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Taipei'
                          }),
                          size: 'sm',
                          color: '#FF3B30',
                          align: 'end',
                          weight: 'bold'
                        }
                      ]
                    },
                    ...(workHours ? [{
                      type: 'box',
                      layout: 'horizontal',
                      contents: [
                        {
                          type: 'text',
                          text: '⏱️',
                          size: 'sm',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: '今日工時',
                          size: 'sm',
                          color: '#666666',
                          flex: 0,
                          margin: 'sm'
                        },
                        {
                          type: 'text',
                          text: workHours,
                          size: 'sm',
                          color: '#06C755',
                          align: 'end',
                          weight: 'bold'
                        }
                      ]
                    }] : [])
                  ]
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  height: 'sm',
                  action: {
                    type: 'uri',
                    label: '🔴 下班打卡',
                    uri: `https://liff.line.me/${process.env.LIFF_ID}`
                  },
                  color: '#FF3B30'
                },
                {
                  type: 'button',
                  style: 'link',
                  height: 'sm',
                  action: {
                    type: 'message',
                    label: '還在加班中',
                    text: '還在加班'
                  }
                }
              ],
              flex: 0
            }
          }
        };

        await pushMessage(employee.userId, message);
        console.log(`✅ 已推送提醒給 ${employee.name}`);
        return { success: true, employee: employee.name };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ 成功: ${successful}, ❌ 失敗: ${failed}`);

    res.status(200).json({
      success: true,
      message: '下班打卡提醒已推送',
      stats: { successful, failed, total: activeEmployees.length }
    });

  } catch (error) {
    console.error('❌ 推送提醒失敗:', error);
    res.status(500).json({ error: error.message });
  }
};
