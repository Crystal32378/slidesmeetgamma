import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Execute the actual UI functions with a minimal DOM and mock-only API.
// No browser bootstrap, network calls, or paid API credentials are used.
const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/m, '')
  .split('// ── boot')[0];
function harness(handler, sleep = (fn) => queueMicrotask(fn)) {
  const listeners = {};
  const context = vm.createContext({
    URL, AbortController, console, confirm: () => true,
    localStorage: { getItem: () => null, removeItem() {}, setItem() {} },
    document: { querySelector: () => ({}), addEventListener: (name, fn) => { listeners[name] = fn; } },
    window: { addEventListener: (name, fn) => { listeners[name] = fn; } },
    setTimeout: sleep, clearTimeout() {}, mockApi: handler,
  });
  vm.runInContext(`${source}\nrender = () => {}; toast = () => {}; api = mockApi;\nstate.token = 'session-a'; state.config = { catalog: { intentions: [], building: [], topics: [], taste: [] } };\nglobalThis.ui = { state, runGamma, resetGamma, gammaForm, safeGammaUrl, deleteMe };`, context);
  return { ...context.ui, listeners, context };
}
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

test('repeat clicks create only one paid request and keep processing locked until completion', async () => {
  const gate = deferred();
  const calls = [];
  const h = harness(async (path, method, body) => {
    calls.push({ path, method, body });
    if (method === 'POST') { await gate.promise; return { generationId: 'job' }; }
    assert.equal(h.state.gamma.gen, 'intro');
    assert.match(h.gammaForm({ id: 'intro' }), /data-gamma-run="intro" disabled/);
    return { status: 'completed', gammaUrl: 'https://gamma.app/docs/example' };
  });
  h.state.gamma.key = 'mock-key';
  const first = h.runGamma('intro');
  await h.runGamma('intro');
  await h.runGamma('another-intro');
  assert.equal(calls.length, 1);
  assert.equal(h.state.gamma.key, '');
  gate.resolve();
  await first;
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1);
  assert.equal(h.state.gamma.gen, null);
  assert.equal(h.state.gamma.result.url, 'https://gamma.app/docs/example');
});

test('closing panel clears typed key without cancelling a submitted generation', async () => {
  const gate = deferred();
  const h = harness(async (path, method) => method === 'POST' ? gate.promise : { status: 'completed', url: 'https://gamma.app/docs/example' });
  const running = h.runGamma('intro');
  h.state.gamma.open = 'intro';
  h.state.gamma.key = 'leftover';
  await h.listeners.click({ target: { closest: (selector) => selector === '[data-gamma-cancel]' ? {} : null } });
  assert.equal(h.state.gamma.open, null);
  assert.equal(h.state.gamma.key, '');
  assert.equal(h.state.gamma.gen, 'intro');
  gate.resolve({ generationId: 'job' });
  await running;
  assert.equal(h.state.gamma.result.url, 'https://gamma.app/docs/example');
});

test('deletion clears key and prevents late generation responses from restoring state', async () => {
  const gate = deferred();
  let polls = 0;
  const h = harness(async (path, method) => {
    if (method === 'DELETE') return {};
    if (method === 'POST') return gate.promise;
    polls += 1;
  });
  h.state.gamma.key = 'mock-key';
  const running = h.runGamma('intro');
  await h.deleteMe();
  gate.resolve({ generationId: 'job' });
  await running;
  assert.equal(h.state.token, null);
  assert.equal(h.state.gamma.key, '');
  assert.equal(h.state.gamma.result, null);
  assert.equal(h.state.gamma.gen, null);
  assert.equal(polls, 0);
});

test('late polling result after pagehide cannot restore old session data', async () => {
  const gate = deferred(), polling = deferred();
  const h = harness(async (path, method) => {
    if (method === 'POST') return { generationId: 'job' };
    polling.resolve();
    return gate.promise;
  });
  const running = h.runGamma('intro');
  await polling.promise;
  h.listeners.pagehide();
  h.state.token = 'session-b';
  gate.resolve({ status: 'completed', gammaUrl: 'https://gamma.app/docs/old' });
  await running;
  assert.equal(h.state.gamma.result, null);
  assert.equal(h.state.gamma.error, null);
});

for (const status of [401, 403, 404, 410]) test(`terminal ${status} polling error stops immediately`, async () => {
  let polls = 0;
  const h = harness(async (path, method) => {
    if (method === 'POST') return { generationId: 'job' };
    polls += 1;
    throw Object.assign(new Error('Expired or unavailable'), { status });
  });
  await h.runGamma('intro');
  assert.equal(polls, 1);
  assert.match(h.state.gamma.error, /已停止查詢/);
  assert.equal(h.state.gamma.gen, null);
});

test('unknown create outcome warns about duplicate credit spend without retrying', async () => {
  let calls = 0;
  const h = harness(async () => { calls += 1; throw new Error('Network unavailable'); });
  await h.runGamma('intro');
  assert.equal(calls, 1);
  assert.match(h.state.gamma.error, /重送可能再次消耗點數/);
});

test('only complete results with an HTTPS URL render an open-deck link', () => {
  const h = harness(async () => {});
  // The card template uses result URL validity, not merely its intro ID.
  assert.equal(h.safeGammaUrl(''), '');
  assert.equal(h.safeGammaUrl('javascript:alert(1)'), '');
  assert.equal(h.safeGammaUrl('https://gamma.app/docs/example'), 'https://gamma.app/docs/example');
  h.state.gamma.result = { introId: 'intro', status: 'processing', url: '' };
  // Intro card requires only its persisted status and participant labels here.
  const card = vm.runInContext(`introItem({ id: 'intro', status: 'accepted', direction: 'sent', other: { name: 'B', building: [], topics: [], taste: [] }, intention: 'inspire' })`, h.context);
  assert.doesNotMatch(card, /打開共同 deck/);
  h.state.gamma.result = { introId: 'intro', status: 'completed', url: 'https://gamma.app/docs/example' };
  const complete = vm.runInContext(`introItem({ id: 'intro', status: 'accepted', direction: 'sent', other: { name: 'B', building: [], topics: [], taste: [] }, intention: 'inspire' })`, h.context);
  assert.match(complete, /打開共同 deck/);
});

test('transient polling error retries only status, not paid generation', async () => {
  let creates = 0, polls = 0;
  const h = harness(async (path, method) => {
    if (method === 'POST') { creates += 1; return { generationId: 'job' }; }
    if (++polls === 1) throw Object.assign(new Error('Temporarily unavailable'), { status: 503 });
    return { status: 'completed', gammaUrl: 'https://gamma.app/docs/example' };
  });
  await h.runGamma('intro');
  assert.equal(creates, 1);
  assert.equal(polls, 2);
  assert.equal(h.state.gamma.result.url, 'https://gamma.app/docs/example');
});

test('polling timeout does not promise success or automatically regenerate', async () => {
  let creates = 0, polls = 0;
  const h = harness(async (path, method) => {
    if (method === 'POST') { creates += 1; return { generationId: 'job' }; }
    polls += 1;
    return { status: 'processing' };
  });
  await h.runGamma('intro');
  assert.equal(creates, 1);
  assert.equal(polls, 80);
  assert.equal(h.state.gamma.result.url, '');
  assert.match(h.state.gamma.error, /無法確認產出結果/);
  assert.equal(h.state.gamma.gen, null);
});
