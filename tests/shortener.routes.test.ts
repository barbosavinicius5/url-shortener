import { createServer, Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { UrlStore } from '../src/store/url.store';

const servers: Server[] = [];

async function startApp(port = 0, codeGenerator?: () => string): Promise<string> {
  const server = createServer(createApp(new UrlStore(), 3000, codeGenerator));
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Server did not bind');
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
});

describe('shortener HTTP API', () => {
  it('creates a URL and redirects to it while tracking hits', async () => {
    const base = await startApp();
    const create = await fetch(`${base}/shorten`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com/page' }) });
    expect(create.status).toBe(201);
    const created = await create.json() as { code: string; shortUrl: string };
    expect(created.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(created.shortUrl).toBe(`http://localhost:3000/${created.code}`);

    const redirect = await fetch(`${base}/${created.code}`, { redirect: 'manual' });
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get('location')).toBe('https://example.com/page');
    const stats = await fetch(`${base}/${created.code}/stats`);
    expect(await stats.json()).toEqual({ code: created.code, url: 'https://example.com/page', hits: 1 });
  });

  it('does not change hits when reading stats', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/shorten`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'http://example.com' }) });
    const { code } = await response.json() as { code: string };
    expect((await (await fetch(`${base}/${code}/stats`)).json()).hits).toBe(0);
    expect((await (await fetch(`${base}/${code}/stats`)).json()).hits).toBe(0);
  });

  it('returns 404 for unknown redirect and stats codes', async () => {
    const base = await startApp();
    for (const path of ['/missing', '/missing/stats']) {
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Short code not found' });
    }
  });

  it.each([undefined, 42, '', 'ftp://example.com'])('rejects invalid URL payload %s', async (url) => {
    const base = await startApp();
    const response = await fetch(`${base}/shorten`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(url === undefined ? {} : { url }) });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Invalid URL');
  });

  it('returns a JSON error for malformed JSON', async () => {
    const base = await startApp();
    const response = await fetch(`${base}/shorten`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Invalid JSON');
  });

  it('creates independent records for repeated URLs and retries collisions', async () => {
    const codes = ['ABC123', 'ABC123', 'xyz789'];
    const base = await startApp(0, () => codes.shift() ?? 'done00');
    const options = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'https://same.example' }) };
    const first = await (await fetch(`${base}/shorten`, options)).json() as { code: string };
    const second = await (await fetch(`${base}/shorten`, options)).json() as { code: string };
    expect(first.code).toBe('ABC123');
    expect(second.code).toBe('xyz789');
    expect((await (await fetch(`${base}/ABC123/stats`)).json()).hits).toBe(0);
  });
});