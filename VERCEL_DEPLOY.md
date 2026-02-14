# 🚀 Vercel 部署指南

## 📋 準備工作

在部署前，請確認：
- ✅ 已有 GitHub 帳號
- ✅ 已有 Vercel 帳號（用 GitHub 登入即可）
- ✅ 已設定好 LINE Bot
- ✅ 已設定好 Google Sheets

---

## 🎯 Step 1: 將程式碼推送到 GitHub

### 1.1 初始化 Git（如果還沒做）

```bash
git init
git add .
git commit -m "Initial commit: LINE 打卡系統 Vercel 版"
```

### 1.2 在 GitHub 建立 Repository

1. 前往 https://github.com/new
2. Repository 名稱：`line-checkin-bot`（或你喜歡的名字）
3. 設定為 **Private**（因為有敏感設定）
4. 不要勾選任何初始化選項
5. 點選「Create repository」

### 1.3 推送程式碼到 GitHub

```bash
git remote add origin https://github.com/你的帳號/line-checkin-bot.git
git branch -M main
git push -u origin main
```

---

## 🚀 Step 2: 在 Vercel 部署

### 2.1 連接 GitHub

1. 前往 https://vercel.com/
2. 用 GitHub 帳號登入
3. 點選「Add New...」→「Project」
4. 找到並選擇你的 `line-checkin-bot` repository
5. 點選「Import」

### 2.2 設定環境變數

在 Vercel 的設定頁面中，點選「Environment Variables」，加入以下變數：

#### 必要變數

| Name | Value | 說明 |
|------|-------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | 你的 LINE Token | 從 LINE Developers Console 取得 |
| `LINE_CHANNEL_SECRET` | 你的 LINE Secret | 從 LINE Developers Console 取得 |
| `GOOGLE_SHEET_ID` | 你的 Google Sheet ID | 從 Google Sheets 網址取得 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | 你的 Google 憑證 JSON | ⚠️ 重要！見下方說明 |

#### 如何設定 GOOGLE_SERVICE_ACCOUNT_JSON

1. 打開 `google-credentials.json` 檔案
2. **複製整個檔案的內容**（包含大括號）
3. 貼到 Vercel 的環境變數中
4. 確認是完整的 JSON 格式

**範例格式**：
```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "...",
  ...
}
```

⚠️ **注意**：整個 JSON 要複製為「一行」，包含所有的換行符號（\n）

### 2.3 部署設定

- **Framework Preset**: Other
- **Root Directory**: `./`
- **Build Command**: （留空或 `npm run vercel-build`）
- **Output Directory**: （留空）
- **Install Command**: `npm install`

### 2.4 點選「Deploy」

等待 1-2 分鐘，Vercel 會自動部署！

---

## 🔗 Step 3: 設定 LINE Webhook URL

### 3.1 取得 Vercel 網址

部署成功後，Vercel 會給你一個網址，例如：
```
https://line-checkin-bot-你的帳號.vercel.app
```

### 3.2 更新 LINE Webhook

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Channel
3. 點選「Messaging API」分頁
4. 找到「Webhook URL」
5. 更新為：
   ```
   https://line-checkin-bot-你的帳號.vercel.app/webhook
   ```
6. 點選「Update」
7. 點選「Verify」測試（應該顯示 Success ✅）

---

## 🧪 Step 4: 測試

在 LINE 發送訊息測試：

```
說明
```

如果 Bot 有回應，恭喜你部署成功！ 🎉

---

## 📊 Google Sheets 設定

記得在 Google Sheets 建立兩個工作表：

1. **打卡紀錄** - 儲存打卡資料
2. **員工資料** - 儲存員工資料（新增！）

### 建立「員工資料」工作表

1. 打開你的 Google Sheet
2. 點選左下角「+」新增工作表
3. 命名為：`員工資料`
4. 完成！

標題列會自動產生，不用手動建立。

---

## 🔄 更新程式碼

以後如果要更新程式碼：

```bash
git add .
git commit -m "更新說明"
git push
```

Vercel 會自動偵測並重新部署！

---

## ⚙️ 環境變數管理

### 查看/修改環境變數

1. 前往 Vercel Dashboard
2. 選擇你的專案
3. 點選「Settings」→「Environment Variables」
4. 可以編輯、新增、刪除變數

⚠️ **修改環境變數後需要重新部署**

### 重新部署

1. 前往「Deployments」
2. 點選最新的部署
3. 點選「Redeploy」

或者，推送任何 commit 都會觸發重新部署。

---

## 🐛 疑難排解

### 問題 1: Webhook 驗證失敗

**檢查**：
- Vercel 網址是否正確（要加 `/webhook`）
- 環境變數是否設定正確
- 部署是否成功

### 問題 2: Bot 沒有回應

**檢查**：
1. 前往 Vercel Dashboard
2. 點選你的專案
3. 點選「Logs」查看錯誤訊息

### 問題 3: Google Sheets 寫入失敗

**檢查**：
- `GOOGLE_SERVICE_ACCOUNT_JSON` 是否完整
- Google Sheet 是否已共用給 Service Account
- 工作表名稱是否正確（「打卡紀錄」、「員工資料」）

### 查看 Logs

Vercel Dashboard → 你的專案 → Functions → 點選 `/webhook` → 查看 Logs

---

## 📈 監控

### 查看使用量

Vercel Dashboard → 你的專案 → Analytics

可以看到：
- 請求次數
- 執行時間
- 錯誤率

免費方案：
- 100,000 次請求/月
- 100GB 流量/月

6 個人的打卡系統**完全夠用**！

---

## 🎉 完成！

現在你的 LINE 打卡系統已經部署到 Vercel！

**優點**：
- ✅ 24/7 運行
- ✅ 自動擴展
- ✅ 免費額度充足
- ✅ Git push 自動部署
- ✅ 無需管理伺服器

**下一步**：
- 加入 LIFF 網頁打卡介面
- 加入 WiFi/GPS 驗證

---

**有問題隨時查看 Vercel Logs！**

前往: https://vercel.com/dashboard → 你的專案 → Functions
