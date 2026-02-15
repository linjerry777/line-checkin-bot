# ⏰ 定時打卡提醒設定指南

## 📋 功能說明

系統會在每天固定時間自動推送打卡提醒給所有活躍員工：

- **早上提醒**：每天早上 9:00（台北時間）
- **下班提醒**：每天下午 18:00（台北時間）

### 早上提醒訊息
- 推送時間：每天 09:00
- 提醒內容：上班打卡提醒
- 特色：顯示當前時間
- 按鈕：「立即打卡」（開啟 LIFF）

### 下班提醒訊息
- 推送時間：每天 18:00
- 提醒內容：下班打卡提醒
- 智能判斷：
  - ✅ 已上班打卡但未下班打卡的員工才會收到
  - ⏭️  沒有上班打卡的員工不會收到下班提醒
  - ⏭️  已經下班打卡的員工不會收到重複提醒
- 特色：顯示今日工作時數
- 按鈕：「下班打卡」（開啟 LIFF）

---

## 🔧 設定步驟

### 1. 設定 CRON_SECRET 環境變數（安全性）

為了防止未經授權的 Cron 請求，需要設定一個密鑰：

```bash
# 生成隨機密鑰（可以用任何隨機字串）
openssl rand -hex 32

# 或使用簡單的字串
echo "your-secret-key-here"
```

然後在 Vercel 設定環境變數：

```bash
vercel env add CRON_SECRET production
# 貼上你生成的密鑰
```

### 2. 部署到 Vercel

```bash
vercel --prod
```

### 3. Vercel Cron Jobs 會自動啟用

Vercel 會自動偵測 `vercel.json` 中的 `crons` 設定並啟用定時任務。

---

## ⏰ Cron 排程時間說明

在 `vercel.json` 中的設定：

```json
{
  "crons": [
    {
      "path": "/api/cron/morning-reminder",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/evening-reminder",
      "schedule": "0 10 * * *"
    }
  ]
}
```

### Cron 時間格式

```
0 1 * * *
│ │ │ │ │
│ │ │ │ └─ 星期幾 (0-6, 0=星期日)
│ │ │ └─── 月份 (1-12)
│ │ └───── 日期 (1-31)
│ └─────── 小時 (0-23, UTC 時區)
└───────── 分鐘 (0-59)
```

**重要：Vercel Cron 使用 UTC 時區！**

- 台北時間（UTC+8）= UTC 時間 + 8 小時
- 早上 09:00 台北時間 = 01:00 UTC → `0 1 * * *`
- 下午 18:00 台北時間 = 10:00 UTC → `0 10 * * *`

### 如何修改提醒時間

如果要改成其他時間，例如：

**早上 08:00 提醒：**
```json
"schedule": "0 0 * * *"  // 08:00 台北 = 00:00 UTC
```

**中午 12:00 提醒：**
```json
"schedule": "0 4 * * *"  // 12:00 台北 = 04:00 UTC
```

**下午 17:30 提醒：**
```json
"schedule": "30 9 * * *"  // 17:30 台北 = 09:30 UTC
```

**只在平日（週一到週五）提醒：**
```json
"schedule": "0 1 * * 1-5"  // 週一到週五早上 9:00
```

---

## 🧪 測試提醒功能

在部署完成後，可以手動測試提醒是否正常：

### 測試早上提醒

```bash
curl "https://line-checkin-bot-one.vercel.app/api/test-reminder?type=morning"
```

或在瀏覽器開啟：
```
https://line-checkin-bot-one.vercel.app/api/test-reminder?type=morning
```

### 測試下班提醒

```bash
curl "https://line-checkin-bot-one.vercel.app/api/test-reminder?type=evening"
```

或在瀏覽器開啟：
```
https://line-checkin-bot-one.vercel.app/api/test-reminder?type=evening
```

**注意**：測試端點會立即推送訊息給所有活躍員工，請謹慎使用！

---

## 📊 查看 Cron 執行記錄

1. 前往 Vercel 專案頁面
2. 點選 "Deployments"
3. 點選任一部署記錄
4. 查看 "Functions" 分頁
5. 找到 `/api/cron/morning-reminder` 或 `/api/cron/evening-reminder`
6. 查看執行日誌

---

## ⚠️ 常見問題

### Q1: 員工沒有收到提醒？

**檢查清單：**
1. 確認員工已經註冊（在 Google Sheets「員工資料」中存在）
2. 確認員工狀態為 `active`
3. 檢查 Vercel Functions 執行日誌
4. 確認 LINE_CHANNEL_ACCESS_TOKEN 正確
5. 確認 LIFF_ID 環境變數已設定

### Q2: 提醒時間不準確？

- Vercel Cron 使用 UTC 時區
- 重新計算時間：台北時間 - 8 小時 = UTC 時間
- 修改 `vercel.json` 後需要重新部署

### Q3: 想暫停某位員工的提醒？

在 Google Sheets「員工資料」中，將該員工的 `status` 欄位改為 `inactive`

### Q4: 如何完全停用提醒功能？

1. 編輯 `vercel.json`，移除或註解掉 `crons` 區塊
2. 重新部署：`vercel --prod`

---

## 🎯 進階設定

### 自訂提醒訊息

編輯以下檔案來修改訊息內容：
- `api/cron/morning-reminder.js` - 早上提醒
- `api/cron/evening-reminder.js` - 下班提醒

### 新增更多提醒時段

在 `vercel.json` 中新增：

```json
{
  "crons": [
    {
      "path": "/api/cron/morning-reminder",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/noon-reminder",
      "schedule": "0 4 * * *"
    },
    {
      "path": "/api/cron/evening-reminder",
      "schedule": "0 10 * * *"
    }
  ]
}
```

然後建立對應的 API 檔案：`api/cron/noon-reminder.js`

---

## 📝 注意事項

1. **Vercel Cron 限制**：
   - 免費方案：每天最多 100 次 Cron 執行
   - Pro 方案：無限制

2. **LINE Messaging API 限制**：
   - 免費方案：每月 500 則推送訊息
   - 超過需要付費方案

3. **時區問題**：
   - 一定要記得 Vercel 使用 UTC 時區
   - 台灣是 UTC+8

4. **安全性**：
   - 務必設定 CRON_SECRET 防止未授權請求
   - 不要將密鑰提交到 Git

---

## ✅ 完成確認

- [ ] CRON_SECRET 已設定
- [ ] LIFF_ID 已設定
- [ ] vercel.json 已更新
- [ ] 已部署到 Vercel
- [ ] 測試端點運作正常
- [ ] 員工成功收到測試訊息
- [ ] 檢查 Vercel Functions 日誌

---

**完成後，系統將每天自動推送打卡提醒給員工！** 🎉
