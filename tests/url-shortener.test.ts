import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { UrlShortenerService } from '../src/services/url-shortener-service.js';
import { UrlStore } from '../src/store/url-store.js';
import { resolvePort } from '../src/server.js';

function testApp(port = 4100) {
  return createApp({
    service: new UrlShortenerService(new UrlStore()),
    baseUrl: `http://localhost:${port}`,
  });
}

describe('URL shortener API', () => {
  it('creates a URL with the expected response contract', async () => {
    const response = await request(testApp(4321)).post('/shorten').send({ url: 'https://example.com/page' });
    expect(response.status).toBe(201);
    expect(Object.keys(response.body).sort()).toEqual(['code', 'shortUrl']);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:4321\/[A-Za-z0-9]{6}$/);
  });

  it('does not deduplicate URLs and produces unique codes', async () => {
    const app = testApp();
    const first = await request(app).post('/shorten').send({ url: 'https://example.com' });
    const second = await request(app).post('/shorten').send({ url: 'https://example.com' });
    expect(second.body.code).not.toBe(first.body.code);
  });

  it.each([
    [undefined, 'missing url'],
    [{}, 'absent field'],
    [{ url: '   ' }, 'blank url'],
    [{ url: 'ftp://example.com' }, 'wrong scheme'],
    [{ url: 123 }, 'non-string'],
  ])('rejects %s (%s)', async (body) => {
    const response = body === undefined
      ? await request(testApp()).post('/shorten').send()
      : await request(testApp()).post('/shorten').send(body);
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
    expect(response.body.error.length).toBeGreaterThan(0);
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await request(testApp()).post('/shorten').set('Content-Type', 'application/json').send('{"url":');
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });

  it('redirects and increments hits exactly once per redirect', async () => {
    const app = testApp();
    const created = await request(app).post('/shorten').send({ url: 'http://example.com/original' });
    const code = created.body.code;
    const redirect = await request(app).get(`/${code}`).redirects(0);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe('http://example.com/original');
    expect((await request(app).get(`/${code}/stats`)).body.hits).toBe(1);
    await request(app).get(`/${code}`).redirects(0);
    expect((await request(app).get(`/${code}/stats`)).body.hits).toBe(2);
  });

  it('returns stats without incrementing and returns JSON 404s', async () => {
    const app = testApp();
    const created = await request(app).post('/shorten').send({ url: 'https://example.com' });
    const code = created.body.code;
    expect((await request(app).get(`/${code}/stats`)).body).toEqual({ code, url: 'https://example.com', hits: 0 });
    expect((await request(app).get('/missing')).status).toBe(404);
    expect((await request(app).get('/missing/stats')).status).toBe(404);
    expect((await request(app).get(`/${code}/stats`)).body.hits).toBe(0);
  });

  it('resolves configured and default ports', () => {
    expect(resolvePort(undefined)).toBe(3000);
    expect(resolvePort('4567')).toBe(4567);
    expect(resolvePort('invalid')).toBe(3000);
  });
});