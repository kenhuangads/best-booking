# 旅行預訂神器 ✈️🏨

即時搜尋**國內外機票與住宿**最低價，設定目標價後自動盯價，達標或降價時推播到 **LINE 官方帳號 / Telegram**。
介面為手機優先的 PWA，可「加入主畫面」當 App 使用；日期選擇器內建台灣國定假日與連假標示，價格以 NT$ 顯示。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkenhuangads%2Fbest-booking&project-name=best-booking&repository-name=best-booking&env=APP_PASSWORD,CRON_SECRET&envDescription=APP_PASSWORD%EF%BC%9A%E7%99%BB%E5%85%A5%E5%AF%86%E7%A2%BC%EF%BC%9BCRON_SECRET%EF%BC%9A%E5%A4%96%E9%83%A8%E6%8E%92%E7%A8%8B%E5%AF%86%E9%91%B0%EF%BC%88%E4%BB%BB%E6%84%8F%E5%AD%97%E4%B8%B2%EF%BC%89)

## 功能

- **即時比價**：機票（來回 / 單程、艙等、直飛、指定航空公司）與住宿（城市、日期、房數人數），一次看到多家航空與飯店的最低價，可依價格 / 時間 / 評分排序與篩選。
- **價格日曆**：整月每天最低票價一目瞭然，綠色標出最便宜的 25% 日期，點一下就以該日重新搜尋。
- **連假日曆**：日期選擇器標示 2026–2027 台灣國定假日與連續假期，並提供「下一個連假」一鍵選取。
- **追蹤最低價**：可追蹤整條路線 / 整個城市的最低價，也可只追蹤某家航空或某間飯店；設定目標價、降價幅度、檢查頻率（5 分鐘到每天）。
- **通訊軟體通知**：LINE 以 Flex 卡片呈現（價格、理由、航班或房型、前往預訂按鈕），Telegram 以 HTML 訊息＋按鈕；在聊天室輸入「追蹤」可直接查看清單。
- **深連結預訂**：每筆結果附 Google 航班 / Skyscanner / Trip.com（機票）與 Agoda / Booking.com / Google 飯店（住宿）的預填搜尋連結，台灣國內線另附立榮、華信官網。
- **零設定即可體驗**：未填任何 API 金鑰時使用「示範資料」（依距離、連假、航空公司類型推算並每 5 分鐘波動），追蹤與通知流程完整可用；填入 SerpApi 金鑰後改用 Google 即時價格。

## 用一個網址直接使用：部署到 Vercel（免費）

不需要信用卡，約 5 分鐘。

1. 到 [vercel.com/new](https://vercel.com/new) 用 GitHub 登入，Import 這個 repo（`kenhuangads/best-booking`），其他設定維持預設，按 **Deploy**。
   也可以按上面的「Deploy with Vercel」按鈕（會先複製一份 repo 到你的帳號）。
2. 約 2 分鐘後會得到網址，例如 `https://best-booking-xxxx.vercel.app`，手機開啟後可「加入主畫面」。
3. 到專案的 **Settings → Environment Variables** 加入，然後 **Redeploy**：

   | 變數 | 值 |
   | --- | --- |
   | `APP_PASSWORD` | 任意密碼，避免別人使用你的網址 |
   | `CRON_SECRET` | 任意字串，外部排程呼叫時使用 |
   | `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | 見下一步，讓追蹤資料永久保存 |

4. **資料庫（必要）**：Vercel 本身沒有可持久寫入的磁碟，請到 [turso.tech](https://turso.tech) 免費註冊 → Create Database（區域選 Tokyo 或 Singapore）→ 複製 **Database URL**（`libsql://…`）與 **Token**，填入上表兩個變數。沒有設定時 App 仍可搜尋，但追蹤資料會在閒置後消失（設定頁會顯示警告）。
5. **自動檢查**：Vercel 免費方案的 Cron 每天 09:00（台灣時間）檢查一次。想要更即時，到 [cron-job.org](https://cron-job.org)（免費）新增一個工作，每 5–60 分鐘呼叫
   `https://你的網址/api/cron/check?key=CRON_SECRET`。
6. 之後要接 LINE 或 Telegram，照下面兩節把變數加進 Vercel 即可；Telegram 在設定頁有「設定 Webhook」按鈕一鍵完成。

## 本機開發

```bash
npm install
npm run icons        # 產生 PWA 圖示（純 Node，無需額外套件）
cp .env.example .env # Windows 可用 copy
npm run dev
```

開啟 http://localhost:3000 。本機使用 SQLite 檔案（`data/`）與內建排程，不需要任何雲端服務。

## 環境變數

| 變數 | 說明 |
| --- | --- |
| `APP_URL` | 對外網址，通知中的「開啟追蹤清單」按鈕會用到（Vercel 可留空自動偵測；LINE 按鈕僅接受 https） |
| `APP_PASSWORD` | 設定後整個 App 需輸入密碼（HTTP Basic Auth，帳號任意）。公開部署強烈建議設定 |
| `DATABASE_PATH` | 本機 SQLite 檔案路徑，預設 `data/best-booking.db` |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Turso 雲端資料庫（設定後優先於 SQLite；Vercel 必要） |
| `FLIGHT_PROVIDER` / `HOTEL_PROVIDER` | `auto`（預設）/ `demo` / `serpapi` / `amadeus` |
| `SERPAPI_KEY` | SerpApi 金鑰，設定後改用 Google 航班 / Google 飯店即時價格 |
| `TRAVELPAYOUTS_TOKEN` / `TRAVELPAYOUTS_MARKETS` / `TRAVELPAYOUTS_MARKER` | Travelpayouts token（免費）；設定後機票追蹤與價格日曆改用 Aviasales 快取價格當雷達 |
| `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` / `AMADEUS_ENV` | 僅限已有 Amadeus 企業版者；Self-Service 已於 2026/7/17 關閉 |
| `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` / `LINE_BOT_BASIC_ID` | LINE Messaging API 設定 |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` / `TELEGRAM_POLLING` / `TELEGRAM_WEBHOOK_SECRET` | Telegram Bot 設定 |
| `SCHEDULER_ENABLED` / `CHECK_TICK_SECONDS` | 內建排程開關與掃描間隔（秒；Vercel 會自動停用） |
| `CRON_SECRET` | 外部 cron 呼叫 `/api/cron/check` 用的密鑰（Vercel Cron 自動帶入） |

## 設定 LINE 官方帳號通知

1. 到 [LINE Developers Console](https://developers.line.biz/console/) 建立 Provider 與 **Messaging API** channel（或從既有官方帳號啟用 Messaging API）。
2. 在 channel 的 **Messaging API** 分頁：
   - 發行 **Channel access token (long-lived)** → `LINE_CHANNEL_ACCESS_TOKEN`
   - **Basic settings** 分頁的 **Channel secret** → `LINE_CHANNEL_SECRET`
   - **Bot basic ID**（例如 `@123abcd`）→ `LINE_BOT_BASIC_ID`
3. **Webhook URL** 填 `https://你的網址/api/line/webhook`，開啟 **Use webhook**；並到 LINE Official Account Manager 關閉「自動回應訊息」（否則會與機器人回覆重複）。
4. 重新部署 / 啟動 App → 「設定 → 通知管道 → 連結 LINE」取得 6 碼連結碼 → 加官方帳號好友 → 在聊天室傳送連結碼即完成。多位家人可各自綁定，都會收到通知。

> 本機開發沒有 https 網址時，可用 `ngrok http 3000` 取得暫時網址填入 Webhook URL。

## 設定 Telegram 通知

1. 在 Telegram 找 **@BotFather**，`/newbot` 建立機器人，取得 token → `TELEGRAM_BOT_TOKEN`，機器人使用者名稱 → `TELEGRAM_BOT_USERNAME`。
2. 本機開發：`TELEGRAM_POLLING=true`（預設）即可，App 會主動輪詢，不需公開網址。
3. Vercel 等無伺服器環境：設定 `TELEGRAM_WEBHOOK_SECRET=任意字串`，部署後到「設定 → Telegram → 設定 Telegram Webhook 指向本站」按一次即可（等同呼叫 Telegram 的 setWebhook）。
4. 「設定 → 連結 Telegram」會產生 `t.me/<bot>?start=連結碼` 一鍵連結。

## 使用真實價格：SerpApi + Travelpayouts 各做擅長的事

Amadeus 的免費 Self-Service API 已於 2026 年 7 月 17 日關閉。目前的做法是兩個免費來源搭配：

| 工作 | 來源 | 原因 |
| --- | --- | --- |
| 搜尋結果頁、住宿、價格確認 | [SerpApi](https://serpapi.com)（Google 航班 / Google 飯店） | 真正的即時價，但免費方案每月只有約 100 次 |
| 機票追蹤盯價、價格日曆 | [Travelpayouts](https://www.travelpayouts.com)（Aviasales 快取） | 免費、每分鐘 600 次，但是過去 48 小時別人查到的價格 |

追蹤流程：Travelpayouts 每隔幾分鐘盯價，發現價格低於目標或明顯下跌，App 才花一次 SerpApi 向 Google 確認，確認是真的才通知。免費額度幾乎不會用完，通知也不會是假的。

### 設定步驟

1. **SerpApi**：到 serpapi.com 註冊，登入後在 Dashboard 複製 **Your Private API Key**，在 Vercel 新增 `SERPAPI_KEY`。
2. **Travelpayouts**：到 travelpayouts.com 註冊（選一般合作夥伴即可，不需要網站），登入後到個人資料頁的 **API token** 複製，在 Vercel 新增 `TRAVELPAYOUTS_TOKEN`。
3. Redeploy 後打開 App 的「設定」頁：機票顯示「Google 即時價格」、機票盯價雷達顯示「Aviasales 快取價格」就完成了。

### 注意事項

- 只設 SerpApi：追蹤每次檢查都耗額度，建立追蹤時預設改為 12 小時一次，且不提供價格日曆。
- 只設 Travelpayouts：搜尋結果也是快取價格（單程每天只會有一筆最低價），到達時間為估計。
- Aviasales 的快取依「市場」分，台灣出發的航線沒有專屬市場，App 會依序嘗試美國站與俄國站（`TRAVELPAYOUTS_MARKETS`）。熱門航線多半有資料，台灣國內線與冷門航線常常是空的，這時追蹤會每 12 小時改用 SerpApi 查一次。
- Travelpayouts 以美元計價，App 會用當天匯率換算成台幣（匯率來源 open.er-api.com，失敗時以 1 美元 = 32 元估算）。
- Google 航班的來回票只提供去程班次與來回總價，回程班次需在預訂網站選擇。

> 想接其他來源（例如 Ignav），只要在 `src/lib/providers/` 新增一個回傳 `FlightOffer[]` / `HotelOffer[]` 的模組，並在 `src/lib/search.ts` 掛上即可。

## 排程與通知邏輯

- 常駐伺服器（本機、Docker）啟動時會開啟內建排程，每 `CHECK_TICK_SECONDS` 秒掃描一次，只檢查到期（依各追蹤的「檢查頻率」）的項目，逐筆依序查詢以避免打爆供應商 API。
- 無伺服器環境（Vercel）自動停用內建排程，改由 Vercel Cron（每天）與外部排程（建議 cron-job.org，每 5–60 分鐘）呼叫 `GET /api/cron/check?key=CRON_SECRET`（加 `&force=1` 可強制檢查全部）。
- 通知時機：
  - 🎯 價格 ≤ 目標價
  - 📉 比上次檢查下跌 ≥ 設定幅度，或創歷史新低（可關閉）
  - 同一追蹤只有在價格比「上次通知」更低時才會再通知；價格持續達標時每 24 小時最多提醒一次，避免洗版。

## 其他部署方式（常駐伺服器 + SQLite）

### Docker / Zeabur / Railway

```bash
docker build -t best-booking .
docker run -d -p 3000:3000 -v best-booking-data:/app/data --env-file .env best-booking
```

Zeabur、Railway 等平台偵測到 Dockerfile 即可直接部署；請掛載 Volume 到 `/app/data` 保存 SQLite 資料，並把 `.env` 內容填入平台的環境變數。這種方式內建排程與 Telegram 輪詢都能運作，不需要 Turso 與外部 cron。

### 一般 Node 主機 / NAS

`npm run build && npm start`，用 pm2 或 systemd 常駐即可。SQLite 檔案在 `data/`。

## 專案結構

```
src/
  app/                 頁面（首頁搜尋、結果、追蹤、通知、設定）與 API 路由
  components/          手機優先 UI：底部分頁、Bottom Sheet、日曆、卡片…
  lib/
    airports.ts        機場資料（台灣視角分區、中文名、別名搜尋）
    cities.ts          住宿目的地（含台灣熱門景點）
    holidays.ts        台灣國定假日與連假（2026 正式、2027 預估）
    providers/         demo（示範資料）、serpapi（Google 即時價格）、travelpayouts（Aviasales 快取雷達）、amadeus（企業版）
    search.ts          供應商選擇、快取、深連結
    watcher.ts         追蹤檢查與通知判斷
    scheduler.ts       內建排程與 Telegram 輪詢（常駐環境）
    notify/            LINE Flex / Telegram 訊息
    bot.ts             LINE / Telegram 機器人指令（連結碼、追蹤清單）
    db.ts, repo.ts     資料層：SQLite（better-sqlite3）或 Turso（libSQL）
  middleware.ts        APP_PASSWORD 密碼保護
vercel.json            Vercel 區域（東京）與每日 Cron
Dockerfile             自架用
```

## 注意事項

- 本專案不代訂票，所有價格皆為查詢當下的參考值，實際以各訂購網站為準；深連結會以相同條件開啟 OTA 搜尋頁。
- 沒有帳號系統：所有追蹤與通知管道共用（適合個人 / 家庭使用）。公開部署請設定 `APP_PASSWORD`。
- 2027 年假日為依《紀念日及節日實施條例》推算，正式日期以行政院人事行政總處公告為準，可在 `src/lib/holidays.ts` 調整。
