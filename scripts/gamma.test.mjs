import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { GammaJobs } from '../data/gamma-jobs.js';

const entry = { key: 'mock-key', ownerId: 'a', participantIds: ['a', 'b'] };
test('credentials expire at the boundary and cleanup removes idle jobs', () => {
  let now = 0;
  const store = new GammaJobs({ now: () => now, ttl: 100 });
  store.set('one', entry);
  now = 99;
  assert.equal(store.get('one').key, 'mock-key');
  now = 100;
  store.cleanup();
  assert.equal(store.jobs.size, 0);
  assert.equal(store.get('one'), undefined);
  store.set('two', entry);
  now = 200;
  assert.equal(store.get('two'), undefined);
  assert.equal(store.jobs.size, 0);
});

test('deleting either participant erases associated keys only', () => {
  const store = new GammaJobs();
  store.set('one', entry);
  store.set('other', { key: 'other', ownerId: 'c', participantIds: ['c', 'd'] });
  store.deleteForAttendee('b');
  assert.equal(store.get('one'), undefined);
  assert.equal(store.get('other').key, 'other');
  store.deleteForAttendee('c');
  assert.equal(store.jobs.size, 0);
});

for (const delayed of [false, true]) test(`Gamma routes enforce authorization and deletion (delayed create: ${delayed})`, async (t) => {
  const dir = await mkdtemp(`${tmpdir()}/smg-gamma-`);
  const root = fileURLToPath(new URL('..', import.meta.url));
  const child = spawn(process.execPath, ['--import', './scripts/fixtures/gamma-fetch.mjs', 'server.mjs'], {
    cwd: root,
    env: { ...process.env, PORT: '0', DATA_FILE: `${dir}/data.json`, GAMMA_API_KEY: '', SCOUT_API_KEY: '', MOCK_GAMMA_CALLS: `${dir}/calls`, MOCK_GAMMA_DELAY: delayed ? `${dir}/gate` : '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
    await rm(dir, { recursive: true, force: true });
  });
  let logs = '';
  child.stderr.on('data', (chunk) => { logs += chunk; });
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server startup timeout: ${logs}`)), 5000);
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/http:\/\/localhost:(\d+)/);
      if (match) { clearTimeout(timeout); resolve(`http://127.0.0.1:${match[1]}`); }
    });
    child.once('exit', () => { clearTimeout(timeout); reject(new Error(`Server exited: ${logs}`)); });
  });
  async function req(path, token, method = 'GET', body) {
    const res = await fetch(base + path, {
      method,
      headers: { ...(token ? { 'x-smg-token': token } : {}), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  }
  async function join(displayName) {
    const result = await req('/api/join', null, 'POST', {
      displayName, intentions: ['inspire'], building: ['pitch'], taste: ['surreal'], topics: ['storytelling'], mode: 'live',
    });
    assert.equal(result.status, 201);
    return result.body;
  }
  const a = await join('A'), b = await join('B'), c = await join('C');
  const intro = (await req('/api/interest', a.token, 'POST', { targetId: b.id })).body.intro;
  const create = () => req('/api/gamma/deck', a.token, 'POST', { introId: intro.id, gammaKey: 'mock-key' });
  assert.equal((await create()).status, 400, 'pending consent cannot generate');
  await req(`/api/interest/${intro.id}/respond`, b.token, 'POST', { action: 'accept' });
  if (delayed) {
    const creating = create();
    // Wait for the mock to enter the external call before deleting the participant.
    let started = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      try { await access(`${dir}/gate.started`); started = true; break; } catch {}
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(started, true, 'mock create started');
    await req('/api/me', b.token, 'DELETE');
    await writeFile(`${dir}/gate.release`, 'release');
    assert.equal((await creating).status, 410, 'deleted intro cannot retain arriving credentials');
    assert.equal((await req('/api/gamma/status/mock-generation', a.token)).status, 410);
    assert.equal((await readFile(`${dir}/calls`, 'utf8')).trim().split('\n').length, 1);
    return;
  }
  const made = await create();
  assert.equal(made.status, 201);
  const route = `/api/gamma/status/${made.body.generationId}`;
  assert.equal((await req(route)).status, 401);
  assert.equal((await req(route, 'invalid')).status, 401);
  assert.equal((await req(route, c.token)).status, 410, 'unrelated attendee cannot use cached credentials');
  assert.equal((await req(route, b.token)).status, 410, 'only the generating attendee may poll');
  assert.equal((await readFile(`${dir}/calls`, 'utf8')).trim().split('\n').length, 1, 'unauthorized polling never contacts Gamma');
  const owner = await req(route, a.token);
  assert.equal(owner.status, 200);
  assert.equal(owner.body.status, 'completed');
  assert.equal((await req('/api/gamma/status/unknown', a.token)).status, 410);
  await req('/api/me', b.token, 'DELETE');
  assert.equal((await req(route, a.token)).status, 410, 'participant deletion erases job');
  await req('/api/me', a.token, 'DELETE');
  assert.equal((await req(route, a.token)).status, 401);
  assert.equal((await req('/api/event')).status, 200, 'unauthenticated polling did not crash server');
  assert.equal(logs, '');
});
