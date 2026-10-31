import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

// Serialize atomic writes without letting one failed write poison later saves.
export function createSaver(filename, snapshot, io = { mkdir, writeFile, rename }) {
  let queue = Promise.resolve();
  return function save() {
    const pending = queue.then(async () => {
      await io.mkdir(path.dirname(filename), { recursive: true });
      const temporary = `${filename}.tmp`;
      await io.writeFile(temporary, JSON.stringify(snapshot(), null, 2), 'utf8');
      await io.rename(temporary, filename);
    });
    queue = pending.catch(() => {});
    return pending;
  };
}
