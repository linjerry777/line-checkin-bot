// Test reminder endpoint - 手動測試提醒功能
const { getAllEmployees } = require('../services/employeeService');
const { pushMessage } = require('../utils/lineMessaging');

module.exports = async (req, res) => {
  try {
    const { type } = req.query; // morning 或 evening

    if (!type || !['morning', 'evening'].includes(type)) {
      return res.status(400).json({
        error: '請指定提醒類型：?type=morning 或 ?type=evening'
      });
    }

    console.log(`🧪 測試 ${type} 提醒...`);

    // 取得所有活躍員工
    const employees = await getAllEmployees();
    const activeEmployees = employees.filter(emp => emp.status === 'active');

    if (activeEmployees.length === 0) {
      return res.status(200).json({
        success: true,
        message: '沒有活躍員工',
        stats: { total: 0, successful: 0, failed: 0 }
      });
    }

    console.log(`📋 找到 ${activeEmployees.length} 位活躍員工`);

    // 建立訊息
    const createMessage = (employee, type) => {
      if (type === 'morning') {
        return {
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
                  text: '🧪 這是測試訊息 - 新的一天開始了，別忘了打卡喔！',
                  size: 'sm',
                  color: '#666666',
                  margin: 'md',
                  wrap: true
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
                }
              ]
            }
          }
        };
      } else {
        return {
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
                  text: '🧪 這是測試訊息 - 一天的工作結束了，記得打卡下班喔！',
                  size: 'sm',
                  color: '#666666',
                  margin: 'md',
                  wrap: true
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
                }
              ]
            }
          }
        };
      }
    };

    // 推送提醒給每位員工
    const results = await Promise.allSettled(
      activeEmployees.map(async (employee) => {
        const message = createMessage(employee, type);
        await pushMessage(employee.userId, message);
        console.log(`✅ 已推送測試提醒給 ${employee.name}`);
        return { success: true, employee: employee.name };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ 成功: ${successful}, ❌ 失敗: ${failed}`);

    res.status(200).json({
      success: true,
      message: `${type === 'morning' ? '早上' : '下班'}打卡提醒測試已推送`,
      stats: { successful, failed, total: activeEmployees.length },
      employees: activeEmployees.map(e => ({ name: e.name, userId: e.userId }))
    });

  } catch (error) {
    console.error('❌ 測試提醒失敗:', error);
    res.status(500).json({ error: error.message });
  }
};
