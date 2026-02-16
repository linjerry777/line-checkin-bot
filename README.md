# 📱 LINE 員工打卡系統

專業的 LINE Official Account 員工打卡管理系統，整合 Google Sheets、LIFF 介面、管理後台與智能提醒功能。

[![部署狀態](https://img.shields.io/badge/Vercel-已部署-success)](https://vercel.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![LINE SDK](https://img.shields.io/badge/LINE-SDK-00B900)](https://developers.line.biz)

---

## ✨ 功能特色

### 👥 **員工端功能**
- ✅ LINE 快速註冊
- ✅ 上下班打卡（GPS 位置驗證）
- ✅ 現代化 LIFF 網頁介面
  - 打卡頁面（位置驗證 + 快速打卡）
  - 日曆檢視（月曆 + 單日明細）
  - 打卡紀錄（最近 30 天）
  - 工時統計（總工時 + 日均工時）
- ✅ 本月工時查詢
- ✅ Rich Menu 快捷選單

### 🔔 **智能提醒系統**
- ⏰ 早上提醒上班打卡（每日 08:00）
- 🌙 晚上提醒下班打卡（每日 19:00）
- 🚨 異常打卡自動偵測
  - 遲到檢測（>09:00）
  - 早退檢測（<18:00）
  - 漏打卡提醒
  - 重複打卡警告
  - 異常時間打卡（凌晨/深夜）

### 👨‍💼 **管理員後台**
- 📊 員工管理（新增/修改/刪除）
- 📈 打卡統計分析
  - 遲到早退統計
  - 工時排行榜
  - 異常打卡報表
- ⚙️ 系統設定
  - 打卡時間設定
  - 位置範圍設定
  - 提醒時間設定
- 📋 報表導出（Google Sheets）

### 🔧 **技術特色**
- 🎨 專業 UI/UX 設計（Minimalism + Glassmorphism）
- 📱 響應式設計（手機/平板/桌面）
- ♿ WCAG AA 無障礙標準
- 🌐 PWA 支援（離線可用）
- ☁️ Serverless 架構（Vercel）
- 🔐 安全認證（LIFF + LINE Login）

---

## 🚀 快速開始

### 1️⃣ 環境需求

- Node.js 18+
- LINE Official Account
- Google Cloud 帳號（Google Sheets API）
- Vercel 帳號（部署用）

### 2️⃣ 安裝步驟

```bash
# 1. Clone 專案
git clone https://github.com/your-repo/line-checkin-bot.git
cd line-checkin-bot

# 2. 安裝相依套件
npm install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env 填入你的設定

# 4. 本地測試
npm run dev
```

### 3️⃣ 環境變數設定

建立 `.env` 檔案並填入以下資訊：

```env
# LINE Bot 設定
LINE_CHANNEL_ACCESS_TOKEN=你的_Channel_Access_Token
LINE_CHANNEL_SECRET=你的_Channel_Secret

# LIFF 設定
LIFF_ID=你的_LIFF_ID

# Google Sheets 設定
GOOGLE_SHEET_ID=你的_Google_Sheet_ID
GOOGLE_CREDENTIALS=你的_Service_Account_JSON

# 打卡設定
CHECKIN_LOCATION_LAT=25.033964    # 公司緯度
CHECKIN_LOCATION_LNG=121.564472   # 公司經度
CHECKIN_RADIUS=100                 # 打卡範圍（公尺）

# 管理員設定
ADMIN_USER_IDS=管理員的_LINE_User_ID

# Vercel URL
VERCEL_URL=https://your-app.vercel.app
```

---

## 📖 詳細設定指南

### 🤖 LINE Bot 設定

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 建立 Provider 和 Messaging API Channel
3. 取得 **Channel Access Token** 和 **Channel Secret**
4. 設定 Webhook URL：`https://your-domain.vercel.app/api/webhook`
5. 啟用 Webhook 並關閉「自動回應訊息」

### 📱 LIFF 應用設定

1. 在 LINE Developers Console 建立 LIFF 應用
2. 設定 Endpoint URL：`https://your-domain.vercel.app/liff/index.html`
3. 選擇 Size：`Full`
4. 啟用 `openWindow` 功能
5. 取得 **LIFF ID**

### 📊 Google Sheets 設定

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案並啟用 **Google Sheets API**
3. 建立 **Service Account** 並下載 JSON 金鑰
4. 建立 Google Sheet（包含以下工作表）：
   - `員工資料`：員工基本資料
   - `打卡紀錄`：所有打卡記錄
   - `異常紀錄`：異常打卡記錄
5. 將 Service Account 的 Email 加入 Sheet 編輯權限

### 🎨 Rich Menu 設定

```bash
# 執行 Rich Menu 設定腳本
node scripts/setup-rich-menu.js
```

Rich Menu 配置：
```
┌─────────┬─────────┬─────────┐
│  打卡   │ 本月工時 │ 查詢紀錄 │
├─────────┴─────────┴─────────┤
│   管理員後台   │   使用說明   │
└────────────────┴────────────┘
```

---

## 🔧 部署到 Vercel

### 方法 1：使用 Vercel CLI

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 部署
vercel --prod
```

### 方法 2：使用 GitHub 自動部署

1. 推送程式碼到 GitHub
2. 登入 [Vercel](https://vercel.com)
3. Import GitHub Repository
4. 設定環境變數
5. 部署完成！

### 環境變數設定

在 Vercel Dashboard 設定以下環境變數：
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `LIFF_ID`
- `GOOGLE_SHEET_ID`
- `GOOGLE_CREDENTIALS`（整個 JSON）
- `CHECKIN_LOCATION_LAT`
- `CHECKIN_LOCATION_LNG`
- `CHECKIN_RADIUS`
- `ADMIN_USER_IDS`

---

## 💻 專案結構

```
LINE_CHECKIN/
├── api/                          # Vercel Serverless Functions
│   ├── webhook.js               # LINE Webhook 處理
│   ├── checkin.js               # 打卡 API
│   ├── employee/[userId].js     # 員工資料 API
│   ├── records/[userId].js      # 打卡紀錄 API
│   ├── admin.js                 # 管理員 API
│   ├── liff-config.js           # LIFF 設定 API
│   └── cron/                    # 定時任務
│       ├── morning-reminder.js  # 早上提醒
│       ├── evening-reminder.js  # 晚上提醒
│       └── check-anomalies.js   # 異常檢測
├── public/                       # 靜態資源
│   ├── liff/                    # LIFF 應用
│   │   ├── index.html           # LIFF 主頁
│   │   └── app.js               # LIFF 邏輯
│   └── admin/                   # 管理後台
│       ├── index.html           # 後台主頁
│       └── app.js               # 後台邏輯
├── services/                     # 業務邏輯
│   ├── attendanceService.js     # 打卡服務
│   ├── employeeService.js       # 員工服務
│   ├── statsService.js          # 統計服務
│   ├── alertService.js          # 異常偵測服務
│   └── settingsService.js       # 設定服務
├── config/                       # 設定檔
│   └── googleSheets.js          # Google Sheets 設定
├── utils/                        # 工具函數
│   └── timeHelper.js            # 時間處理
├── scripts/                      # 腳本工具
│   └── setup-rich-menu.js       # Rich Menu 設定
├── vercel.json                   # Vercel 設定
├── package.json                  # 套件管理
└── README.md                     # 說明文件
```

---

## 📱 使用方式

### 員工使用

#### 1. 註冊
```
在 LINE 中輸入：註冊 [姓名]
例如：註冊 王小明
```

#### 2. 打卡
- **方式 A**：點擊 Rich Menu「打卡」按鈕
- **方式 B**：輸入指令
  ```
  上班  或  打卡  → 上班打卡
  下班           → 下班打卡
  ```

#### 3. 查詢
```
查詢        → 今日打卡紀錄
本月工時    → 本月統計資料
```

### 管理員使用

#### 訪問管理後台
```
https://your-domain.vercel.app/admin
```

#### 功能
- 📊 查看所有員工打卡狀況
- 📈 遲到早退統計分析
- 🏆 工時排行榜
- 🚨 異常打卡報表
- ⚙️ 系統參數設定

---

## 🔔 定時任務說明

### Vercel Cron Jobs

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
    },
    {
      "path": "/api/cron/check-anomalies",
      "schedule": "0 4 * * *"
    }
  ]
}
```

**注意**：Vercel Hobby 方案限制 Cron Job 為每日一次

### 時間說明（UTC+8）
- **早上提醒**：01:00 UTC = 09:00 台北時間
- **晚上提醒**：10:00 UTC = 18:00 台北時間
- **異常檢測**：04:00 UTC = 12:00 台北時間

---

## 🎨 UI/UX 設計系統

基於 **UI/UX Pro Max** 專業設計系統：

### 設計風格
- **Style**: Minimalism + Glassmorphism
- **Colors**: Dark theme (#0F172A) + Green CTA (#22C55E)
- **Typography**: Fira Sans（專業數據字體）
- **Effects**: 200ms transitions, 16px blur, subtle shadows

### 無障礙設計
- ✅ WCAG AA 標準
- ✅ 4.5:1 文字對比度
- ✅ 44x44px 最小觸控區域
- ✅ 鍵盤導航支援
- ✅ Screen Reader 友善

### 響應式斷點
- 📱 Mobile: 375px
- 📱 Tablet: 768px
- 💻 Desktop: 1024px+

---

## 🧪 測試

### 手動測試

```bash
# 測試 Webhook
curl -X POST https://your-domain.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[{"type":"message","message":{"type":"text","text":"測試"}}]}'

# 測試打卡 API
curl https://your-domain.vercel.app/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","type":"in","location":{"lat":25.033,"lng":121.564}}'
```

### 測試提醒功能

```bash
# 測試早上提醒
node api/test-reminder.js morning

# 測試晚上提醒
node api/test-reminder.js evening
```

---

## ❓ 常見問題

### Q1: LIFF 打不開或顯示錯誤？

**解決方案**：
1. 檢查 LIFF Endpoint URL 是否正確
2. 確認 `LIFF_ID` 環境變數已設定
3. 清除 LINE 快取（設定 > LINE > 清除快取）
4. 檢查 Vercel 部署狀態

### Q2: 打卡位置驗證失敗？

**解決方案**：
1. 檢查手機 GPS 定位權限
2. 確認公司座標設定正確
3. 調整 `CHECKIN_RADIUS` 範圍
4. 測試時可暫時關閉位置驗證

### Q3: Google Sheets 沒有資料？

**解決方案**：
1. 確認 Service Account 有 Sheet 編輯權限
2. 檢查 `GOOGLE_SHEET_ID` 是否正確
3. 驗證 `GOOGLE_CREDENTIALS` JSON 格式正確
4. 查看 Vercel 部署日誌（Logs）

### Q4: Cron Job 沒有執行？

**解決方案**：
1. Vercel Hobby 方案限制每日一次
2. 檢查 `vercel.json` cron 設定
3. 查看 Vercel Dashboard > Cron Jobs 狀態
4. 手動測試 API 端點是否正常

### Q5: Rich Menu 沒有顯示？

**解決方案**：
1. 執行 `node scripts/setup-rich-menu.js`
2. 上傳 Rich Menu 圖片（2500x1686px）
3. 確認 Menu 已設為預設選單
4. 重新加入 LINE Official Account

---

## 🔐 安全性建議

### 環境變數保護
- ❌ 不要將 `.env` 提交到 Git
- ✅ 使用 Vercel 環境變數功能
- ✅ 定期更換 Access Token

### API 安全
- ✅ Webhook 簽章驗證
- ✅ LIFF 用戶身份驗證
- ✅ 管理員權限檢查

### 資料保護
- ✅ Google Sheets 權限限制
- ✅ 員工資料加密傳輸
- ✅ 定期備份重要資料

---

## 📈 效能優化

### Serverless 優化
- ⚡ API Routes 使用 Edge Functions
- 📦 最小化 Bundle Size
- 🔄 適當使用快取

### LIFF 優化
- 🎨 CSS 最小化
- 📱 圖片 Lazy Loading
- ⚡ 預加載關鍵資源

---

## 🛣️ Roadmap

### ✅ 已完成
- 基礎打卡系統
- LIFF 網頁介面
- 管理後台
- 智能提醒系統
- 異常偵測
- Rich Menu

### 🚧 進行中
- 請假系統
- 排班管理

### 📋 計劃中
- 打卡照片上傳
- 多公司/部門管理
- 報表自動生成
- AI 分析功能
- WiFi/藍牙驗證
- GPS 軌跡記錄

---

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

### 開發流程
1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

---

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE) 檔案

---

## 📞 聯絡方式

- 📧 Email: your-email@example.com
- 💬 LINE: @your-line-id
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)

---

## 🙏 致謝

- [LINE Messaging API](https://developers.line.biz/)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Vercel](https://vercel.com)
- [UI/UX Pro Max Design System](https://github.com/ui-ux-pro-max)

---

<div align="center">

**⭐ 如果這個專案對你有幫助，請給個星星！**

Made with ❤️ by Your Name

_最後更新：2026-02-16_

</div>
