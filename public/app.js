// Slides Meets Gamma — 前端
// 畫面：參加 → 你的 deck（3 張卡）→ 介紹（雙方同意）→ 我（隱私）
import { peepers, jellyfish, mushroom, dotField, sky } from '/art.js';

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const topnav = $('#topnav');
const presentEl = $('#present');
const toastEl = $('#toast');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LIMITS = { intentions: 2, building: 3, taste: 3, topics: 4 };

const state = {
  config: null,
  token: localStorage.getItem('smg.token') || null,
  me: null,
  screen: 'join',
  form: {
    displayName: '',
    tagline: '',
    contact: '',
    intentions: [],
    building: [],
    taste: [],
    topics: [],
    mode: 'live',
  },
  brief: null,
  intros: [],
  busy: false,
  present: null,
  gamma: { open: null, key: '', gen: null, result: null, error: null },
};

// ── api ──────────────────────────────────────────────────────────────────────
async function api(path, method = 'GET', body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (state.token) headers['x-smg-token'] = state.token;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || '連線有點問題，再試一次。');
    err.data = data;
    throw err;
  }
  return data;
}

// ── toast ───────────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 3600);
}

// ── 裝飾 ────────────────────────────────────────────────────────────────────
function mountDecorations() {
  $('#backdrop').innerHTML = sky({ id: 'bg' }) + dotField({ id: 'bgdots' });
  const field = $('#creatures');
  field.innerHTML = `
    <div class="float-a" style="left:3%;top:12%">${mushroom({ size: 96, cap: 'flamingo' })}</div>
    <div class="float-b" style="left:88%;top:8%">${jellyfish({ size: 120, tone: 'sky' })}</div>
    <div class="float-c" style="left:8%;top:64%">${mushroom({ size: 78, cap: 'rocket', flip: true })}</div>
    <div class="float-a" style="left:92%;top:58%">${mushroom({ size: 86, cap: 'ultramarine' })}</div>
    <div class="float-b" style="left:78%;top:30%">${jellyfish({ size: 84, tone: 'aurora', flip: true })}</div>
  `;
}

// ── 插畫：油畫圖優先，SVG 當 fallback ───────────────────────────────────────
const ART_FALLBACK = {
  cards: () => jellyfish({ size: 132, tone: 'sky' }),
  mushroom: () => mushroom({ size: 108, cap: 'flamingo' }),
  jellyfish: () => jellyfish({ size: 132, tone: 'aurora' }),
  peepers: () => peepers({ size: 118, glow: false }),
};

function artImg(src, alt, fallbackKey, extraClass = '') {
  return `<img class="art-img art-img--${fallbackKey} ${extraClass}" src="${src}" alt="${esc(alt)}" data-fallback="${fallbackKey}" loading="lazy" />`;
}

function bindArtFallbacks(root = document) {
  root.querySelectorAll('img[data-fallback]').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        const fb = ART_FALLBACK[img.dataset.fallback];
        if (!fb) return;
        const holder = document.createElement('span');
        holder.className = 'art art--fallback';
        holder.innerHTML = fb();
        img.replaceWith(holder);
      },
      { once: true }
    );
  });
}

const ART_CARDS = {
  cards: { src: '/assets/abstract-cards.jpg', alt: '漂浮在藍天裡的抽象卡片' },
  mushroom: { src: '/assets/mushroom-cloud.jpg', alt: '粉紅點描蘑菇長在雲海上' },
  jellyfish: { src: '/assets/jellyfish-stars.jpg', alt: '星空裡漂浮的粉紅水母' },
};

// ── render ──────────────────────────────────────────────────────────────────
function render() {
  renderNav();
  if (!state.config) return;
  if (state.screen === 'join') app.innerHTML = viewJoin();
  else if (state.screen === 'brief') app.innerHTML = viewBrief();
  else if (state.screen === 'intros') app.innerHTML = viewIntros();
  else if (state.screen === 'me') app.innerHTML = viewMe();
  bindArtFallbacks(app);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderNav() {
  const items = [
    { id: 'join', label: '參加' },
    state.me && { id: 'brief', label: '我的 deck' },
    state.me && { id: 'intros', label: '介紹' },
    state.me && { id: 'me', label: '我' },
  ].filter(Boolean);
  topnav.innerHTML = items
    .map(
      (i) =>
        `<button class="topnavbtn" data-nav="${i.id}" aria-current="${state.screen === i.id}">${i.label}</button>`
    )
    .join('');
}

const cat = () => state.config.catalog;
const labelOf = (axis, id) => (cat()[axis] || []).find((x) => x.id === id)?.zh || id;

function chipsFor(profile) {
  const out = [];
  (profile.building || []).forEach((b) => out.push(`<span class="chip chip--building">${esc(labelOf('building', b))}</span>`));
  (profile.taste || []).forEach((t) => out.push(`<span class="chip chip--taste">${esc(labelOf('taste', t))}</span>`));
  (profile.topics || []).forEach((t) => out.push(`<span class="chip chip--topics">${esc(labelOf('topics', t))}</span>`));
  return out.join('');
}

function intentChip(id) {
  const i = (cat().intents || []).find((x) => x.id === id);
  return i ? `<span class="chip chip--intent">${esc(i.zh)}</span>` : '';
}

// ── 參加畫面 ────────────────────────────────────────────────────────────────
function viewJoin() {
  const { event, counts } = state.config;
  const f = state.form;
  return `
  <section class="hero">
    <div>
      <span class="eyebrow">${esc(event.name)} · ${esc(event.nameZh)}</span>
      <h1 class="hero__title">
        <span class="accent">Slides</span> Meets<br />
        <img class="hero__wordmark" src="/assets/gamma-wordmark.png" alt="Gamma" />
      </h1>
      <p class="hero__lede">${esc(event.mottoZh)}<br />
        花 90 秒說說你在做什麼、想聊什麼，我們替你找幾位值得聊聊的人，每人一張卡。
        聯絡方式要雙方都同意，才會交換。</p>
      <div class="hero__meta">
        <span class="chip chip--ghost">${counts.live} 位真人參加</span>
        <span class="chip chip--ghost">demo ${counts.demo} 位虛構角色</span>
        <span class="chip chip--ghost">不必用 email 註冊</span>
      </div>
    </div>
    <div class="hero__art">
      <figure class="hero__scene">
        <img src="/assets/peepers-sky.jpg" alt="三眼貓 Mr. Peepers 坐在粉紅雲端上，旁邊是水母與點描蘑菇，藍天裡有幾張漂浮的卡片" />
        <span class="floatcard floatcard--1"></span>
        <span class="floatcard floatcard--2"></span>
        <span class="floatcard floatcard--3"></span>
      </figure>
      <div class="hero__quote">
        ${artImg('/assets/peepers-portrait.jpg', '三眼貓 Peepers', 'peepers', 'hero__avatar')}
        <div><b>Peepers：</b>我會看你在做什麼、想聊什麼，替你挑幾位有話聊的人。要不要開口，由你決定。</div>
      </div>
    </div>
  </section>

  <div class="layout-2">
    <section class="panel">
      <div class="section">
        <div class="section__head"><h3>1. 你是誰</h3><small>名字 + 一句話</small></div>
        <label class="field">
          <span>大家要怎麼叫你？ <small>最多 40 字</small></span>
          <input type="text" name="displayName" maxlength="40" value="${esc(f.displayName)}" placeholder="Crystal / 林恩 / 愛穿紅色襪子的人" autocomplete="name" />
        </label>
        <label class="field">
          <span>用一句話介紹自己 <small>最多 120 字 · 這句會出現在別人的卡上</small></span>
          <textarea name="tagline" maxlength="120" placeholder="我正在把一個想法講成三張卡。">${esc(f.tagline)}</textarea>
        </label>
      </div>

      <div class="section">
        <div class="section__head"><h3>2. 今天想遇到什麼樣的人？</h3><small>最多 ${LIMITS.intentions} 項</small></div>
        <div class="chip-row">
          ${cat()
            .intents.map(
              (i) =>
                `<button class="pick" data-pick="intentions" data-value="${i.id}" aria-pressed="${f.intentions.includes(
                  i.id
                )}"><strong>${esc(i.zh)}</strong><small>${esc(i.hint)}</small></button>`
            )
            .join('')}
        </div>
      </div>

      <div class="section">
        <div class="section__head"><h3>3. 你在做什麼</h3><small>最多 ${LIMITS.building} 項</small></div>
        <div class="chip-row">
          ${cat()
            .building.map(
              (b) =>
                `<button class="pick" data-pick="building" data-value="${b.id}" aria-pressed="${f.building.includes(
                  b.id
                )}">${esc(b.zh)}</button>`
            )
            .join('')}
        </div>
      </div>

      <div class="section">
        <div class="section__head"><h3>4. 你的 deck 品味</h3><small>最多 ${LIMITS.taste} 項</small></div>
        <div class="chip-row">
          ${cat()
            .taste.map(
              (t) =>
                `<button class="pick" data-pick="taste" data-value="${t.id}" aria-pressed="${f.taste.includes(
                  t.id
                )}">${esc(t.zh)}</button>`
            )
            .join('')}
        </div>
      </div>

      <div class="section">
        <div class="section__head"><h3>5. 想聊什麼</h3><small>最多 ${LIMITS.topics} 項</small></div>
        <div class="chip-row">
          ${cat()
            .topics.map(
              (t) =>
                `<button class="pick" data-pick="topics" data-value="${t.id}" aria-pressed="${f.topics.includes(
                  t.id
                )}">${esc(t.zh)}</button>`
            )
            .join('')}
        </div>
      </div>

      <div class="section">
        <div class="section__head"><h3>6. 想讓對方怎麼找到你（選填）</h3><small>雙方都同意才顯示</small></div>
        <label class="field">
          <span>聯絡方式 <small>LINE ID / Email / 桌號都可以</small></span>
          <input type="text" name="contact" maxlength="120" value="${esc(f.contact)}" placeholder="lineid: crystal / 3 號桌" autocomplete="off" />
        </label>
        <div class="notice">
          <span>🫧</span>
          <div><strong>你現在填的，對方看不到</strong>
            雙方同意前，不向對方顯示聯絡方式。</div>
        </div>
      </div>

      <div class="section">
        <div class="section__head"><h3>7. 這是什麼模式</h3></div>
        <div class="chip-row">
          <button class="pick" data-mode="live" aria-pressed="${f.mode === 'live'}">
            <strong>現場參加</strong><small>和其他真人配對</small>
          </button>
          <button class="pick" data-mode="demo" aria-pressed="${f.mode === 'demo'}">
            <strong>我先試玩</strong><small>先和 8 位虛構角色玩一輪，不接觸真人</small>
          </button>
        </div>
      </div>

      <button class="btn btn--primary" id="join-btn" style="width:100%;padding:15px">
        做出我的 deck ✦
      </button>
      <p class="note" style="margin-top:10px">
        名字和一句話會給配對到的人看。聯絡方式要雙方都同意才會交換。
        想刪就刪，在「我」裡一次清空。
      </p>
    </section>

    <aside>
      <div class="cover" id="cover">
        <img class="cover__bg" src="/assets/abstract-cards.jpg" alt="" aria-hidden="true" />
        <span class="eyebrow eyebrow--light">YOUR DECK COVER</span>
        <div class="cover__name" id="cover-name">${esc(f.displayName || '你的名字')}</div>
        <div class="cover__tag" id="cover-tag">${esc(f.tagline || '一句話還沒寫——這會出現在別人的卡上。')}</div>
        <div class="cover__chips" id="cover-chips">${coverChips()}</div>
        <img class="cover__peepers" src="/assets/peepers-portrait.jpg" alt="三眼貓 Peepers" />
      </div>
      <div class="notice" style="margin-top:16px">
        <span>🐈</span>
        <div><strong>Peepers 只看三件事</strong>
          你在做什麼、你的 deck 品味、你想聊什麼。有交集，才會被放在一起。</div>
      </div>
    </aside>
  </div>`;
}

function coverChips() {
  const f = state.form;
  const out = [];
  f.intentions.forEach((i) => out.push(`<span class="chip">${esc(labelOf('intents', i))}</span>`));
  f.building.forEach((i) => out.push(`<span class="chip">${esc(labelOf('building', i))}</span>`));
  f.taste.forEach((i) => out.push(`<span class="chip">${esc(labelOf('taste', i))}</span>`));
  f.topics.forEach((i) => out.push(`<span class="chip">${esc(labelOf('topics', i))}</span>`));
  return out.join('');
}

// ── 你的 deck ───────────────────────────────────────────────────────────────
function viewBrief() {
  const b = state.brief;
  const engine =
    b?.engine === 'live-ai'
      ? '<span class="badge badge--accepted">LIVE SCOUT</span>'
      : '<span class="badge">SCRIPTED SCOUT</span>';

  if (!b || !b.cards.length) {
    return `
    <div class="empty">
      <h3>今天還沒找到聊得來的人</h3>
      <p class="note" style="max-width:44ch;margin:0 auto">
        現場有 ${b?.poolSize ?? 0} 位參加者，但暫時沒有人和你想找的人一樣。
        換個意圖再試，或過一陣子再來看看。
      </p>
      <div class="card-actions" style="justify-content:center">
        <button class="btn btn--primary" data-reload-brief>再找一次</button>
      </div>
    </div>`;
  }

  return `
  <div class="section__head" style="margin-bottom:18px">
    <div>
      <span class="eyebrow">YOUR DECK · ${b.cards.length} SLIDES</span>
      <h2>今天值得聊聊的人</h2>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      ${engine}
      <button class="btn btn--sm" data-reload-brief>換一批</button>
      <button class="btn btn--sm btn--dark" data-present-all>▣ 全螢幕呈現</button>
    </div>
  </div>

  <div class="deck">
    ${b.cards.map((c, i) => deckCard(c, i)).join('')}
  </div>

  <div class="notice notice--peepers" style="margin-top:22px">
    ${artImg('/assets/peepers-portrait.jpg', '三眼貓 Peepers', 'peepers', 'notice__avatar')}
    <div><strong>Peepers 的提醒</strong>
      這是依照「值得聊一句」排的，不是相容度分數。</div>
  </div>`;
}

function deckCard(card, index) {
  const p = card.profile;
  const tilt = index % 2 === 0 ? 'deck-card--tilt' : 'deck-card--tilt-r';
  const keys = ['cards', 'mushroom', 'jellyfish'];
  const key = keys[index % keys.length];
  const art = ART_CARDS[key];
  const already = state.intros.some(
    (i) => i.other.id === p.id && ['pending', 'accepted'].includes(i.status)
  );

  return `
  <article class="deck-card ${tilt}" style="--i:${index}">
    <span class="deck-card__no">SLIDE ${String(index + 1).padStart(2, '0')}</span>
    <div class="deck-card__art">${artImg(art.src, art.alt, key)}</div>

    <div class="deck-card__name">${esc(p.name)}</div>
    <p class="deck-card__tag">${esc(p.tagline || '（這位還沒寫一句話）')}</p>
    <div class="chip-row" style="margin-top:12px">${chipsFor(p)}</div>

    <hr style="border:none;border-top:1px dashed var(--line);margin:22px 0" />

    <ul class="reasons">
      ${card.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}
    </ul>
    <p class="uncertainty">${esc(card.uncertainty)}</p>

    <hr style="border:none;border-top:1px dashed var(--line);margin:22px 0" />

    <p class="opener">${esc(card.opener)}</p>

    <div class="card-actions">
      ${
        already
          ? '<span class="badge badge--pending">已送出「想認識」</span>'
          : `<button class="btn btn--primary" data-interest="${esc(p.id)}">想認識 TA ✦</button>`
      }
      <button class="btn" data-present-index="${index}">▣ 放大看這張</button>
    </div>
  </article>`;
}

// ── 介紹 ────────────────────────────────────────────────────────────────────
function viewIntros() {
  const received = state.intros.filter((i) => i.direction === 'received' && i.status === 'pending');
  const settled = state.intros.filter((i) => i.status !== 'pending' || i.direction === 'sent');

  return `
  <div class="section__head" style="margin-bottom:18px">
    <div>
      <span class="eyebrow">INTRODUCTIONS</span>
      <h2>有人想認識你</h2>
    </div>
    <span class="chip chip--ghost">雙方都同意才交換</span>
  </div>

  ${
    received.length
      ? `<div class="stack" style="margin-bottom:22px">
          ${received.map(introItem).join('')}
        </div>`
      : `<div class="empty" style="margin-bottom:22px">
          <h3>還沒有人來敲門</h3>
          <p class="note">有人想認識你，就會出現在這裡。你也按下「想認識」，雙方都同意，連結才會成立。</p>
        </div>`
  }

  <span class="eyebrow">已送出 / 已完成</span>
  <div class="stack" style="margin-top:12px">
    ${settled.length ? settled.map(introItem).join('') : '<p class="note">還沒有送出任何「想認識」。</p>'}
  </div>`;
}

function introItem(i) {
  const badge =
    i.status === 'accepted'
      ? '<span class="badge badge--accepted">連結成立 ✓</span>'
      : i.status === 'pending'
      ? i.direction === 'received'
        ? '<span class="badge badge--pending">等你回應</span>'
        : '<span class="badge badge--pending">邀請已送出，等對方回應</span>'
      : i.status === 'declined'
      ? '<span class="badge badge--declined">未成立</span>'
      : '<span class="badge badge--cancelled">已取消</span>';

  const gamma = state.gamma.open === i.id ? gammaForm(i) : '';
  return `
  <div class="intro-item">
    <div class="intro-item__top">
      <div>
        <h3>${esc(i.other.name)}</h3>
        <p class="note">${esc(i.other.tagline || '')}</p>
      </div>
      ${badge}
    </div>
    ${i.status === 'accepted' ? '<img class="intro-link" src="/assets/connect-cat.jpg" alt="你們已互相同意" />' : ''}
    <div class="chip-row">${chipsFor(i.other)}${intentChip(i.intention)}</div>
    ${
      i.contact
        ? `<div class="contact-box"><strong>聯絡方式：</strong>${esc(i.contact)}</div>`
        : i.contactHint && i.status === 'accepted'
        ? `<div class="contact-box">${esc(i.contactHint)}</div>`
        : ''
    }
    ${
      i.status === 'accepted'
        ? `<div class="card-actions">
            <button class="btn btn--dark btn--sm" data-gamma-open="${i.id}">✦ 一起做一份共同 deck</button>
            ${
              state.gamma.result?.introId === i.id
                ? `<a class="btn btn--sm" href="${esc(state.gamma.result.url)}" target="_blank" rel="noopener">打開共同 deck ↗</a>`
                : ''
            }
          </div>${gamma}`
        : ''
    }
    ${
      i.status === 'pending' && i.direction === 'received'
        ? `<div class="card-actions">
            <button class="btn btn--primary btn--sm" data-respond="${i.id}" data-action="accept">我也想認識 ✦</button>
            <button class="btn btn--ghost btn--sm" data-respond="${i.id}" data-action="decline">今天先不用</button>
          </div>`
        : ''
    }
  </div>`;
}

function gammaForm(i) {
  const g = state.gamma;
  return `
  <div class="contact-box" style="margin-top:4px">
    <label class="field" style="margin-bottom:10px">
      <span>你的 Gamma API key <small>sk-gamma-… · 會經本站伺服器轉送給 Gamma</small></span>
      <input type="text" name="gammaKey" value="${esc(g.key)}" placeholder="sk-gamma-xxxxxxxx" autocomplete="off" />
    </label>
    <div class="card-actions">
      <button class="btn btn--primary btn--sm" data-gamma-run="${i.id}">產生共同 deck</button>
      <button class="btn btn--ghost btn--sm" data-gamma-cancel>取消</button>
    </div>
    <p class="note" style="margin-top:8px">
      這會用你的 API key 產生一份 4 張卡的簡報，<strong>會消耗你帳號的 credits</strong>。
      需要 Pro 以上方案。金鑰會經本站伺服器轉送給 Gamma，並暫存在伺服器記憶體中以查詢進度；我們不承諾固定的刪除時間。
    </p>
    ${g.error ? `<p class="note" style="color:#921653;margin-top:8px">${esc(g.error)}</p>` : ''}
    ${
      g.gen && g.result?.introId !== i.id
        ? '<p class="note" style="margin-top:8px">產生中…稍等一下下。</p>'
        : ''
    }
  </div>`;
}

// ── 我 ──────────────────────────────────────────────────────────────────────
function viewMe() {
  const me = state.me;
  return `
  <div class="section__head" style="margin-bottom:18px">
    <div>
      <span class="eyebrow">ME</span>
      <h2>${esc(me.name)}</h2>
    </div>
    <span class="chip chip--ghost">${me.mode === 'demo' ? 'DEMO 模式（虛構角色）' : '現場參加'}</span>
  </div>

  <div class="layout-2">
    <section class="panel">
      <div class="section">
        <span class="eyebrow">你的 deck 封面</span>
        <p class="note" style="margin:8px 0 12px">${esc(me.tagline || '（還沒寫一句話）')}</p>
        <div class="chip-row">${chipsFor(me)}</div>
      </div>
      <div class="section">
        <div class="section__head"><h3>控制</h3></div>
        <div class="card-actions">
          <button class="btn btn--sm" id="pause-btn">${me.status === 'active' ? '暫停被配對' : '重新開放配對'}</button>
          <button class="btn btn--sm btn--ghost" id="delete-btn" style="border-color:#f9a8db;color:#921653">刪掉我的資料</button>
        </div>
        <p class="note" style="margin-top:10px">
          暫停＝不再出現在別人的 deck。刪除＝名字、一句話、聯絡方式與介紹全移除，無法復原。
        </p>
      </div>
    </section>

    <aside class="stack">
      <div class="notice">
        <span>🔒</span>
        <div><strong>你的資料誰看得到</strong>
          只有配對到你的人看得到你的名字與三個軸。聯絡方式雙方同意才交換。我們不收 email、電話或社群帳號。</div>
      </div>
      <div class="notice">
        <span>${state.config.scout === 'live-ai' ? '🧠' : '🐈'}</span>
        <div><strong>誰在幫你配對</strong>
          ${
            state.config.scout === 'live-ai'
              ? '已接 live scout 模型，配對理由即時生成。'
              : '目前是腳本化配對（規則寫死）。接上 API key 可改成 live AI。'
          }
        </div>
      </div>
      <div class="notice">
        <span>🫧</span>
        <div><strong>${esc(state.config.event.nameZh)}</strong>
          ${esc(state.config.event.motto)} · 現場 ${state.config.counts.live} 位參加者 · demo cast ${state.config.counts.demo} 位（虛構）</div>
      </div>
    </aside>
  </div>`;
}

// ── 行為 ────────────────────────────────────────────────────────────────────
document.addEventListener('click', async (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    state.screen = nav.dataset.nav;
    render();
    return;
  }

  const pick = e.target.closest('[data-pick]');
  if (pick) {
    const axis = pick.dataset.pick;
    const value = pick.dataset.value;
    const list = state.form[axis];
    const i = list.indexOf(value);
    if (i >= 0) list.splice(i, 1);
    else {
      if (list.length >= LIMITS[axis]) {
        toast(`最多選 ${LIMITS[axis]} 項。`);
        return;
      }
      list.push(value);
    }
    pick.setAttribute('aria-pressed', String(i < 0));
    const cover = $('#cover-chips');
    if (cover) cover.innerHTML = coverChips();
    return;
  }

  const mode = e.target.closest('[data-mode]');
  if (mode) {
    state.form.mode = mode.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.form.mode)));
    return;
  }

  if (e.target.closest('#join-btn')) return join();
  if (e.target.closest('[data-reload-brief]')) return loadBrief(true);
  if (e.target.closest('[data-present-all]')) return openPresent(0);
  const pi = e.target.closest('[data-present-index]');
  if (pi) return openPresent(Number(pi.dataset.presentIndex));

  const interest = e.target.closest('[data-interest]');
  if (interest) return sendInterest(interest.dataset.interest);

  const respond = e.target.closest('[data-respond]');
  if (respond) return respondIntro(respond.dataset.respond, respond.dataset.action);

  if (e.target.closest('[data-gamma-open]')) {
    state.gamma.open = e.target.closest('[data-gamma-open]').dataset.gammaOpen;
    state.gamma.error = null;
    render();
    return;
  }
  if (e.target.closest('[data-gamma-cancel]')) {
    state.gamma.open = null;
    render();
    return;
  }
  const grun = e.target.closest('[data-gamma-run]');
  if (grun) return runGamma(grun.dataset.gammaRun);

  if (e.target.closest('#pause-btn')) return togglePause();
  if (e.target.closest('#delete-btn')) return deleteMe();

  if (e.target.closest('[data-present-close]')) return closePresent();
  const pn = e.target.closest('[data-present-next]');
  if (pn) return movePresent(1);
  const pp = e.target.closest('[data-present-prev]');
  if (pp) return movePresent(-1);
});

document.addEventListener('input', (e) => {
  const name = e.target.name;
  if (name === 'displayName' || name === 'tagline') {
    state.form[name] = e.target.value;
    const n = $('#cover-name');
    const t = $('#cover-tag');
    if (n) n.textContent = state.form.displayName || '你的名字';
    if (t) t.textContent = state.form.tagline || '一句話還沒寫——這會出現在別人的卡上。';
  }
  if (name === 'gammaKey') state.gamma.key = e.target.value;
});

document.addEventListener('keydown', (e) => {
  if (!state.present) return;
  if (e.key === 'Escape') closePresent();
  if (e.key === 'ArrowRight') movePresent(1);
  if (e.key === 'ArrowLeft') movePresent(-1);
});

async function join() {
  if (state.busy) return;
  const f = state.form;
  if (!f.displayName.trim()) return toast('先填名字。');
  if (!f.intentions.length) return toast('選一個意圖。');
  if (!f.building.length || !f.taste.length || !f.topics.length)
    return toast('三個軸各至少選一項。');
  state.busy = true;
  try {
    const data = await api('/api/join', 'POST', f);
    state.token = data.token;
    state.me = data.profile;
    localStorage.setItem('smg.token', data.token);
    state.screen = 'brief';
    toast('通行證拿到了，deck 生成中。');
    await loadBrief();
    render();
  } catch (err) {
    toast(err.message);
  } finally {
    state.busy = false;
  }
}

async function loadBrief(force = false) {
  try {
    state.brief = await api('/api/brief');
    state.intros = (await api('/api/intros')).intros;
  } catch (err) {
    toast(err.message);
    if (force) render();
  }
}

async function sendInterest(targetId) {
  try {
    await api('/api/interest', 'POST', { targetId });
    state.intros = (await api('/api/intros')).intros;
    toast('邀請已送出，等對方回應。雙方都同意，連結才會成立。');
    render();
  } catch (err) {
    toast(err.message);
  }
}

async function respondIntro(id, action) {
  try {
    await api(`/api/interest/${id}/respond`, 'POST', { action });
    state.intros = (await api('/api/intros')).intros;
    toast(
      action === 'accept'
        ? '連結成立！去聊吧。'
        : '已婉拒。'
    );
    render();
  } catch (err) {
    toast(err.message);
  }
}

async function togglePause() {
  const next = state.me.status === 'active' ? false : true;
  try {
    await api('/api/me/status', 'POST', { active: next });
    state.me.status = next ? 'active' : 'paused';
    toast(next ? '已重新開放配對。' : '已暫停配對。');
    render();
  } catch (err) {
    toast(err.message);
  }
}

async function deleteMe() {
  if (!confirm('確定要刪掉全部資料嗎？名字、一句話、聯絡方式與所有介紹都會移除，無法復原。')) return;
  try {
    await api('/api/me', 'DELETE');
    localStorage.removeItem('smg.token');
    state.token = null;
    state.me = null;
    state.brief = null;
    state.intros = [];
    state.screen = 'join';
    toast('資料已刪除。');
    render();
  } catch (err) {
    toast(err.message);
  }
}

async function runGamma(introId) {
  state.gamma.error = null;
  state.gamma.gen = true;
  render();
  try {
    const created = await api('/api/gamma/deck', 'POST', {
      introId,
      gammaKey: state.gamma.key.trim(),
    });
    state.gamma.gen = null;
    state.gamma.result = { introId, url: '', status: 'processing' };
    render();
    await pollGamma(created.generationId, introId);
  } catch (err) {
    state.gamma.gen = null;
    state.gamma.error = err.message;
    render();
  }
}

async function pollGamma(generationId, introId) {
  for (let i = 0; i < 80; i += 1) {
    await new Promise((r) => setTimeout(r, 2500));
    let data = null;
    try {
      data = await api(`/api/gamma/status/${generationId}`);
    } catch {
      continue;
    }
    const status = data?.status || data?.state || '';
    const url = data?.url || data?.gamma?.url || data?.gammaUrl || data?.exportUrl || '';
    if (/complete|success|done/i.test(status) && url) {
      state.gamma.result = { introId, url, status };
      state.gamma.gen = null;
      render();
      toast('共同 deck 好了。');
      return;
    }
    if (/fail|error/i.test(status)) {
      state.gamma.gen = null;
      state.gamma.error = data?.error || 'Gamma 這次沒做成，再試一次。';
      render();
      return;
    }
  }
  state.gamma.gen = null;
  state.gamma.error = '還在產出中——晚點回來看，或直接到 Gamma 的 API Generated 看。';
  render();
}

// ── Present 模式 ────────────────────────────────────────────────────────────
function openPresent(index) {
  const cards = state.brief?.cards || [];
  if (!cards.length) return;
  state.present = { index: Math.max(0, Math.min(index, cards.length - 1)) };
  renderPresent();
  presentEl.hidden = false;
}

function closePresent() {
  state.present = null;
  presentEl.hidden = true;
  presentEl.innerHTML = '';
}

function movePresent(step) {
  if (!state.present) return;
  const cards = state.brief?.cards || [];
  const next = state.present.index + step;
  if (next < 0 || next >= cards.length) return;
  state.present.index = next;
  renderPresent(step > 0 ? 'is-next' : 'is-prev');
}

function renderPresent(direction = '') {
  const cards = state.brief?.cards || [];
  const i = state.present.index;
  const c = cards[i];
  const p = c.profile;
  bindArtFallbacks(presentEl);
  presentEl.innerHTML = `
    <img class="present__bg" src="/assets/sky-wide.jpg" alt="" aria-hidden="true" />
    <div class="present__stage">
      <img class="present__mascot" src="/assets/peepers-portrait.jpg" alt="三眼貓 Peepers" />
      <div class="present__card ${direction}">
        <span class="eyebrow">SLIDE ${String(i + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')} · ${esc(p.name)}</span>
        <h2 style="margin:10px 0 6px">${esc(p.name)}</h2>
        <p class="note" style="font-size:16px">${esc(p.tagline || '')}</p>
        <div class="chip-row" style="margin:14px 0 20px">${chipsFor(p)}</div>
        <span class="eyebrow">為什麼是 TA</span>
        <ul class="reasons">${c.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        <span class="eyebrow" style="margin-top:18px">第一句怎麼說</span>
        <p class="opener">${esc(c.opener)}</p>
      </div>
      <div class="present__bar" style="margin-top:18px">
        <button class="btn btn--sm" data-present-prev>← 上一張</button>
        <div class="present__dots">${cards.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <button class="btn btn--sm" data-present-next>下一張 →</button>
        <button class="btn btn--sm btn--ghost" data-present-close style="margin-left:auto">關閉 ✕</button>
      </div>
    </div>`;
}

// ── boot ────────────────────────────────────────────────────────────────────
(async function boot() {
  mountDecorations();
  try {
    state.config = await api('/api/event');
  } catch (err) {
    app.innerHTML = `<div class="empty"><h3>連不到伺服器</h3><p class="note">${esc(err.message)}</p></div>`;
    return;
  }
  if (state.token) {
    try {
      const me = await api('/api/me');
      state.me = me.profile;
      state.screen = 'brief';
      await loadBrief();
    } catch {
      localStorage.removeItem('smg.token');
      state.token = null;
    }
  }
  render();
})();
