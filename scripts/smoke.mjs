// 煙霧測試：真的啟動 server、真的走一遍參加 → 配對 → 雙方同意 → 刪除。
// 用一次性資料檔，跑完不碰正式 data/attendees.json。
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8099;
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_FILE = '/tmp/smg-smoke-data.json';

let passed = 0;
let failed = 0;
function check(name, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

async function req(pathname, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['x-smg-token'] = token;
  const res = await fetch(BASE + pathname, {
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
  return { status: res.status, data };
}

const profile = (name, contact, taste = 'surreal') => ({
  displayName: name,
  tagline: `${name} 的 deck 封面。`,
  contact,
  intentions: ['inspire'],
  building: ['pitch'],
  taste: [taste],
  topics: ['storytelling'],
  mode: 'live',
});

await rm(DATA_FILE, { force: true });
const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.mjs')], {
  env: { ...process.env, PORT: String(PORT), DATA_FILE, EVENT_ID: 'smoke-test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

// 等 server 起來
for (let i = 0; i < 60; i += 1) {
  try {
    const r = await fetch(`${BASE}/api/event`);
    if (r.ok) break;
  } catch {
    /* retry */
  }
  await new Promise((r) => setTimeout(r, 120));
}

console.log('\nSlides Meets Gamma · smoke test\n');

const event = await req('/api/event');
check('GET /api/event 回傳活動設定', event.status === 200 && !!event.data?.event?.name);
check('目錄有四組軸（intents/building/taste/topics）', Object.keys(event.data?.catalog || {}).length === 4);

const join1 = await req('/api/join', { method: 'POST', body: profile('Alpha', 'alpha@example.com') });
const join2 = await req('/api/join', { method: 'POST', body: profile('Beta', 'beta@example.com') });
check('POST /api/join 建檔成功', join1.status === 201 && join2.status === 201);
check('join 回傳通行證', !!join1.data?.token && !!join2.data?.token);

const bad = await req('/api/join', { method: 'POST', body: { displayName: 'X' } });
check('缺欄位時拒絕（400）', bad.status === 400);

const brief = await req('/api/brief', { token: join1.data.token });
check('GET /api/brief 有卡', brief.status === 200 && brief.data.cards.length >= 1);
const card = brief.data.cards?.[0];
check('卡上有 reasons / uncertainty / opener', !!card?.reasons?.length && !!card?.uncertainty && !!card?.opener);
check('卡上沒有 contact（未同意前不洩漏）', !JSON.stringify(brief.data).includes('alpha@example.com'));

// demo 模式：只配對到 8 位虛構角色，且不混入真人
const demoJoin = await req('/api/join', {
  method: 'POST',
  body: { ...profile('DemoUser', 'demo@example.com'), mode: 'demo' },
});
const demoBrief = await req('/api/brief', { token: demoJoin.data.token });
check('demo 模式拿到 3 張卡', demoBrief.status === 200 && demoBrief.data.cards.length === 3);
check('demo pool 裡只有虛構角色', demoBrief.data.poolSize === 8);
check(
  'demo 卡不會混進真人參加者',
  demoBrief.data.cards.every((c) => c.profile.mode === 'demo')
);

const interest = await req('/api/interest', {
  method: 'POST',
  token: join1.data.token,
  body: { targetId: join2.data.id },
});
check('POST /api/interest 建立 Pending', interest.status === 201 && interest.data.intro.status === 'pending');

const pending = await req('/api/intros', { token: join2.data.token });
const received = pending.data.intros?.find((i) => i.direction === 'received');
check('對方收到請求且還沒有 contact', !!received && !received.contact);

const accepted = await req(`/api/interest/${interest.data.intro.id}/respond`, {
  method: 'POST',
  token: join2.data.token,
  body: { action: 'accept' },
});
check('雙方同意後狀態為 accepted', accepted.data.intro.status === 'accepted');
check('同意後才出現 contact（接收方看到的是對方的）', accepted.data.intro.contact === 'alpha@example.com');

const senderView = await req('/api/intros', { token: join1.data.token });
const sent = senderView.data.intros?.find((i) => i.direction === 'sent');
check('發起方也拿到對方 contact', sent?.contact === 'beta@example.com');

const noAuth = await req('/api/brief');
check('沒有通行證時 401', noAuth.status === 401);

const gammaNoKey = await req('/api/gamma/deck', {
  method: 'POST',
  token: join1.data.token,
  body: { introId: interest.data.intro.id },
});
check('沒有 Gamma key 時明確拒絕', gammaNoKey.status === 400 && gammaNoKey.data.needsKey === true);

const del = await req('/api/me', { method: 'DELETE', token: join1.data.token });
check('DELETE /api/me 刪除成功', del.status === 200 && del.data.deleted === true);
const after = await req('/api/me', { token: join1.data.token });
check('刪除後通行證失效', after.status === 401);

child.kill();
await rm(DATA_FILE, { force: true });
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
