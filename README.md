# LINE 打卡系統

簡易的 LINE Official Account 員工打卡系統

## 功能

- ✅ 員工透過 LINE 註冊
- ✅ 上下班打卡功能
- ✅ 打卡紀錄自動儲存到 Google Sheets
- 🔄 WiFi 驗證（後續功能）

## 安裝步驟

### 1. 安裝相依套件

```bash
npm install
```

### 2. 設定 LINE Bot

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 建立 Provider（如果還沒有）
3. 建立 Messaging API Channel
4. 取得以下資訊：
   - Channel Access Token
   - Channel Secret

### 3. 設定 Google Sheets

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案
3. 啟用 Google Sheets API
4. 建立 Service Account
5. 下載 JSON 金鑰，重新命名為 `google-credentials.json`
6. 建立 Google Sheet，並將 Service Account 的 email 加入共用權限（編輯者）

### 4. 設定環境變數

複製 `.env.example` 為 `.env`，並填入相關資訊：

```bash
cp .env.example .env
```

### 5. 啟動伺服器

```bash
npm start
```

開發模式（自動重啟）：

```bash
npm run dev
```

### 6. 設定 Webhook URL

使用 ngrok 建立公開 URL（測試用）：

```bash
ngrok http 3000
```

將 ngrok 提供的 HTTPS URL 加上 `/webhook` 設定到 LINE Developers Console 的 Webhook URL

例如：`https://xxxx-xx-xx-xx-xx.ngrok-free.app/webhook`

## 使用方式

### 員工註冊
發送：`註冊 [姓名]`
例如：`註冊 王小明`

### 上班打卡
發送：`上班` 或 `打卡`

### 下班打卡
發送：`下班`

### 查詢今日紀錄
發送：`查詢`

## 專案結構

```
LINE_CHECKIN/
├── index.js              # 主程式
├── config/
│   └── googleSheets.js   # Google Sheets 設定
├── controllers/
│   └── lineBot.js        # LINE Bot 邏輯
├── services/
│   └── attendanceService.js  # 打卡服務
├── utils/
│   └── timeHelper.js     # 時間處理工具
├── .env                  # 環境變數（請勿上傳）
├── .env.example          # 環境變數範例
├── package.json
└── README.md
```

## 開發進度

- [x] 基本專案架構
- [ ] LINE Bot Echo 功能
- [ ] Google Sheets 連接
- [ ] 員工註冊功能
- [ ] 打卡功能
- [ ] WiFi 驗證功能
