# 🚀 LIFF 設定指南

## 📋 什麼是 LIFF？

**LIFF (LINE Front-end Framework)** 是 LINE 提供的網頁框架，可以：
- 在 LINE 內開啟網頁
- 取得使用者的 LINE 資料
- 存取手機的 GPS、相機等功能
- 提供更豐富的互動體驗

---

## 🎯 我們要做什麼？

建立一個網頁打卡介面，包含：
- ✅ 漂亮的打卡按鈕（上班/下班）
- ✅ GPS 定位驗證（確保在店家附近）
- ✅ 顯示今日打卡紀錄
- ✅ 顯示打卡位置地圖

---

## 📝 Step 1: 在 LINE Developers Console 建立 LIFF App

### 1.1 前往 LINE Developers Console

1. 前往：https://developers.line.biz/console/
2. 選擇你的 **Provider**
3. 選擇你的 **Channel**（Messaging API Channel）

### 1.2 建立 LIFF App

1. 點選左側選單的 **「LIFF」**
2. 點選 **「Add」** 按鈕
3. 填寫以下資訊：

| 欄位 | 填入內容 |
|------|---------|
| **LIFF app name** | `打卡系統` |
| **Size** | `Full` (全螢幕) |
| **Endpoint URL** | `https://line-checkin-bot-one.vercel.app/liff/checkin` |
| **Scope** | ✅ `profile`（必選）<br>✅ `openid`（建議） |
| **Bot link feature** | `On (Normal)` 或 `On (Aggressive)` |

4. 點選 **「Add」**

### 1.3 取得 LIFF ID

建立完成後，你會看到 **LIFF ID**，格式像：
```
1234567890-AbCdEfGh
```

**複製並保存這個 LIFF ID**，等等會用到！

---

## 🔧 Step 2: 設定環境變數

### 2.1 在 Vercel 加入 LIFF_ID

```bash
vercel env add LIFF_ID production
```

然後貼上你的 LIFF ID。

### 2.2 在本地 .env 加入

編輯 `.env` 檔案，加入：
```env
LIFF_ID=你的LIFF_ID
```

---

## 📱 Step 3: 測試 LIFF App

建立完成後，你可以：

### 方法 1: 使用 LIFF URL
```
https://liff.line.me/你的LIFF_ID
```

### 方法 2: 在 LINE Bot 加入連結
發送訊息：
```
打卡請點這裡：
https://liff.line.me/你的LIFF_ID
```

---

## ⚙️ LIFF App 設定詳解

### Size 選項

| Size | 說明 | 適用情境 |
|------|------|---------|
| **Tall** | 佔螢幕 75% | 簡單表單 |
| **Full** | 全螢幕 | 打卡系統（推薦） |
| **Compact** | 佔螢幕 50% | 小工具 |

### Scope 選項

| Scope | 說明 | 必要性 |
|-------|------|-------|
| **profile** | 取得使用者名稱、頭像 | ✅ 必要 |
| **openid** | OpenID Connect | ⚪ 建議 |
| **email** | 取得 email | ❌ 不需要 |
| **chat_message.write** | 發送訊息 | ❌ 不需要 |

### Bot link feature

| 選項 | 說明 |
|------|------|
| **On (Normal)** | LIFF 關閉後顯示 Bot 連結（推薦） |
| **On (Aggressive)** | LIFF 開啟前就顯示 Bot 連結 |
| **Off** | 不顯示 Bot 連結 |

---

## 🎉 完成！

設定完成後，你會得到：
- ✅ LIFF ID
- ✅ LIFF URL: `https://liff.line.me/你的LIFF_ID`

下一步就是建立 LIFF 網頁介面！

---

## 🔗 相關文件

- [LIFF 官方文件](https://developers.line.biz/en/docs/liff/overview/)
- [LIFF API Reference](https://developers.line.biz/en/reference/liff/)
