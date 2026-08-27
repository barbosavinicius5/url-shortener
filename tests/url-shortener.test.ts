import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { DEFAULT_PORT, getPort } from '../src/config';
import { MemoryUrlStore } from '../src/store/memory-url-store';

function makeApp(port?: number) {
  return createApp({ ...(port === undefined ? {} : { port }), store: new MemoryUrlStore() });
}

async function shorten(app: ReturnType<typeof createApp>, url = 'https://example.com/page') {
  return request(app).post('/shorten').send({ url });
}

describe('URL shortener API', () => {
  it('creates a six-character code and short URL', async () => {
    const response = await shorten(makeApp(), 'https://example.com/page');
    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(`http://localhost:${DEFAULT_PORT}/${response.body.code}`);
  });

  it('redirects and increments hits exactly once per successful request', async () => {
    const app = makeApp();
    const created = await shorten(app, 'https://example.com/original?q=1');
    const first = await request(app).get(`/${created.body.code}`).redirects(0);
    const second = await request(app).get(`/${created.body.code}`).redirects(0);
    expect(first.status).toBe(302);
    expect(first.headers.location).toBe('https://example.com/original?q=1');
    expect(second.status).toBe(302);
    const stats = await request(app).get(`/${created.body.code}/stats`);
    expect(stats.body).toEqual({ code: created.body.code, url: 'https://example.com/original?q=1', hits: 2 });
    expect((await request(app).get(`/${created.body.code}/stats`)).body.hits).toBe(2);
  });

  it('returns JSON 404 for unknown codes and routes', async () => {
    const app = makeApp();
    expect((await request(app).get('/missing')).body).toEqual({ error: 'Short URL not found' });
    expect((await request(app).get('/missing/stats')).status).toBe(404);
    const unknownRoute = await request(app).post('/unknown').send({});
    expect(unknownRoute.status).toBe(404);
    expect(unknownRoute.body).toEqual({ error: 'Not found' });
  });

  it.each([
    ['missing', {}], ['non-string', { url: 123 }], ['empty', { url: '   ' }],
    ['malformed', { url: 'not-a-url' }], ['ftp', { url: 'ftp://example.com' }], ['file', { url: 'file:///tmp/a' }],
  ])('rejects %s URLs with a useful error', async (_name, body) => {
    const response = await request(makeApp()).post('/shorten').send(body);
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
    expect(response.body.error.length).toBeGreaterThan(0);
  });

  it('creates independent unique codes for repeated URLs', async () => {
    const app = makeApp();
    const responses = await Promise.all(Array.from({ length: 10 }, () => shorten(app, 'https://example.com')));
    const codes = responses.map((response) => response.body.code);
    expect(new Set(codes).size).toBe(10);
    expect(codes.every((code) => /^[A-Za-z0-9]{6}$/.test(code))).toBe(true);
  });

  it('uses configured and default ports', async () => {
    const configured = await shorten(makeApp(4545));
    expect(configured.body.shortUrl).toBe(`http://localhost:4545/${configured.body.code}`);
    expect(getPort({})).toBe(3000);
    expect(getPort({ PORT: '4545' })).toBe(4545);
  });

  it('returns a JSON error for malformed request bodies', async () => {
    const response = await request(makeApp()).post('/shorten').set('Content-Type', 'application/json').send('{"url":');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid JSON body' });
  });
});
