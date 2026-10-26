// Slides Meets Gamma — zero-dependency Node server (Node >= 22)
// 1. 活動參加者註冊（名字 + 三軸 + 意圖 + 選填聯絡方式）
// 2. 配對 brief：3 張卡，每張卡有 reasons / uncertainty / opener，永遠不顯示分數
// 3. two-yes consent：雙方都按「想認識」才交換聯絡方式
// 4. 可選 Gamma Public API：把配對做成一份真的 deck（會消耗該帳號 credits）
//
// 隱私原則（沿用 Coffee Meets Codex / Music Meets Alexa 的做法）：
// - 聯絡方式在雙方同意前完全不出現在任何 API 回應裡
// - 任何人都可以刪掉自己的資料
// - demo 資料與真實資料分開，不混用

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomBytes } from 'node:crypto';

import { INTENTS, BUILDING, TASTE, TOPICS } from './data/catalog.js';
import { DEMO_CAST } from './data/demo-cast.js';
import { scoreMatch, makeCard, publicProfile, overlap } from './data/matching.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = process.env.DATA_FILE || path.join(DATA_DIR, 'attendees.json');
const BRIEF_SIZE = Number(process.env.BRIEF_SIZE || 3);

const EVENT = {
  id: process.env.EVENT_ID || 'gamma-community',
  name: process.env.EVENT_NAME || 'Gamma Community Exclusive',
  nameZh: process.env.EVENT_NAME_ZH || 'Gamma 社群專屬',
  motto: 'Everyone brings a deck.',
  mottoZh: '每個人都有一份 deck 可以介紹自己。',
  date: process.env.EVENT_DATE || '',
};

// ── store ────────────────────────────────────────────────────────────────────
let db = { eventId: EVENT.id, attendees: {}, intros: {} };
let saveQueue = Promise.resolve();

async function load() {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    db = {
      eventId: parsed.eventId || EVENT.id,
      attendees: parsed.attendees || {},
      intros: parsed.intros || {},
    };
  } catch {
    db = { eventId: EVENT.id, attendees: {}, intros: {} };
  }
}

function save() {
  saveQueue = saveQueue.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
    await rename(tmp, DATA_FILE);
  });
  return saveQueue;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const now = () => new Date().toISOString();
const token = () => randomBytes(24).toString('base64url');
const safeEqual = (a, b) => a && b && a.length === b.length && a === b;

function pick(list, max = 3) {
  return Array.isArray(list) ? [...new Set(list)].filter(Boolean).slice(0, max) : [];
}

function sanitizeProfile(body) {
  const intentions = pick(body.intentions, 3).filter((i) => INTENTS.some((x) => x.id === i));
  const building = pick(body.building, 4).filter((i) => BUILDING.some((x) => x.id === i));
  const taste = pick(body.taste, 4).filter((i) => TASTE.some((x) => x.id === i));
  const topics = pick(body.topics, 5).filter((i) => TOPICS.some((x) => x.id === i));
  return {
    displayName: String(body.displayName || '').trim().slice(0, 40),
    tagline: String(body.tagline || '').trim().slice(0, 120),
    contact: String(body.contact || '').trim().slice(0, 120),
    intentions,
    building,
    taste,
    topics,
    mode: body.mode === 'demo' ? 'demo' : 'live',
  };
}

function validProfile(p) {
  return (
    p.displayName.length > 0 &&
    p.intentions.length > 0 &&
    p.building.length > 0 &&
    p.taste.length > 0 &&
    p.topics.length > 0
  );
}

function poolFor(profile) {
  // demo 參加者只看到 demo cast；真實參加者只看到真實參加者。兩池不混。
  if (profile.mode === 'demo') {
    return DEMO_CAST.map((p, i) => ({
      ...p,
      mode: 'demo',
      status: 'active',
      createdAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    }));
  }
  return Object.values(db.attendees).filter(
    (p) => p.mode === 'live' && p.status === 'active' && p.id !== profile.id
  );
}

function candidatesFor(profile) {
  const pool = poolFor(profile);
  const scored = [];
  for (const other of pool) {
    const sharedIntent = overlap(profile.intentions, other.intentions);
    if (!sharedIntent.length) continue;
    const m = scoreMatch(profile, other);
    scored.push({ other, m, sharedIntent });
  }
  scored.sort(
    (a, b) =>
      b.m.score - a.m.score ||
      String(a.other.createdAt || '').localeCompare(String(b.other.createdAt || ''))
  );
  // 完全沒有交集的最後一名也留著，總比給一張空卡好
  return scored.slice(0, BRIEF_SIZE);
}

// ── optional live scout (OpenAI-compatible) ─────────────────────────────────
const SCOUT_KEY = process.env.SCOUT_API_KEY || '';
const SCOUT_BASE = (process.env.SCOUT_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const SCOUT_MODEL = process.env.SCOUT_MODEL || 'gpt-4o-mini';
const scoutLive = () => Boolean(SCOUT_KEY);

async function liveScout(me, other, card) {
  const prompt = [
    '你是 Gamma 社群活動的配對助手。用繁體中文，回答兩件事，只回傳 JSON：',
    '{"reason2":"一個具體、只根據以下事實的共同點理由","opener":"一句讓雙方可以立刻開始聊天的破冰問題"}',
    '禁止：編造對方做過的事、給相容度分數、使用「一定」「完美」等字眼。',
    `我的 deck 品味：${me.taste.join(',')}｜我在做：${me.building.join(',')}｜我想聊：${me.topics.join(',')}`,
    `對方的 deck 品味：${other.taste.join(',')}｜對方在做：${other.building.join(',')}｜對方想聊：${other.topics.join(',')}`,
    `對方簡介：${other.tagline || '(沒有)'}`,
    `已知共同點：${JSON.stringify(card.sharedLabels)}`,
    `理由一（已經寫好，直接沿用）：${card.reasons[0]}`,
  ].join('\n');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${SCOUT_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SCOUT_KEY}` },
      body: JSON.stringify({
        model: SCOUT_MODEL,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.reason2 || !parsed?.opener) return null;
    return { reason2: String(parsed.reason2).slice(0, 160), opener: String(parsed.opener).slice(0, 160) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── optional Gamma Public API ────────────────────────────────────────────────
const GAMMA_KEY = process.env.GAMMA_API_KEY || '';
const gammaConfigured = () => Boolean(GAMMA_KEY);
const gammaKeyStore = new Map(); // generationId -> { key, expires }
const GAMMA_BASE = 'https://public-api.gamma.app/v1.0';

function deckPromptFor(intro, me, other) {
  const shared = intro.shared || {};
  const lines = [];
  lines.push(`# 你們的共同 deck：${me.displayName} × ${other.displayName}`);
  lines.push('');
  lines.push('## 兩個人');
  lines.push(`${me.displayName}：${me.tagline || '（還沒寫一句話）'}`);
  lines.push(`${other.displayName}：${other.tagline || '（還沒寫一句話）'}`);
  lines.push('');
  lines.push('## 共同點');
  const chips = [
    ...(shared.building || []),
    ...(shared.taste || []),
    ...(shared.topics || []),
  ].filter(Boolean);
  lines.push(chips.length ? chips.join('、') : '（現場才會發現的共同點）');
  lines.push('');
  lines.push('## 一起做 deck 的三個點子');
  lines.push(`1. 你們各自做一份「${me.building?.[0] || 'pitch'}」，現場交換第一頁`);
  lines.push('2. 把你們共同的主題做成 3 張卡：問題、方法 surprising example、結論');
  lines.push('3. 現場用 90 秒互相講，講完交換 deck 連結');
  lines.push('');
  lines.push('## 第一個挑戰');
  lines.push('在不超過 5 分鐘內，講出一件你最近才想通的事。');
  return lines.join('\n');
}

async function gammaCreate({ inputText, numCards, themeId, key }) {
  const body = {
    inputText,
    textMode: 'preserve',
    format: 'presentation',
    numCards: numCards || 4,
    exportAs: 'pdf',
  };
  if (themeId) body.themeId = themeId;
  const res = await fetch(`${GAMMA_BASE}/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, raw: text.slice(0, 400) };
}

async function gammaStatus(id, key) {
  const res = await fetch(`${GAMMA_BASE}/generations/${id}`, {
    headers: { 'X-API-KEY': key },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, raw: text.slice(0, 400) };
}

// ── HTTP plumbing ────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256 * 1024) throw new Error('payload too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('invalid json');
  }
}

function authOf(req, url) {
  const header = req.headers['x-smg-token'];
  if (header) return String(header);
  if (url?.searchParams?.get('token')) return url.searchParams.get('token');
  return '';
}

function requireAuth(req, res, url) {
  const t = authOf(req, url);
  const me = Object.values(db.attendees).find((p) => safeEqual(p.token, t));
  if (!me) {
    send(res, 401, { error: '通行證不見了，請重新加入。' });
    return null;
  }
  return me;
}

async function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  rel = rel.replace(/\.\./g, '');
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'nope' });
  try {
    const buf = await readFile(file);
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 — 這裡沒有東西。');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;
  const method = req.method;

  if (!pathname.startsWith('/api/')) {
    if (method !== 'GET') return send(res, 405, { error: 'method not allowed' });
    return serveStatic(req, res, pathname);
  }

  try {
    // ── event meta ──────────────────────────────────────────────────────────
    if (pathname === '/api/event' && method === 'GET') {
      const liveCount = Object.values(db.attendees).filter(
        (p) => p.mode === 'live' && p.status === 'active'
      ).length;
      return send(res, 200, {
        event: EVENT,
        catalog: { intents: INTENTS, building: BUILDING, taste: TASTE, topics: TOPICS },
        counts: { live: liveCount, demo: DEMO_CAST.length },
        scout: scoutLive() ? 'live-ai' : 'scripted',
        gamma: { configured: gammaConfigured() },
      });
    }

    if (pathname === '/api/demo-cast' && method === 'GET') {
      return send(res, 200, { cast: DEMO_CAST.map(publicProfile) });
    }

    // ── join ───────────────────────────────────────────────────────────────
    if (pathname === '/api/join' && method === 'POST') {
      const body = await readBody(req);
      const p = sanitizeProfile(body);
      if (!validProfile(p)) {
        return send(res, 400, {
          error: '名字、三個軸、意圖都要填。',
        });
      }
      const id = randomUUID();
      const profile = {
        id,
        token: token(),
        ...p,
        status: 'active',
        createdAt: now(),
      };
      db.attendees[id] = profile;
      await save();
      return send(res, 201, { id, token: profile.token, profile: publicProfile(profile) });
    }

    // ── me ─────────────────────────────────────────────────────────────────
    if (pathname === '/api/me' && method === 'GET') {
      const me = requireAuth(req, res, url);
      if (!me) return;
      return send(res, 200, { profile: publicProfile(me), status: me.status });
    }

    if (pathname === '/api/me' && method === 'DELETE') {
      const me = requireAuth(req, res, url);
      if (!me) return;
      delete db.attendees[me.id];
      for (const [id, intro] of Object.entries(db.intros)) {
        if (intro.from === me.id || intro.to === me.id) delete db.intros[id];
      }
      await save();
      return send(res, 200, { deleted: true });
    }

    if (pathname === '/api/me/status' && method === 'POST') {
      const me = requireAuth(req, res, url);
      if (!me) return;
      const body = await readBody(req);
      me.status = body.active === false ? 'paused' : 'active';
      await save();
      return send(res, 200, { status: me.status });
    }

    // ── brief ──────────────────────────────────────────────────────────────
    if (pathname === '/api/brief' && method === 'GET') {
      const me = requireAuth(req, res, url);
      if (!me) return;
      const intention = url.searchParams.get('intention');
      const scoped = intention
        ? { ...me, intentions: [intention] }
        : me;
      const picked = candidatesFor(scoped);
      const cards = picked.map(({ other, m }) => makeCard(me, other, m));

      // optional live scout — 失敗就安靜地用腳本版
      let engine = 'scripted';
      if (scoutLive() && cards.length) {
        const enriched = await Promise.all(
          cards.map(async (card, i) => {
            const other = picked[i].other;
            const live = await liveScout(me, other, card);
            if (!live) return card;
            return { ...card, reasons: [card.reasons[0], live.reason2], opener: live.opener };
          })
        );
        if (enriched.some((c, i) => c !== cards[i])) {
          cards.splice(0, cards.length, ...enriched);
          engine = 'live-ai';
        }
      }

      const othersInPool = poolFor(me).length;
      return send(res, 200, {
        engine,
        intention: intention || me.intentions[0],
        poolSize: othersInPool,
        cards,
      });
    }

    // ── introductions (two-yes consent) ────────────────────────────────────
    if (pathname === '/api/interest' && method === 'POST') {
      const me = requireAuth(req, res, url);
      if (!me) return;
      const body = await readBody(req);
      const targetId = String(body.targetId || '');
      const target =
        me.mode === 'demo'
          ? DEMO_CAST.find((c) => c.id === targetId)
          : db.attendees[targetId];
      if (!target) return send(res, 404, { error: '找不到這位參加者。' });
      if (target.id === me.id) return send(res, 400, { error: '不能認識自己。' });

      const existing = Object.values(db.intros).find(
        (i) => i.from === me.id && i.to === target.id && i.status !== 'declined'
      );
      if (existing) return send(res, 200, { intro: viewIntro(existing, me) });

      const m = scoreMatch(me, target);
      const id = randomUUID();
      const intro = {
        id,
        eventId: EVENT.id,
        from: me.id,
        to: target.id,
        fromName: me.displayName,
        toName: target.displayName,
        intention: body.intention || me.intentions[0],
        shared: m.shared,
        fromYes: true,
        toYes: false,
        status: 'pending',
        createdAt: now(),
      };
      db.intros[id] = intro;
      await save();
      return send(res, 201, { intro: viewIntro(intro, me) });
    }

    if (pathname === '/api/intros' && method === 'GET') {
      const me = requireAuth(req, res, url);
      if (!me) return;
      const list = Object.values(db.intros)
        .filter((i) => i.from === me.id || i.to === me.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((i) => viewIntro(i, me));
      return send(res, 200, { intros: list });
    }

    if (pathname.startsWith('/api/interest/') && method === 'POST') {
      const me = requireAuth(req, res, url);
      if (!me) return;
      const id = pathname.split('/')[3];
      const action = pathname.split('/')[4] || '';
      const intro = db.intros[id];
      if (!intro) return send(res, 404, { error: '這筆介紹不存在了。' });
      if (intro.from !== me.id && intro.to !== me.id) {
        return send(res, 403, { error: '這不是你的介紹。' });
      }
      const body = await readBody(req);

      if (action === 'respond') {
        const accept = body.action === 'accept';
        if (intro.from === me.id) intro.fromYes = accept ? true : false;
        else intro.toYes = accept ? true : false;
        if (!accept) intro.status = 'declined';
        else intro.status = intro.fromYes && intro.toYes ? 'accepted' : 'pending';
        await save();
        return send(res, 200, { intro: viewIntro(intro, me) });
      }

      if (action === 'cancel') {
        intro.status = 'cancelled';
        await save();
        return send(res, 200, { intro: viewIntro(intro, me) });
      }

      return send(res, 400, { error: 'unknown action' });
    }

    // ── Gamma deck generation (optional, costs the caller's credits) ───────
    if (pathname === '/api/gamma/deck' && method === 'POST') {
      const me = requireAuth(req, res, url);
      if (!me) return;
      const body = await readBody(req);
      const intro = db.intros[body.introId];
      if (!intro || (intro.from !== me.id && intro.to !== me.id)) {
        return send(res, 404, { error: '先完成雙方同意，才能一起產出 deck。' });
      }
      if (intro.status !== 'accepted') {
        return send(res, 400, { error: '還沒人按下第二次「想認識」。' });
      }
      const key = String(body.gammaKey || GAMMA_KEY || '');
      if (!key) {
        return send(res, 400, {
          error: '沒有可用的 Gamma API key。貼上你自己的 sk-gamma-… 金鑰，這次產出會算在你的帳號上。',
          needsKey: true,
        });
      }
      const otherId = intro.from === me.id ? intro.to : intro.from;
      const other =
        me.mode === 'demo'
          ? DEMO_CAST.find((c) => c.id === otherId) || { displayName: intro.toName, tagline: '' }
          : db.attendees[otherId];
      const inputText = deckPromptFor(intro, me, other || { displayName: '?', tagline: '' });
      const result = await gammaCreate({
        inputText,
        numCards: Number(body.numCards) || 4,
        themeId: body.themeId,
        key,
      });
      if (!result.ok) {
        return send(res, result.status >= 400 ? result.status : 502, {
          error: 'Gamma API 沒有接受這次請求。',
          detail: result.json || result.raw,
        });
      }
      const genId = result.json?.id || result.json?.generationId;
      if (!genId) return send(res, 502, { error: 'Gamma 回應格式不如預期。', detail: result.json });
      gammaKeyStore.set(genId, { key, expires: Date.now() + 30 * 60 * 1000 });
      return send(res, 201, { generationId: genId, inputText, engine: 'gamma-public-api' });
    }

    if (pathname.startsWith('/api/gamma/status/') && method === 'GET') {
      requireAuth(req, res, url);
      const genId = pathname.split('/')[4];
      const stored = gammaKeyStore.get(genId);
      if (!stored || stored.expires < Date.now()) {
        return send(res, 410, { error: '這次產出的金鑰已過期，請重新送出。' });
      }
      const result = await gammaStatus(genId, stored.key);
      return send(res, 200, result.json || { error: result.raw });
    }

    return send(res, 404, { error: 'no such endpoint' });
  } catch (err) {
    return send(res, 500, { error: err?.message || 'server error' });
  }
});

// ── intro view: contact 只在雙方同意後出現 ───────────────────────────────────
function viewIntro(intro, me) {
  const iAmFrom = intro.from === me.id;
  const otherId = iAmFrom ? intro.to : intro.from;
  const other =
    me.mode === 'demo'
      ? DEMO_CAST.find((c) => c.id === otherId)
      : db.attendees[otherId];
  const accepted = intro.status === 'accepted';
  return {
    id: intro.id,
    direction: iAmFrom ? 'sent' : 'received',
    intention: intro.intention,
    status: intro.status,
    shared: intro.shared,
    other: other ? publicProfile(other) : { id: otherId, name: intro.toName || '?', tagline: '' },
    // 聯絡方式只在 accepted 之後才會出現在回應裡
    contact: accepted && other && other.contact ? other.contact : null,
    contactHint:
      accepted && (!other || !other.contact)
        ? '這位沒留聯絡方式——現場直接找 TA。'
        : null,
    createdAt: intro.createdAt,
  };
}

await load();
server.listen(PORT, () => {
  console.log(`\n  Slides Meets Gamma`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  event: ${EVENT.name} (${EVENT.id})`);
  console.log(`  scout: ${scoutLive() ? `live-ai (${SCOUT_MODEL})` : 'scripted'}`);
  console.log(`  gamma api: ${gammaConfigured() ? 'configured' : 'not configured (貼上自己的 key 即可)'}\n`);
});
