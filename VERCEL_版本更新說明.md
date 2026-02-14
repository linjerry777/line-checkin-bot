# 🚀 Vercel Serverless 版本更新說明

## 📋 重大更新

你的 LINE 打卡系統已經升級為 **Vercel Serverless** 版本！

**版本**: v1.0.0 → v2.0.0

---

## ✨ 主要變更

### 1. 架構改變

#### 之前（v1.0.0 - Express 伺服器）
- 使用 Express 長期運行
- 員工資料存在記憶體（Map）
- 需要 ngrok 或自行架設伺服器

#### 現在（v2.0.0 - Vercel Serverless）
- 使用 Vercel Serverless Functions
- **所有資料都存在 Google Sheets**
- 部署到 Vercel 雲端平台

---

### 2. 資料儲存方式

| 資料類型 | v1.0 | v2.0 |
|---------|------|------|
| 員工資料 | 記憶體 Map | Google Sheets「員工資料」工作表 |
| 打卡紀錄 | 記憶體 Array + Google Sheets | Google Sheets「打卡紀錄」工作表 |

---

### 3. 新增檔案

```
api/
├── webhook.js       # Vercel Webhook Serverless Function
└── index.js         # Vercel 首頁 Serverless Function

services/
└── employeeService.js  # 新增：員工管理服務

config/
└── googleSheets.js  # 更新：支援讀取、寫入、更新

vercel.json          # Vercel 設定檔
VERCEL_DEPLOY.md     # Vercel 部署指南
```

---

### 4. 修改的檔案

#### `controllers/lineBot.js`
- 改用 `employeeService` 管理員工
- 不再使用記憶體 Map

#### `config/googleSheets.js`
- 新增 `getSheetData()` - 讀取 Sheet
- 新增 `updateSheetData()` - 更新 Sheet
- 支援從環境變數讀取 JSON（Vercel 用）
- 支援多工作表（打卡紀錄、員工資料）

#### `package.json`
- 版本升級到 v2.0.0
- 新增 `vercel-build` script
- 新增 Node.js 版本需求

---

## 📊 Google Sheets 結構

現在需要**兩個**工作表：

### 工作表 1: 打卡紀錄

| 日期 | 時間 | 員工姓名 | 類型 | LINE User ID | 完整時間戳記 |
|------|------|---------|------|-------------|-------------|
| ... | ... | ... | ... | ... | ... |

### 工作表 2: 員工資料（新增）

| LINE User ID | 員工姓名 | LINE 顯示名稱 | 註冊時間 | 狀態 |
|-------------|---------|--------------|---------|------|
| ... | ... | ... | ... | ... |

**請記得建立「員工資料」工作表！**

---

## 🔄 升級步驟

### 如果你還在用 v1.0（ngrok 版本）

1. ✅ 已完成程式碼更新
2. ⏳ 需要在 Google Sheets 新增「員工資料」工作表
3. ⏳ 需要重新註冊所有員工（因為之前的資料在記憶體中）
4. ⏳ 部署到 Vercel（參考 `VERCEL_DEPLOY.md`）

---

## 🧪 本地測試

### 測試員工服務

```bash
node test-employee-service.js
```

應該會看到：
- ✅ 註冊新員工
- ✅ 重複註冊檢查
- ✅ 取得員工資料
- ✅ 取得所有員工

### 測試 Google Sheets

```bash
node test-google-sheets.js
```

應該會看到：
- ✅ 成功連接到 Sheet
- ✅ 成功寫入測試資料

---

## ⚙️ 環境變數變更

### v1.0 需要的環境變數
```env
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
PORT=3000
GOOGLE_SHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_PATH=./google-credentials.json
```

### v2.0 需要的環境變數（Vercel）

**本地測試**（.env）：
```env
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
GOOGLE_SHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_PATH=./google-credentials.json
```

**Vercel 部署**（在 Vercel Dashboard 設定）：
```env
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
GOOGLE_SHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_JSON={完整的 JSON 內容}
```

**差異**：
- Vercel 不能讀取檔案，所以要用 `GOOGLE_SERVICE_ACCOUNT_JSON`
- 本地測試仍然可以用 `GOOGLE_SERVICE_ACCOUNT_PATH`

---

## 🎯 功能對照表

| 功能 | v1.0 | v2.0 | 說明 |
|------|------|------|------|
| 員工註冊 | ✅ | ✅ | v2.0 改存 Google Sheets |
| 上班打卡 | ✅ | ✅ | 功能相同 |
| 下班打卡 | ✅ | ✅ | 功能相同 |
| 查詢紀錄 | ✅ | ✅ | 功能相同 |
| 資料持久化 | ⚠️ 部分 | ✅ | v1.0 員工資料會遺失 |
| 部署方式 | ngrok/自架 | Vercel | v2.0 更簡單 |
| 24/7 運行 | ❌ | ✅ | v2.0 自動運行 |

---

## 🐛 可能的問題

### 問題 1: 員工資料不見了

**原因**: v1.0 的員工資料存在記憶體，沒有備份

**解決**: 重新請員工註冊一次（只要註冊一次，之後就會永久保存在 Google Sheets）

### 問題 2: Google Sheets 沒有「員工資料」工作表

**錯誤訊息**: `Unable to parse range: 員工資料!A:E`

**解決**:
1. 打開 Google Sheet
2. 新增工作表，命名為「員工資料」
3. 標題列會自動建立

### 問題 3: Vercel 部署後 Bot 沒回應

**檢查**:
1. Vercel Dashboard → Logs 查看錯誤
2. 確認環境變數是否都設定正確
3. 確認 LINE Webhook URL 是否正確

---

## 📈 優勢

### v2.0 相比 v1.0 的優勢

1. ✅ **資料不會遺失** - 所有資料都在 Google Sheets
2. ✅ **24/7 運行** - 不需要自己開伺服器
3. ✅ **自動擴展** - Vercel 自動處理流量
4. ✅ **免費額度充足** - 6 人團隊完全夠用
5. ✅ **自動部署** - Git push 就自動更新
6. ✅ **無需維護** - 不用管理伺服器

---

## 🚀 下一步

- [ ] 部署到 Vercel（參考 `VERCEL_DEPLOY.md`）
- [ ] 在 Google Sheets 新增「員工資料」工作表
- [ ] 測試基本功能
- [ ] 加入 LIFF 網頁打卡介面（下一階段）
- [ ] 加入 WiFi/GPS 驗證（下一階段）

---

**有問題隨時查看相關文件**：
- `VERCEL_DEPLOY.md` - Vercel 部署詳細步驟
- `ARCHITECTURE.md` - 系統架構說明
- `README.md` - 專案總覽

---

**更新日期**: 2026-02-14
**版本**: v2.0.0 (Vercel Serverless)
