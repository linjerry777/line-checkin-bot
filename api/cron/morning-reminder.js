// Morning Check-in Reminder (每天早上 9:00)
const { getAllEmployees } = require('../../services/employeeService');
const { pushMessage } = require('../../utils/lineMessaging');

module.exports = async (req, res) => {
  // 驗證 Vercel Cron secret（安全性）
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('⏰ 執行早上打卡提醒...');

    // 取得所有活躍員工
    const employees = await getAllEmployees();
    const activeEmployees = employees.filter(emp => emp.status === 'active');

    console.log(`📋 找到 ${activeEmployees.length} 位活躍員工`);

    // 推送提醒訊息給每位員工
    const results = await Promise.allSettled(
      activeEmployees.map(async (employee) => {
        const message = {
          type: 'flex',
          altText: '早安！該上班打卡囉 ☀️',
          contents: {
            type: 'bubble',
            hero: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '☀️',
                  size: '4xl',
                  align: 'center',
                  margin: 'md'
                }
              ],
              backgroundColor: '#FFE5B4',
              paddingAll: '20px'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `早安，${employee.name}！`,
                  weight: 'bold',
                  size: 'xl',
                  margin: 'md'
                },
                {
                  type: 'text',
                  text: '新的一天開始了，別忘了打卡喔！',
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
                          color: '#06C755',
                          align: 'end',
                          weight: 'bold'
                        }
                      ]
                    }
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
                    label: '🟢 立即打卡',
                    uri: `https://liff.line.me/${process.env.LIFF_ID}`
                  },
                  color: '#06C755'
                },
                {
                  type: 'button',
                  style: 'link',
                  height: 'sm',
                  action: {
                    type: 'message',
                    label: '稍後提醒我',
                    text: '稍後提醒'
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
      message: '早上打卡提醒已推送',
      stats: { successful, failed, total: activeEmployees.length }
    });

  } catch (error) {
    console.error('❌ 推送提醒失敗:', error);
    res.status(500).json({ error: error.message });
  }
};
