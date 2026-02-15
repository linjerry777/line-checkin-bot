# 🔐 LINE Login Channel + LIFF 設定指南

## 📋 為什麼要用 LINE Login Channel？

LINE 官方政策變更：
- ❌ 不再建議在 Messaging API Channel 建立 LIFF
- ✅ 推薦使用 LINE Login Channel 建立 LIFF
- ✅ 未來 LIFF 會整合到 LINE MINI App

---

## 🎯 Step 1: 建立 LINE Login Channel

### 1.1 前往 LINE Developers Console

1. 前往：https://developers.line.biz/console/
2. 選擇你的 **Provider**（應該已經有了）

### 1.2 建立 LINE Login Channel

1. 點選「Create a new channel」
2. 選擇 **「LINE Login」**
3. 填寫以下資訊：

#### 基本設定

| 欄位 | 填入內容 |
|------|---------|
| **Channel type** | LINE Login |
| **Provider** | 選擇你現有的 Provider |
| **Company or owner's country or region** | Taiwan |
| **Channel icon** | 上傳一個圖示（選用，可以用你的店家 Logo） |
| **Channel name** | `打卡系統` 或你喜歡的名稱 |
| **Channel description** | `員工打卡系統` |
| **App types** | ✅ Web app |
| **Email address** | 你的 email |
| **Privacy policy URL** | （可選，沒有可以留空） |
| **Terms of use URL** | （可選，沒有可以留空） |

4. 同意條款
5. 點選「Create」

---

## 🎯 Step 2: 建立 LIFF App

建立 LINE Login Channel 後：

1. 進入剛建立的 **LINE Login Channel**
2. 左側選單點選 **「LIFF」**
3. 點選 **「Add」**
4. 填寫以下資訊：

| 欄位 | 填入內容 |
|------|---------|
| **LIFF app name** | `打卡系統` |
| **Size** | `Full` (全螢幕) |
| **Endpoint URL** | `https://line-checkin-bot-one.vercel.app/liff/checkin.html` |
| **Scope** | ✅ `profile` (必選)<br>✅ `openid` (建議)<br>⚪ `email` (不需要) |
| **Bot link feature** | `On (Normal)` |
| **Scan QR** | `Off` (不需要) |
| **Module mode** | `Off` (不需要) |

5. 點選 **「Add」**

---

## 🎯 Step 3: 取得 LIFF ID

建立完成後，你會看到 **LIFF ID**，格式像：
```
1234567890-AbCdEfGh
```

**📝 複製並保存這個 LIFF ID！**
2009133831-iwiCoMdy
---

## 🎯 Step 4: 連結 Messaging API Channel（重要！）

為了讓 LIFF 和你的 LINE Bot 互通，需要連結：

### 4.1 在 LINE Login Channel 設定

1. 在你的 **LINE Login Channel** 頁面
2. 點選上方的 **「Linked OA」** 分頁
3. 點選 **「Link」**
4. 選擇你的 **Messaging API Channel**（LINE Bot）
5. 確認連結

### 4.2 確認連結成功

- 你應該會看到你的 Messaging API Channel 名稱顯示在 Linked OA 列表中
- ✅ 這樣 LIFF 就能和 LINE Bot 互通了！

---

## 🎯 Step 5: 設定環境變數

### 5.1 本地環境

編輯 `.env`，加入：
```env
LIFF_ID=你的LIFF_ID
```

### 5.2 Vercel 環境

```bash
vercel env add LIFF_ID production
```

然後貼上你的 LIFF ID。

---

## 🎯 Step 6: 更新 LIFF 程式碼

需要把 `checkin.js` 中的 LIFF ID 更新為你的 LIFF ID。

我們有兩種方式：

### 方式 1: 直接寫在程式碼（簡單）

修改 `public/liff/checkin.js`：
```javascript
const LIFF_ID = '你的LIFF_ID'; // 貼上你的 LIFF ID
```

### 方式 2: 從伺服器取得（推薦，但需要額外 API）

建立一個 API 端點來提供 LIFF ID，避免寫死在前端。

---

## 🎯 Step 7: 測試 LIFF App

### 測試方式 1: 直接開啟 LIFF URL

```
https://liff.line.me/你的LIFF_ID
```

在手機 LINE 中開啟這個網址。

### 測試方式 2: 在 LINE Bot 中加入連結

讓 Bot 回覆 LIFF 連結，使用者點擊後就會開啟 LIFF 網頁。

---

## 📊 LINE Login vs Messaging API

| 功能 | LINE Login Channel | Messaging API Channel |
|------|-------------------|----------------------|
| LIFF | ✅ 推薦 | ⚠️ 舊方式（仍可用） |
| LINE Login | ✅ 支援 | ❌ 不支援 |
| 發送訊息 | ❌ 不支援 | ✅ 支援 |
| Webhook | ❌ 不支援 | ✅ 支援 |
| 用途 | 網頁登入、LIFF | Bot 聊天、推播 |

**重點**：
- **LINE Login Channel** → 專門給 LIFF 用
- **Messaging API Channel** → 專門給 Bot 用
- 兩者可以**連結**，讓 LIFF 和 Bot 互通！

---

## 🎉 完成後你會有

1. ✅ LINE Login Channel（用來放 LIFF）
2. ✅ Messaging API Channel（你的 LINE Bot）
3. ✅ LIFF App（網頁打卡介面）
4. ✅ 兩者已連結（資料互通）

---

## ❓ 常見問題

### Q: 我需要兩個 Channel 嗎？

**A:** 是的！
- **Messaging API Channel** = LINE Bot（聊天、推播）
- **LINE Login Channel** = LIFF（網頁介面）
- 透過「Linked OA」連結起來

### Q: 使用者需要加兩個好友嗎？

**A:** 不用！使用者只需要加 **Messaging API Channel**（LINE Bot）為好友。
- LIFF 會自動繼承 Bot 的好友關係（透過 Linked OA）

### Q: 我可以不用 LINE Login Channel 嗎？

**A:** 可以，但不建議：
- 舊的 Messaging API Channel 仍然可以建立 LIFF
- 但 LINE 官方已不推薦
- 未來可能會移除這個功能

---

## 🔗 相關文件

- [LINE Login 官方文件](https://developers.line.biz/en/docs/line-login/)
- [LIFF 官方文件](https://developers.line.biz/en/docs/liff/)
- [Linked OA 說明](https://developers.line.biz/en/docs/line-login/link-a-bot/)

---

**下一步**：建立完 LINE Login Channel 和 LIFF 後，告訴我你的 LIFF ID！
