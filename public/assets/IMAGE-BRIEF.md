# Slides Meets Gamma — 圖像需求單（給 Murphy）

> 直接貼給 Murphy 即可。主視覺已存在（黑三眼貓那張），下面 4 張是為了讓「卡片面」跟主視覺同一個畫風 ——
> 現在卡片面用的是扁平 SVG，油畫放在一起會打架。

## Style reference

請附上這張作為 **style reference**（同一個角色、同一個畫風、同一顆三眼貓）：
`peepers-sky.jpg`（黑貓三隻藍眼 × 粉紅雲海 × 水母 × 點描蘑菇 × 藍天星星 × 漂浮奶油色卡片）

## 共通規格

- 畫風：**Surreal Pointillism** —— 油畫筆觸 + 密集點描顆粒、藍天漸層、粉紅雲海、亮色
- **單一清晰主體**，構圖乾淨，主體略偏右/偏上（方便裁成小卡）
- 整體偏亮（要疊在白卡上），主體可以暗
- 不要：文字、logo、人類、水印、邊框、浮動 UI
- 尺寸：≥1536px，比例照下表

---

## 1️⃣ 三眼貓肖像（最重要）

`peepers-portrait.jpg` · **1:1** · 用途：scout 頭像、「我」頁說明框、介紹頁小卡

```
Portrait of a black cat with three luminous cyan eyes — two normal eyes and a third
glowing eye centered on its forehead, encircled by faint concentric portal rings.
Surreal Pointillism oil-painting style: dense stippled dot texture, pink rim light,
deep navy fur. The cat sits on a soft pink cloud, looking slightly upward, with a
vivid cerulean sky and tiny stars behind. Single clear subject, bright overall,
generous open sky around the head for cropping. No text, no watermark.
```

## 2️⃣ 粉紅點描蘑菇雲

`mushroom-cloud.jpg` · **3:2** · 用途：「為什麼是 TA」卡片右上角插畫

```
A cluster of three to five oversized pink mushrooms with white stippled spots, growing
out of a sea of cottony pink clouds. Surreal Pointillism oil-painting style: heavy
stippled dot texture on the caps, deep magenta shadows, glowing rims. Tiny golden
stars scattered in the blue sky above. Single clear subject cluster, bright, soft
focused clouds, lots of open sky. No text, no watermark.
```

## 3️⃣ 水母與星空

`jellyfish-stars.jpg` · **3:2** · 用途：「第一句怎麼說」卡片插畫

```
A translucent pink jellyfish floating in a deep blue starry sky, its trailing tendrils
dissolving into tiny dots like stardust. Surreal Pointillism oil-painting style:
stippled dot texture across the bell, magenta-to-rose gradients, luminous cyan
highlights, soft pink clouds far below. Single clear subject, bright, open sky around
it for cropping. No text, no watermark.
```

## 4️⃣ 漂浮的抽象卡片（Gamma Abstract Cards）

`abstract-cards.jpg` · **16:9** · 用途：present 模式背景、deck 封面紋理、介紹頁

```
Abstract cream-colored cards with softly curved corners floating and drifting through
a bright blue sky with pink clouds, arranged in depth, tilted at playful angles. One
card carries a single pink jellyfish, another a tiny mushroom, another a three-eyed cat
silhouette. Surreal Pointillism oil-painting style: stippled dot texture, soft
volumetric light, vibrant but restrained palette. The cards have empty surfaces — no
text, no letters, no logos. No watermark.
```

---

## 備選（想做再做）

## 5️⃣ 純天空紋理

`sky-texture.jpg` · **21:9** · 用途：present 模式背景疊圖、列印頁首

```
Wide panoramic sky texture: gradient from deep cobalt blue at the top to pale periwinkle
and soft pink clouds at the horizon, sprinkled with tiny stars and a faint stippled dot
grain. Surreal Pointillism style, no subject, no text, no watermark. Designed to sit
behind a foreground card.
```

---

## 交付規格

- 檔名照上面寫，PNG 或 JPG 皆可
- 全部回傳原檔（不要壓縮過的預覽圖）
- 收到後我會：換掉卡片面的 SVG 插畫（SVG 保留為 fallback）→ 統一裁切比例 →
  重跑 `npm test` + browser QA 確認版面沒破

**本輪生成條件**：4 張（＋選配第 5 張）· 每張 1 次 · 不自動重試 · 失敗只回報不重送
