# 📚 LINE 打卡系統 - 完整設定教學

## 🎯 Step 1: 設定 LINE Bot

### 1.1 建立 LINE Developers 帳號

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 使用你的 LINE 帳號登入

### 1.2 建立 Provider

1. 點選「Create a new provider」
2. 輸入 Provider 名稱（例如：我的公司）
3. 點選「Create」

### 1.3 建立 Messaging API Channel

1. 在 Provider 頁面中，點選「Create a Messaging API channel」
2. 填寫以下資訊：
   - **Channel name**: LINE打卡系統（或你喜歡的名稱）
   - **Channel description**: 員工打卡系統
   - **Category**: 選擇適合的類別
   - **Subcategory**: 選擇適合的子類別
3. 同意條款後點選「Create」

### 1.4 取得 Channel Secret 和 Access Token

1. 進入剛建立的 Channel
2. 點選「Basic settings」分頁
   - 找到 **Channel secret**，點選「Show」並複製
3. 點選「Messaging API」分頁
   - 找到 **Channel access token**，點選「Issue」
   - 複製產生的 Token

### 1.5 停用自動回應訊息

1. 在「Messaging API」分頁中
2. 找到「LINE Official Account features」
3. 點選「Edit」
4. 將以下設定改為：
   - **Auto-response messages**: ❌ Disabled
   - **Greeting messages**: ❌ Disabled（可選）
   - **Webhook**: ✅ Enabled

---

## 🔧 Step 2: 設定 Google Sheets

### 2.1 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點選「建立專案」
3. 輸入專案名稱（例如：LINE打卡系統）
4. 點選「建立」

### 2.2 啟用 Google Sheets API

1. 在左側選單選擇「API 和服務」→「程式庫」
2. 搜尋「Google Sheets API」
3. 點選進入後，點選「啟用」

### 2.3 建立服務帳戶（Service Account）

1. 在左側選單選擇「API 和服務」→「憑證」
2. 點選「建立憑證」→「服務帳戶」
3. 填寫服務帳戶詳細資料：
   - **服務帳戶名稱**: line-checkin-bot
   - **服務帳戶 ID**: 自動產生
4. 點選「建立並繼續」
5. 選擇角色：「基本」→「編輯者」
6. 點選「繼續」→「完成」

### 2.4 下載服務帳戶金鑰

1. 在「憑證」頁面，找到剛建立的服務帳戶
2. 點選服務帳戶進入詳細資料
3. 點選「金鑰」分頁
4. 點選「新增金鑰」→「建立新的金鑰」
5. 選擇「JSON」格式
6. 點選「建立」，JSON 檔案會自動下載
7. **將下載的 JSON 檔案重新命名為 `google-credentials.json`**
8. **將檔案移動到專案根目錄**

### 2.5 建立 Google Sheet 並設定權限

1. 前往 [Google Sheets](https://sheets.google.com/)
2. 建立新試算表，命名為「LINE打卡紀錄」
3. 建立工作表名稱為「打卡紀錄」（在下方分頁）
4. 複製 Google Sheet 的 ID（從網址列中）
   - 網址格式：`https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - 複製 `{SHEET_ID}` 部分
   1ig8KuwFefSpDrUyLu6HwyOCFa0rKLtdpI9aV__IWCsY
5. **設定共用權限**：
   - 點選右上角「共用」按鈕
   - 貼上服務帳戶的 email（在 google-credentials.json 中的 `client_email`）
   - 權限設定為「編輯者」
   - 點選「傳送」

---

## ⚙️ Step 3: 設定專案環境變數

1. 複製 `.env.example` 為 `.env`：

```bash
cp .env.example .env
```

2. 編輯 `.env` 檔案，填入以下資訊：

```env
# LINE Bot 設定
LINE_CHANNEL_ACCESS_TOKEN=你的Channel_Access_Token
LINE_CHANNEL_SECRET=你的Channel_Secret

# Server 設定
PORT=3000

# Google Sheets 設定
GOOGLE_SHEET_ID=你的Google_Sheet_ID
GOOGLE_SERVICE_ACCOUNT_PATH=./google-credentials.json
```

---

## 🚀 Step 4: 啟動伺服器

### 4.1 安裝 ngrok（用於測試）

LINE Bot 的 Webhook 需要 HTTPS URL，所以本地測試需要使用 ngrok。

1. 下載 ngrok: [https://ngrok.com/download](https://ngrok.com/download)
2. 解壓縮並安裝

### 4.2 啟動應用程式

```bash
npm start
```

你應該會看到：

```
✅ 伺服器啟動成功！
📍 PORT: 3000
🤖 Webhook URL: http://localhost:3000/webhook

⚠️  記得使用 ngrok 建立公開 URL 並設定到 LINE Developers Console
```

### 4.3 使用 ngrok 建立公開 URL

開啟**新的終端機**，執行：

```bash
ngrok http 3000
```

你會看到類似以下的輸出：

```
Session Status                online
Forwarding                    https://xxxx-xx-xx-xx-xx.ngrok-free.app -> http://localhost:3000
```

**複製 HTTPS 的網址**（例如：`https://xxxx-xx-xx-xx-xx.ngrok-free.app`）

---

## 🔗 Step 5: 設定 LINE Bot Webhook URL

1. 回到 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Channel
3. 點選「Messaging API」分頁
4. 找到「Webhook settings」
5. 點選「Edit」
6. 輸入 Webhook URL：`https://你的ngrok網址/webhook`
   - 例如：`https://xxxx-xx-xx-xx-xx.ngrok-free.app/webhook`
7. 點選「Update」
8. 點選「Verify」測試連線（應該會顯示 Success）
9. 確認「Use webhook」已啟用 ✅

---

## 📱 Step 6: 測試 LINE Bot

### 6.1 加入 Bot 為好友

1. 在 LINE Developers Console 的「Messaging API」分頁
2. 找到「QR code」
3. 用手機 LINE 掃描 QR code 加入好友

### 6.2 測試指令

發送以下訊息測試：

1. **查看說明**
   ```
   說明
   ```

2. **註冊員工**
   ```
   註冊 王小明
   ```

   應該會回覆：
   ```
   ✅ 註冊成功！

   員工姓名：王小明

   您現在可以使用以下指令：
   • 上班 - 上班打卡
   • 下班 - 下班打卡
   • 查詢 - 查詢今日紀錄
   ```

3. **上班打卡**
   ```
   上班
   ```

4. **下班打卡**
   ```
   下班
   ```

5. **查詢紀錄**
   ```
   查詢
   ```

### 6.3 檢查 Google Sheets

打開你的 Google Sheet，應該可以看到打卡紀錄已經自動寫入！

---

## 🛠️ 疑難排解

### 問題 1: Webhook 驗證失敗

**解決方法**：
- 確認 ngrok 正在運行
- 確認伺服器正在運行（`npm start`）
- 確認 Webhook URL 格式正確（要有 `/webhook`）
- 確認使用 HTTPS（不是 HTTP）

### 問題 2: Bot 沒有回應

**解決方法**：
- 檢查終端機的 log，看是否有錯誤訊息
- 確認 `.env` 中的 `LINE_CHANNEL_ACCESS_TOKEN` 和 `LINE_CHANNEL_SECRET` 正確
- 確認 LINE 後台的「Auto-response messages」已停用

### 問題 3: Google Sheets 寫入失敗

**解決方法**：
- 確認 `google-credentials.json` 存在於專案根目錄
- 確認 Google Sheet 已共用給服務帳戶的 email
- 確認 `.env` 中的 `GOOGLE_SHEET_ID` 正確
- 確認工作表名稱為「打卡紀錄」

### 問題 4: ngrok 網址一直變動

**說明**：
- 免費版 ngrok 每次重啟都會產生新的網址
- 需要手動更新 LINE Webhook URL

**解決方法**：
- 升級 ngrok 付費版（可固定網址）
- 或部署到正式伺服器（Render、Heroku、Railway 等）

---

## 🎉 完成！

現在你已經成功建立了一個基本的 LINE 打卡系統！

下一步可以考慮：
- ✅ 加入 WiFi 驗證功能
- ✅ 加入 GPS 定位驗證
- ✅ 建立管理後台
- ✅ 部署到正式伺服器

如有任何問題，請參考 README.md 或查看程式碼註解。
