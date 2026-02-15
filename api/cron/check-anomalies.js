// Check Anomalies Cron Job (每小時檢查一次異常)
const { checkTodayAnomalies } = require('../../services/alertService');
const { getAllEmployees } = require('../../services/employeeService');
const { pushMessage } = require('../../utils/lineMessaging');
const { getAllSettings } = require('../../services/settingsService');

module.exports = async (req, res) => {
  // 驗證 Vercel Cron secret（安全性）
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔍 執行異常打卡檢查...');

    // 檢查是否啟用異常警報
    const settings = await getAllSettings();
    if (settings.enableAlerts !== 'true') {
      console.log('⚠️  異常警報功能已停用，跳過檢查');
      return res.status(200).json({
        success: true,
        message: '異常警報功能已停用',
        skipped: true
      });
    }

    // 檢查今日所有異常
    const anomalies = await checkTodayAnomalies();

    console.log(`📋 找到 ${anomalies.length} 個異常`);

    if (anomalies.length === 0) {
      return res.status(200).json({
        success: true,
        message: '無異常',
        anomalies: []
      });
    }

    // 取得所有管理員
    const employees = await getAllEmployees();
    const admins = employees.filter(emp => emp.role === 'admin' && emp.status === 'active');

    if (admins.length === 0) {
      console.log('⚠️  沒有管理員可以接收通知');
      return res.status(200).json({
        success: true,
        message: '異常已記錄，但無管理員接收通知',
        anomalies
      });
    }

    // 分組異常（按嚴重程度）
    const highSeverity = anomalies.filter(a => a.severity === 'high');
    const mediumSeverity = anomalies.filter(a => a.severity === 'medium');
    const lowSeverity = anomalies.filter(a => a.severity === 'low');

    // 只推送高和中等嚴重度的異常
    const notifiableAnomalies = [...highSeverity, ...mediumSeverity];

    if (notifiableAnomalies.length === 0) {
      console.log('⚠️  只有低嚴重度異常，不推送通知');
      return res.status(200).json({
        success: true,
        message: '異常已記錄（低嚴重度，未通知）',
        anomalies
      });
    }

    // 推送通知給每位管理員
    const results = await Promise.allSettled(
      admins.map(async (admin) => {
        const message = createAlertMessage(notifiableAnomalies);
        await pushMessage(admin.userId, message);
        console.log(`✅ 已推送警報給管理員 ${admin.name}`);
        return { success: true, admin: admin.name };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ 成功: ${successful}, ❌ 失敗: ${failed}`);

    res.status(200).json({
      success: true,
      message: '異常檢查完成並已通知管理員',
      stats: {
        totalAnomalies: anomalies.length,
        high: highSeverity.length,
        medium: mediumSeverity.length,
        low: lowSeverity.length,
        notified: successful,
        failed
      }
    });

  } catch (error) {
    console.error('❌ 異常檢查失敗:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 建立警報訊息
 */
function createAlertMessage(anomalies) {
  // 按類型分組
  const byType = anomalies.reduce((acc, a) => {
    if (!acc[a.type]) acc[a.type] = [];
    acc[a.type].push(a);
    return acc;
  }, {});

  // 建立類型圖示映射
  const typeEmoji = {
    late: '⏰',
    early: '🏃',
    missing: '❌',
    duplicate: '🔄',
    unusual: '🌙'
  };

  const typeName = {
    late: '遲到',
    early: '早退',
    missing: '未打卡',
    duplicate: '重複打卡',
    unusual: '非常規時間'
  };

  // 建立 Flex Message 內容
  const contents = [];

  Object.entries(byType).forEach(([type, items]) => {
    items.forEach(item => {
      const severityColor = {
        high: '#FF3B30',
        medium: '#FF9500',
        low: '#34C759'
      }[item.severity];

      contents.push({
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: typeEmoji[type],
            size: 'lg',
            flex: 0,
            margin: 'none'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: item.employee.name,
                weight: 'bold',
                size: 'sm'
              },
              {
                type: 'text',
                text: item.message,
                size: 'xs',
                color: '#666666',
                margin: 'xs'
              }
            ],
            margin: 'sm'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: item.severity === 'high' ? '高' : '中',
                size: 'xs',
                color: severityColor,
                align: 'center',
                weight: 'bold'
              }
            ],
            backgroundColor: severityColor + '20',
            cornerRadius: '4px',
            width: '32px',
            height: '20px',
            justifyContent: 'center',
            flex: 0
          }
        ],
        margin: 'md',
        spacing: 'sm'
      });
    });
  });

  return {
    type: 'flex',
    altText: `🚨 發現 ${anomalies.length} 個異常打卡`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🚨 異常打卡警報',
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF'
          },
          {
            type: 'text',
            text: `發現 ${anomalies.length} 個異常`,
            size: 'sm',
            color: '#FFFFFF',
            margin: 'sm',
            opacity: 0.9
          }
        ],
        backgroundColor: '#FF3B30',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '異常明細',
            weight: 'bold',
            size: 'md',
            margin: 'md'
          },
          ...contents
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
              label: '查看管理後台',
              uri: `https://liff.line.me/${process.env.LIFF_ID}/admin.html`
            },
            color: '#FF3B30'
          }
        ],
        flex: 0
      }
    }
  };
}
