# Slides Meets Gamma ✦

**每個人都有一份 deck 可以介紹自己。**
Every attendee gets a three-card deck introducing who they should meet.

一個給 Gamma 社群活動用的配對小工具：參加者填 90 秒（名字 + 一句話 + 三個軸），
拿到一份三張卡的迷你 deck —— 每張卡介紹一位「今天值得認識的人」，附上理由、不確定性，
以及一句可以直接開口的第一句。雙方都按下「想認識」之後，聯絡方式才會出現。

---

## Quick start

```sh
npm start          # → http://localhost:8080
npm test           # 28 項煙霧測試 + Gamma 授權、金鑰清理、前端狀態與資料儲存測試（不呼叫付費 API）
```

零依賴、零 build step、Node ≥ 22。`npm install` 不需要跑。

---

## 核心流程

| 步驟 | 說明 |
|---|---|
| 1. 參加 | 名字 + 一句話 + 意圖（找靈感／找合作／找同好）+ 三軸（在做什麼／deck 品味／想聊什麼） |
| 2. 配對 | 意圖必須相同才進同一個池；三軸加權排序（在做什麼 ×3、想聊什麼 ×3、deck 品味 ×2） |
| 3. 你的 deck | 3 張卡：TA 是誰 → 為什麼是 TA → 第一句怎麼說。永遠附「不確定性」說明，永遠不顯示相容度分數 |
| 4. 想認識 | 送出後是 Pending；對方也按下「想認識」，**兩邊都同意**才交換聯絡方式 |
| 5. 共同 deck | 雙方同意後，可選用 Gamma Public API 產出一份真的 4 張卡簡報 |

**兩種資料池不混用**：`現場參加`（live）只跟真人配對，`我先試玩`（demo）只跟 8 位虛構角色配對。
主辦方可以先在 demo 模式排演流程，再切到 live 開場。

---

## 隱私設計

- 聯絡方式（LINE ID / Email / 桌號）**在雙方同意前不會出現在任何 API 回應裡**（有測試守著這條）
- 伺服器不收 email、不驗證年齡、不抓社群帳號
- 隨時可以「暫停被配對」或「刪掉我的全部資料」（連同相關介紹一起刪）
- demo cast 全是虛構角色，沒有真人資料

> 這是 prototype 級的同意控制（token-based、session-bound），不是身分驗證。
> 現場活動用足夠；要上公開網路，建議再加上速率限制與正式登入。

---

## 環境變數

| 變數 | 預設 | 說明 |
|---|---|---|
| `PORT` | `8080` | 服務埠 |
| `EVENT_ID` / `EVENT_NAME` / `EVENT_NAME_ZH` / `EVENT_DATE` | Gamma Community Exclusive | 活動資訊（顯示在頁面上） |
| `BRIEF_SIZE` | `3` | 每份 brief 回幾張卡 |
| `DATA_FILE` | `data/attendees.json` | 資料檔位置（測試時可指到別處） |
| `SCOUT_API_KEY` | — | 有值則啟用 live scout（OpenAI-compatible），沒有就用腳本化配對 |
| `SCOUT_BASE_URL` | `https://api.openai.com/v1` | 任何 OpenAI 相容端點都能用 |
| `SCOUT_MODEL` | `gpt-4o-mini` | live scout 模型 |
| `GAMMA_API_KEY` | — | 伺服器端預設的 Gamma key（也可用者在介面貼自己的） |

配對理由會標明是 `SCRIPTED SCOUT` 還是 `LIVE SCOUT` —— 現場不用怕被問「這是真的 AI 嗎」。

### 選用：真的產出 Gamma deck

雙方同意後，在「介紹」頁按「✦ 用 Gamma 做一份你們的共同 deck」：

1. 貼上你自己的 `sk-gamma-…` API key（經本站伺服器轉送給 Gamma；暫存在伺服器記憶體中供產出者查詢進度，不寫進資料檔。30 分鐘後失效，背景每分鐘清理；任一參加者刪除資料時也會清除）
2. 按「產生共同 deck」→ 呼叫 `POST https://public-api.gamma.app/v1.0/generations`
   （`textMode: preserve`、`format: presentation`、`numCards: 4`、`exportAs: pdf`）
3. 前端輪詢狀態，完成且取得 HTTPS 網址後才顯示 deck 連結。同一分頁同時只送出一筆產出請求；關閉面板不會取消 Gamma 已收到的產出或退回點數。
4. 貼上的金鑰送出後即從輸入欄位清除；刪除參加資料或離開頁面時，清除前端 Gamma 狀態並停止查詢。若連線中斷或結果不明，先到 Gamma 確認再重送，避免重複消耗點數。

這項防重複保護限於同一分頁，不是伺服器端的跨分頁去重或退款保證。

**這會消耗你帳號的 Gamma credits，需要 Pro 以上方案。** 工具不會自動重試，也不會要求任何人付款。

---

## 視覺：Gamma Public Brand Book

| 項目 | 用法 |
|---|---|
| 色票 | 官方 12 色：Sparkling White / Moonbeam / Glacier / Periwinkle / Sky / Ultramarine / Deep Ocean / Deep Space / Flamingo / Bordeaux / Rocket Fire / Evergreen（`public/styles.css` 的 `:root`） |
| 字體 | 品牌指定 **ES Build**（標題）與 **PP Mori**（內文），兩者皆需向 foundry 申請。此處以 Outfit（幾何圓角，貼近 Bauhaus set）+ Inter 代替 —— 拿到授權後改 `--font-display` / `--font-body` 即可 |
| Art direction | **Surreal Pointillism**：藍天、點描紋理、單一主體、畫面破框 |
| Brand elements | Abstract Cards（歪斜卡片）、Logo border、漂浮卡片 |
| Mascot | 三眼貓 **Mr. Peepers**（Gamma 官方 mascot） |
| 字標 | `public/assets/gamma-wordmark.png` 取自 Gamma Public Brand Book |

**油畫插畫（4+1 張）** —— 由 Murphy（GPT personal agent，Astra base）依 `public/assets/IMAGE-BRIEF.md` 生成：

| 檔案 | 用途 |
|---|---|
| `peepers-sky.jpg` | 首頁 hero 主視圖 |
| `peepers-portrait.jpg` | Peepers 頭像：首頁對話框、deck 提醒、present 模式角落 |
| `abstract-cards.jpg` | 卡片 01 插畫、present 模式背景、deck 封面紋理 |
| `mushroom-cloud.jpg` | 卡片 02 插畫 |
| `jellyfish-stars.jpg` | 卡片 03 插畫 |

手寫 inline SVG（`public/art.js`）保留為**圖檔載入失敗時的 fallback**（三眼貓、水母、蘑菇、點描紋理 —— 零生成成本）。

> Gamma 的名稱、字標與 mascot 屬 Gamma 所有。本工具是社群自製的 ambassador 專案，不是 Gamma 官方產品。

---

## 專案結構

```
server.mjs              zero-dep HTTP server：配對、同意、隱私、Gamma API
data/catalog.js         意圖 + 三個軸的選項（想改題目改這裡）
data/demo-cast.js       8 位虛構角色
data/matching.js        配對引擎：加權、理由、開場白
public/index.html       外殼
public/styles.css       設計系統
public/app.js           畫面與互動
public/art.js           手繪 SVG 插畫（圖檔 fallback）
public/assets/          油畫插畫、官方字標、圖像需求單
scripts/smoke.mjs       端到端煙霧測試
```

## 部署

Render 一鍵：

```sh
git push && # Render Dashboard → New → Blueprint → 選這個 repo → Apply
```

或任何能跑 Node 的地方（Fly.io、Railway、VPS）。`render.yaml` 已備好。
資料寫在 `data/attendees.json`，部署在 ephemeral filesystem 的話請自行掛 volume 或改接資料庫。

## API（給想串別的東西的人）

```
GET    /api/event                    活動設定 + 目錄 + 現場人數
POST   /api/join                     建立參加者 → { id, token, profile }
GET    /api/me                       我的資料（需 token）
DELETE /api/me                       刪掉我
POST   /api/me/status                暫停／恢復被配對
GET    /api/brief                    我的 3 張卡
POST   /api/interest                 送出「想認識」
GET    /api/intros                   介紹列表（含同意狀態）
POST   /api/interest/:id/respond     接受／婉拒
POST   /api/gamma/deck               產出共同 deck（需要 key）
GET    /api/gamma/status/:id         輪詢產出狀態
```

## 參考與致謝

- [Coffee Meets Codex](https://github.com/andydrewie/coffee-meets-codex) — 意圖分流、two-yes consent、「reasons + uncertainty + opener」、demo 與 live 分流
- [Music Meets Alexa](https://github.com/Crystal32378/music-meets-alexa) — 零依賴 Node server 路線、fictional cast、明確標示 scripted vs live
- [Gamma Public Brand Book](https://brand.gamma.app/) — 色票、字體邏輯、Surreal Pointillism、Abstract Cards
- [Gamma Generate API](https://developers.gamma.app) — 共同 deck 的產生方式

MIT License. Gamma 的名稱、字標與 mascot 屬 Gamma 所有。
