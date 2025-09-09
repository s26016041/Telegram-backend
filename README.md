# Telegram Bot Backend

一個簡單的 Telegram 群組廣播與統計後端。提供 API 廣播訊息到已加入的群組，並記錄各廣播主題的次數。保留結構以利未來擴充（例如整合 Line Bot）。

## 功能概述
- 加入 / 離開群組事件偵測並同步保存
- HTTP 廣播（發送文字給所有已紀錄群組）
- 廣播次數統計與查詢 `/broadcast`
- 重置統計 `/remake_broadcast`
- Google Cloud Storage 同步 `TGGroups.json`
- 避免重複 polling（409 防護）

## 指令
| 指令 | 說明 |
|------|------|
| /broadcast | 查看所有廣播主題統計 |
| /remake_broadcast | 清空廣播統計 |

## 資料格式 (TGGroups.json)
```json
{
  "groups": [ { "id": -123456789 } ],
  "Broadcasts": [ { "name": "案例A", "quantity": 3 } ]
}
```

## 簡易流程
1. 啟動時下載並載入 `TGGroups.json`
2. 監聽群組事件與指令
3. 廣播 API 發送 → 更新統計 → 上傳 GCS

## 目錄摘要
```
src/
  index.ts              # 進入點
  appContext/           # 建立應用上下文
  control/TGBot/        # Telegram Bot 邏輯
  control/broadcast/    # 廣播 API
  class/cloudStorage/   # GCS 操作
  domain/               # 型別定義
TGGroups.json           # 群組與統計資料
```

## 環境變數 (.env)
以下為程式實際使用到的環境變數：

必填 (執行必要)：
- TELEGRAM_BOT_TOKEN : Telegram Bot Token，用於啟動並驗證機器人。
- GCS_BUCKET : 用於儲存 `TGGroups.json` 的 Google Cloud Storage bucket 名稱。

二選一 (擇一方式提供 GCP 認證)：
- GOOGLE_APPLICATION_CREDENTIALS : 指向 GCP Service Account JSON 檔案的路徑 (部署時常用)。
- GCP_KEY_B64 : 將 Service Account JSON 內容做 base64 編碼字串（若啟用 `LOCAL_RUN=true` 會自動解碼還原為 `gcp-key.json` 並設置前者環境變數）。

選用 / 未來擴充 (目前程式中僅部分檔案引用或預留)：
- LINE_CHANNEL_ID : Line Bot Channel ID（尚未在現行流程中使用）。
- LINE_CHANNEL_SECRET : Line Bot Channel Secret（建立 Line Bot client 時需要）。
- LINE_CHANNEL_ACCESS_TOKEN : Line Bot Access Token（建立 Line Bot client 時需要）。

本地開發輔助：
- LOCAL_RUN=true : 啟動時會載入 .env 並嘗試從 GCP_KEY_B64 還原金鑰檔案。

## 免責聲明
本專案按「現狀」提供，不保證適用性、可用性或安全性。使用者需自行評估風險：
- 請勿直接存放敏感或個資內容。
- 若因使用本程式造成資料遺失、服務中斷或其他損失，作者不負任何責任。
- 第三方服務（Telegram / Google Cloud）政策或介面變動導致之問題，需自行調整程式碼。
- 建議於生產環境加入權限控管、錯誤追蹤及備援機制。