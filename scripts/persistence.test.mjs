import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createSaver } from '../data/persistence.js';

test('custom DATA_FILE nested parent is created and atomically saved', async (t) => {
  const dir = await mkdtemp(`${tmpdir()}/smg-persistence-`);
  t.after(() => rm(dir, { recursive: true, force: true }));
  const filename = `${dir}/custom/nested/attendees.json`;
  const snapshot = { attendees: { one: { displayName: 'Test' } } };
  await createSaver(filename, () => snapshot)();
  assert.deepEqual(JSON.parse(await readFile(filename, 'utf8')), snapshot);
  await assert.rejects(access(`${filename}.tmp`), { code: 'ENOENT' });
});

test('a failed write rejects its caller but queued and subsequent saves recover', async () => {
  let attempts = 0;
  const renamed = [];
  const io = {
    async mkdir() {},
    async writeFile() {
      if (++attempts === 1) throw new Error('temporary disk failure');
    },
    async rename(from, to) { renamed.push([from, to]); },
  };
  const save = createSaver('/custom/data.json', () => ({ attempts }), io);
  const first = save();
  const second = save();
  await assert.rejects(first, /temporary disk failure/);
  await second;
  await save();
  assert.equal(attempts, 3);
  assert.deepEqual(renamed, [
    ['/custom/data.json.tmp', '/custom/data.json'],
    ['/custom/data.json.tmp', '/custom/data.json'],
  ]);
});

test('overlapping saves never write or rename the same temporary file concurrently', async () => {
  const calls = [];
  const io = {
    async mkdir() {},
    async writeFile() {
      calls.push('write');
      await new Promise((resolve) => setTimeout(resolve, 10));
    },
    async rename() { calls.push('rename'); },
  };
  const save = createSaver('/custom/data.json', () => ({}), io);
  await Promise.all([save(), save(), save()]);
  assert.deepEqual(calls, ['write', 'rename', 'write', 'rename', 'write', 'rename']);
});
