import { appendFile, access, writeFile } from 'node:fs/promises';

// Fail closed: this child process cannot make real API requests.
globalThis.fetch = async (url, options = {}) => {
  await appendFile(process.env.MOCK_GAMMA_CALLS, `${options.method || 'GET'} ${url}\n`);
  if (url === 'https://public-api.gamma.app/v1.0/generations' && options.method === 'POST') {
    if (options.headers['X-API-KEY'] !== 'mock-key') throw new Error('Unexpected test key');
    if (process.env.MOCK_GAMMA_DELAY) {
      await writeFile(`${process.env.MOCK_GAMMA_DELAY}.started`, 'started');
      while (true) {
        try { await access(`${process.env.MOCK_GAMMA_DELAY}.release`); break; } catch {}
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    return Response.json({ generationId: 'mock-generation' });
  }
  if (url === 'https://public-api.gamma.app/v1.0/generations/mock-generation') {
    if (options.headers['X-API-KEY'] !== 'mock-key') throw new Error('Unexpected test key');
    return Response.json({ status: 'completed', gammaUrl: 'https://gamma.app/docs/mock-deck' });
  }
  throw new Error(`External network disabled in Gamma tests: ${url}`);
};
