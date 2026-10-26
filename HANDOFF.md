# 交接 — Slides Meets Gamma

> base commit：`5fea587`（本次只補這份文件，功能沒動）
> repo：https://github.com/Crystal32378/slidesmeetgamma
> 一句話：Gamma 社群活動的配對小工具。每個人都有一份 deck 可以介紹自己。

## 分工

| 角色 | 負責 |
|---|---|
| **Space Bunny** | 視覺與互動（動態、轉場、卡片刻度、present 模式手感） |
| **Murphy** | 工程與驗收（server、API、資料、測試守門） |
| Crystal | 決策與現場 |

---

## 1. 怎麼啟動 / 測試

```sh
git clone https://github.com/Crystal32378/slidesmeetgamma.git
cd slides-meets-gamma
npm start          # → http://localhost:8080   （零依賴、零 build、Node ≥ 22）
npm test           # 20 項煙霧測試：真的開 server、真的走完流程
```

- 不用 `npm install`（沒有 dependencies）
- 資料寫在 `data/attendees.json`（已 gitignore）；測試用 `/tmp` 的一次性檔
- 常用環境變數：`PORT`、`EVENT_ID` / `EVENT_NAME` / `EVENT_NAME_ZH`、`BRIEF_SIZE`、`DATA_FILE`、`SCOUT_API_KEY`（有值＝live scout）、`SCOUT_BASE_URL`、`SCOUT_MODEL`、`GAMMA_API_KEY`
- 測試怎麼看有沒有壞：`npm test` 必須 20/20；畫面用 browser 開 `localhost:8080` 走一次 參加 → deck → 想認識 → present
- **注意**：`data/attendees.json` 與 `public/assets/*.jpg` 不要進版控以外的任何地方；前者是真人資料

## 2. 哪些是真實流程、哪些是 demo

| 項目 | 狀態 | 說明 |
|---|---|---|
| 配對（三軸 + 意圖分流） | ✅ 真實 | 規則寫死、可重現，見 `data/matching.js` |
| two-yes consent | ✅ 真實 | 雙方都同意才交換聯絡方式，**server 端強制** |
| 聯絡方式不外洩 | ✅ 真實 | 同意前任何 API 回應都不含 contact（有測試守門） |
| 刪除資料 / 暫停配對 | ✅ 真實 | `DELETE /api/me`、`POST /api/me/status` |
| live 模式（真人配對） | ✅ 真實 | 現場參加者彼此配對，資料存在活動 server |
| demo 模式 | 🎭 虛構 | 8 位虛構角色（`data/demo-cast.js`），主辦方先排演用 |
| 兩個池子 | 🚫 不混用 | demo 只看 demo cast，live 只看 live |
| scout 理由 | 📝 腳本化 | 預設規則生成，頁面上標 `SCRIPTED SCOUT`；接 `SCOUT_API_KEY` 才變 `LIVE SCOUT` |
| Gamma 共同 deck | ⚠️ 未實測 | 程式寫好了（`POST /api/gamma/deck` + 輪詢），但**從沒用真的 key 跑過**；會消耗呼叫者帳號 credits |
| 身分驗證 | ❌ 沒有 | 只有 token，不是登入。現場夠用，公開上線前要加 |

## 3. 已知未完成

1. **Gamma Public API 沒實測** —— 參數是照 developers.gamma.app 的 classic `/generations` 寫的（`inputText` / `textMode: preserve` / `format: presentation` / `numCards` / `exportAs`），但沒用真的 `sk-gamma-` key 驗證過回應格式，也沒跑過輪詢。
2. **同意機制是 prototype 級** —— session-bound token，不是身分驗證。要上公開網路得補速率限制與真正的登入。
3. **沒有 CI**（Crystal 明確說先不加）、**沒有部署**（Render 的 `render.yaml` 已備好，等 bunny 回來再說）。
4. **字體是替身** —— 品牌指定 ES Build（標題）＋ PP Mori（內文）都要向 foundry 申請；現在用 Outfit + Inter 頂著，換回來只要改 `styles.css` 的 `--font-display` / `--font-body`。
5. **可選第 5 張圖 `sky-texture.jpg`（21:9 純天空）沒生** —— 要用的話走 Murphy 產圖路徑。
6. **資料存 JSON 檔** —— 部署在 ephemeral filesystem 會掉資料，正式擺活動要掛 volume 或改接資料庫。
7. `data/catalog.js` 的選項（意圖 / 三軸）寫死在程式裡，改題目改那裡，前端自動跟著變。

## 4. 希望下一位保留的三個設計想法

**① 卡片不留標籤，結構靠版面**
卡片上只有：名字 → 一句話 → chips → 理由 → 不確定性 → 破冰句。`01 / 02 / 03` 那三個小標已經被砍掉了（結構感改由間距、分隔線與字級撐）。present 模式則保留結構，因為那裡是投影用，需要讀者知道自己在第幾段。

**② reasons + uncertainty + opener 三件套，而且永遠不顯示分數**
每張卡一定有三塊：為什麼是 TA（兩個**grounded 在實際共同點**的理由）、不確定性（固定一句「共同點只是起點，合不合只有現場才知道」）、第一句怎麼說（**一句可以直接開口**的問題，不是「你們有什麼共同點？」這種）。配對分數只用於排序、絕不外顯 —— 這是從 Coffee Meets Codex 沿用來的紅線，別破。

**③ 兩個資料池不混用 + 一個 fictional cast**
demo 模式存在的唯一目的是讓主辦方在活動前排演流程。所以 demo 參加者只看得到 8 位虛構角色，live 參加者只看得到真人。demo 資料跟真人資料永遠不進同一個池。

> 附帶第 ④ 個（別丟）：**聯絡方式在雙方同意前不能出現在任何 API 回應裡** —— `scripts/smoke.mjs` 有測試守著這條，改 API 時別讓它退回去。

---

## 給 Space Bunny（視覺與互動）

**風格基準**：`brand.gamma.app` 的 Public Brand Book —— Surreal Pointillism（藍天、點描顆粒、單一主體）、Abstract Cards（歪斜、破框）、官方 12 色票。`styles.css` 的 `:root` 已經是官方色票（`--ultramarine` / `--deep-ocean` / `--flamingo` / `--bordeaux` / `--moonbeam` …），**改樣式請從這組 token 出發**。

**插畫**：`public/assets/*.jpg` 是 Murphy（Astra）依 `public/assets/IMAGE-BRIEF.md` 生成的油畫。`public/art.js` 是手寫 SVG（三眼貓 / 水母 / 蘑菇 / 點描），**用途是 fallback** —— 每張 `<img>` 都有 `data-fallback`，載入失敗會自動換成 SVG（`bindArtFallbacks()`，在 `public/app.js`）。

**動態現在在哪**：
- `.creatures` 層（漂浮的蘑菇與水母）—— 寬螢幕才顯示，1024px 以下整層隱藏（避免壓到標題）
- `.float-a / .float-b / .float-c` 三種飄浮節奏，`.art__tentacle` 是水母觸手擺動
- present 模式進場（`#present` overlay）、卡片 hover、toast
- `@media (prefers-reduced-motion: reduce)` 會把全部動畫關掉 —— **動態改多也要守住這條**
- 現有的卡片輕微歪斜（`.deck-card--tilt` / `--tilt-r`）是刻意留的破框感，別動

**可以接手的地方**：卡片 hover 與換卡（`換一批`）的手感、present 模式的翻頁轉場、把 `abstract-cards.jpg` 做成開場動態、卡片進場 stagger、Peepers 對話框的說話感。**別動**：文案（已經極簡到不能再砍）、配對規則、consent 流程、色彩與字體的 token 來源。

## 給 Murphy（工程與驗收）

**API 契約**（全部在 `server.mjs`，沒有 framework）
```
GET    /api/event            活動設定 + 目錄 + 現場人數 + scout 模式
POST   /api/join             建立參加者 → { id, token, profile }
GET    /api/me               我的資料（需 token）
DELETE /api/me               刪掉我
POST   /api/me/status        暫停 / 恢復被配對
GET    /api/brief            我的 N 張卡
POST   /api/interest         送出「想認識」
GET    /api/intros           介紹列表（含同意狀態、同意後才含 contact）
POST   /api/interest/:id/respond   accept / decline
POST   /api/gamma/deck       產出共同 deck（需要 key）
GET    /api/gamma/status/:id 輪詢產出狀態
```

**不可破的守門（`scripts/smoke.mjs` 會驗）**
- 未同意前任何回應不含 contact
- 沒有 token 一律 401
- demo 池不含真人（有測試守門）、live 池不含 demo cast（`poolFor()` 實作保證）
- 刪除後 token 立即失效

**要接的話**：真的 Gamma key 跑一次 `POST /api/gamma/deck`（記得記錄實際回應格式，可能要調 `gammaCreate` 的解析）、速率限制、真正的登入、把 JSON 檔換成資料庫。

## 檔案地圖

```
server.mjs              zero-dep HTTP server：配對 / 同意 / 隱私 / Gamma API
data/catalog.js         意圖 + 三個軸的選項（改題目改這裡）
data/demo-cast.js       8 位虛構角色
data/matching.js        配對引擎：加權、理由、破冰句
public/index.html       外殼
public/styles.css       設計系統（:root 是官方色票）
public/app.js           畫面與互動
public/art.js           手寫 SVG fallback
public/assets/          油畫插畫、官方字標、圖像需求單
scripts/smoke.mjs       20 項端到端測試
render.yaml             Render Blueprint（等 bunny 回來再部署）
```
