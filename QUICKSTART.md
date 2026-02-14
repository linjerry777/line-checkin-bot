# ⚡ 快速開始指南

只需 **5 分鐘** 就能讓 LINE Bot 跑起來！

## 🎯 前置作業

你需要準備：
1. ✅ LINE Official Account（免費）
2. ✅ Google 帳號（免費）
3. ✅ 安裝 Node.js 和 npm

---

## 📝 Step 1: 取得 LINE Bot 設定（3 分鐘）

### 快速步驟：

1. 前往 https://developers.line.biz/console/
2. 建立 Provider → 建立 Messaging API Channel
3. **複製兩個重要資訊**：
   - `Basic settings` → **Channel secret**
   - `Messaging API` → **Channel access token**（點 Issue 產生）
4. 在 `Messaging API` 分頁：
   - **Auto-response messages** → 設定為 Disabled
   - **Webhook** → 設定為 Enabled

✅ 完成！保存好這兩個 Token

---

## 🔧 Step 2: 設定專案（1 分鐘）

```bash
# 1. 安裝套件
npm install

# 2. 建立環境變數檔案
# 將你的 LINE Token 填入 .env 檔案
```

編輯 `.env` 檔案：
```env
LINE_CHANNEL_ACCESS_TOKEN=你的Token
LINE_CHANNEL_SECRET=你的Secret
PORT=3000
```

✅ 完成！

---

## 🚀 Step 3: 啟動並測試（1 分鐘）

### 終端機 1: 啟動伺服器
```bash
npm start
```

### 終端機 2: 啟動 ngrok（建立公開網址）
```bash
ngrok http 3000
```

複製 ngrok 提供的 **HTTPS 網址**（例如：`https://xxxx.ngrok-free.app`）

---

## 🔗 Step 4: 設定 Webhook（30 秒）

1. 回到 LINE Developers Console
2. `Messaging API` 分頁 → Webhook URL
3. 填入：`https://你的ngrok網址/webhook`
4. 點選 **Verify** 測試（應該顯示 Success）

✅ 完成！

---

## 📱 Step 5: 測試 Bot（30 秒）

1. 在 LINE Developers Console 掃描 QR Code 加入好友
2. 發送訊息測試：

```
說明
```

如果 Bot 有回應，恭喜你成功了！ 🎉

### 快速測試流程：

```
註冊 測試員工
→ 上班
→ 下班
→ 查詢
```

---

## 📊 （選用）Google Sheets 整合

如果你想要打卡紀錄自動存到 Google Sheets：

1. 參考 `SETUP_GUIDE.md` 的 Step 2
2. 下載 Google Service Account JSON
3. 在 `.env` 加入 `GOOGLE_SHEET_ID`

**不設定也沒關係**：打卡資料會儲存在伺服器記憶體中，Bot 功能完全正常運作。

---

## 🎊 完成！

現在你可以：
- ✅ 員工註冊：`註冊 [姓名]`
- ✅ 上班打卡：`上班`
- ✅ 下班打卡：`下班`
- ✅ 查詢紀錄：`查詢`

---

## ❓ 遇到問題？

### Bot 沒有回應
→ 檢查 `.env` 的 Token 是否正確
→ 確認 Webhook Verify 是否成功

### Webhook 驗證失敗
→ 確認 ngrok 和伺服器都在運行
→ 確認 URL 有加 `/webhook`

### 詳細教學
→ 查看 `SETUP_GUIDE.md`
→ 查看 `TEST.md`

---

## 🚀 下一步

- 查看 `README.md` 了解完整功能
- 查看 `SETUP_GUIDE.md` 進行完整設定
- 部署到正式伺服器（避免每次重啟 ngrok 都要換網址）

需要幫助嗎？檢查終端機的 log 訊息，通常會有提示！
