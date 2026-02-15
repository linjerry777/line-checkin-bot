# 📱 選項 A 新功能說明

## 🎉 已完成功能

### 1. 📱 Rich Menu（圖形化選單）

**功能說明：**
在 LINE 聊天室下方顯示圖形化按鈕選單，讓員工快速存取各項功能。

**選單配置：**
```
┌─────────┬─────────┬─────────┐
│  打卡   │ 本月工時 │ 查詢紀錄 │
├─────────┴─────────┴─────────┤
│   管理員後台   │   使用說明   │
└────────────────┴────────────┘
```

**設定步驟：**

1. 執行設定腳本：
   ```bash
   cd C:\Users\User\Documents\GitHub\LINE_CHECKIN
   node scripts/setup-rich-menu.js
   ```

2. 建立 Rich Menu 圖片：
   - 尺寸：2500 x 1686 px
   - 格式：PNG 或 JPG
   - 按照上方配置設計按鈕區域

3. 上傳圖片（腳本會提供指令）

**注意：**
- Rich Menu 需要手動建立圖片
- 可以使用 Canva、Photoshop 等工具設計
- 建議使用清晰的圖示和文字標示

---

### 2. 📊 本月工時查詢

**使用方式：**
在 LINE 聊天室輸入以下任一指令：
- `本月工時`
- `工時`
- `統計`

**顯示內容：**
```
📊 啊瘦 本月統計
━━━━━━━━━━━━━━━

📅 出勤天數：12 天
⏱️  總工時：96 小時
📈 平均工時：8.0 小時/天
✅ 完整出勤：10 天

💡 點選下方選單可查看詳細資料
```

**計算邏輯：**
- **出勤天數**：本月有打卡紀錄的天數
- **總工時**：所有完整上下班日的工作時數總和
- **平均工時**：總工時 ÷ 完整出勤天數
- **完整出勤**：同時有上班和下班打卡的天數

---

### 3. ⏰ 遲到早退統計（管理員專用）

**API 端點：**
```
GET /api/admin?action=late-early-stats&userId={管理員ID}&month={YYYY-MM}
```

**查詢參數：**
- `userId`：管理員的 LINE User ID（必填）
- `month`：查詢月份，格式 YYYY-MM（選填，預設當月）
- `workStartTime`：標準上班時間（選填，預設 09:00）
- `workEndTime`：標準下班時間（選填，預設 18:00）

**回應格式：**
```json
{
  "success": true,
  "employees": [
    {
      "userId": "Uc6c1...",
      "name": "啊瘦",
      "totalDays": 12,
      "lateCount": 3,
      "earlyCount": 1,
      "lateRate": "25.0",
      "earlyRate": "8.3",
      "lateDays": [
        { "date": "2026-02-10", "time": "09:15:00" },
        { "date": "2026-02-12", "time": "09:30:00" }
      ],
      "earlyDays": [
        { "date": "2026-02-15", "time": "17:45:00" }
      ]
    }
  ],
  "summary": {
    "total": 50,
    "lateCount": 12,
    "earlyCount": 5
  },
  "settings": {
    "workStartTime": "09:00",
    "workEndTime": "18:00"
  }
}
```

**計算規則：**
- **遲到**：上班打卡時間 > 標準上班時間
- **早退**：下班打卡時間 < 標準下班時間
- **遲到率** = 遲到次數 ÷ 出勤天數 × 100%
- **早退率** = 早退次數 ÷ 出勤天數 × 100%

**使用範例：**
```javascript
// 查詢 2026 年 2 月的遲到早退統計（標準時間 9:00-18:00）
fetch('/api/admin?action=late-early-stats&userId=Uc6c1...&month=2026-02')

// 查詢 2026 年 1 月的統計（自訂時間 8:30-17:30）
fetch('/api/admin?action=late-early-stats&userId=Uc6c1...&month=2026-01&workStartTime=08:30&workEndTime=17:30')
```

---

### 4. 🏆 工時排行榜（管理員專用）

**API 端點：**
```
GET /api/admin?action=hours-ranking&userId={管理員ID}&month={YYYY-MM}
```

**查詢參數：**
- `userId`：管理員的 LINE User ID（必填）
- `month`：查詢月份，格式 YYYY-MM（選填，預設當月）

**回應格式：**
```json
{
  "success": true,
  "month": "2026-02",
  "ranking": [
    {
      "userId": "Uc6c1...",
      "name": "啊瘦",
      "totalHours": "96.5",
      "workDays": 12,
      "avgHours": "8.0"
    },
    {
      "userId": "Uc7d2...",
      "name": "阿肥",
      "totalHours": "88.0",
      "workDays": 11,
      "avgHours": "8.0"
    }
  ]
}
```

**排序：** 依總工時由高到低

---

## 🎯 使用場景

### 場景 1：員工查詢本月工時
```
員工：本月工時
系統：📊 啊瘦 本月統計
      出勤天數：12 天
      總工時：96 小時
      平均工時：8.0 小時/天
```

### 場景 2：管理員查看遲到統計
管理員在後台可以：
1. 查看哪些員工經常遲到
2. 分析遲到的具體日期和時間
3. 計算遲到率作為考核參考

### 場景 3：工時排行激勵
管理員可以：
1. 查看工時排行榜
2. 表揚工作認真的員工
3. 分析平均工時是否合理

---

## 📝 下一步建議

### 可以在管理員後台加入：

1. **遲到早退統計頁面**
   - 新增「統計」分頁
   - 顯示遲到早退排行
   - 可選擇月份和設定標準時間

2. **工時排行榜頁面**
   - 顯示本月工時排名
   - 圖表呈現

3. **Rich Menu 圖片**
   - 設計專業的選單圖片
   - 上傳到 LINE

---

## 🔧 設定說明

### 修改標準上下班時間

如果你的公司不是 9:00-18:00，可以在查詢時指定：

```javascript
// API 查詢時指定
const response = await fetch(
  '/api/admin?action=late-early-stats' +
  '&userId=Uc6c1...' +
  '&workStartTime=08:30' +  // 早上 8:30 上班
  '&workEndTime=17:30'      // 下午 5:30 下班
);
```

未來可以在管理員後台新增「設定」頁面，讓管理員直接在介面設定。

---

## ✅ 功能檢查清單

- [x] LINE Bot 本月工時查詢指令
- [x] 遲到早退統計 API
- [x] 工時排行榜 API
- [x] Rich Menu 設定腳本
- [ ] Rich Menu 圖片設計與上傳
- [ ] 管理員後台統計頁面（前端 UI）
- [ ] 設定頁面（可調整標準時間）

---

**目前狀態：** 後端 API 已完成，可以立即使用！前端 UI 可以後續加入。
