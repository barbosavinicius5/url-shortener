import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { InMemoryUrlStore } from '../src/stores/in-memory-url.store';
import { UrlShortenerService } from '../src/services/url-shortener.service';

const testPort = 4321;

describe('url-shortener API', () => {
  it('POST /shorten with https URL returns 201, 6-char code, shortUrl and hits 0', async () => {
    const app = createApp({ port: testPort });

    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/page' });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(res.body.shortUrl).toBe(`http://localhost:${testPort}/${res.body.code}`);

    const stats = await request(app).get(`/${res.body.code}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body).toEqual({
      code: res.body.code,
      url: 'https://example.com/page',
      hits: 0,
    });
  });

  it('POST /shorten with http URL returns 201', async () => {
    const app = createApp({ port: testPort });

    const res = await request(app)
      .post('/shorten')
      .send({ url: 'http://example.com' });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
  });

  it('POST /shorten returns 400 with error for missing, empty, invalid and non-http(s) URLs', async () => {
    const app = createApp({ port: testPort });

    const invalidPayloads = [
      {},
      { url: '' },
      { url: '   ' },
      { url: 'not a url' },
      { url: 'ftp://example.com/file' },
      { url: 'javascript:alert(1)' },
      { url: 123 },
      { url: null },
    ];

    for (const payload of invalidPayloads) {
      const res = await request(app).post('/shorten').send(payload);
      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    }
  });

  it('creates distinct codes for the same URL (no deduplication)', async () => {
    const app = createApp({ port: testPort });

    const a = await request(app).post('/shorten').send({ url: 'https://example.com' });
    const b = await request(app).post('/shorten').send({ url: 'https://example.com' });

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.code).not.toBe(b.body.code);
  });

  it('GET /:code redirects existing code with 302 and Location header', async () => {
    const app = createApp({ port: testPort });

    const created = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/target' });

    const res = await request(app).get(`/${created.body.code}`).redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com/target');
  });

  it('increments hits exactly once per successful redirect and stats does not mutate', async () => {
    const app = createApp({ port: testPort });

    const created = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/hit' });
    const code = created.body.code;

    await request(app).get(`/${code}`).redirects(0);
    await request(app).get(`/${code}`).redirects(0);

    const stats = await request(app).get(`/${code}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body).toEqual({ code, url: 'https://example.com/hit', hits: 2 });

    const statsAgain = await request(app).get(`/${code}/stats`);
    expect(statsAgain.status).toBe(200);
    expect(statsAgain.body.hits).toBe(2);
  });

  it('returns 404 without Location for unknown code in redirect and stats', async () => {
    const app = createApp({ port: testPort });

    const redirect = await request(app).get('/unknown0').redirects(0);
    expect(redirect.status).toBe(404);
    expect(redirect.headers.location).toBeUndefined();

    const stats = await request(app).get('/unknown0/stats');
    expect(stats.status).toBe(404);
    expect(stats.body.error).toBe('Short URL not found');
  });

  it('retries code generation on collision', () => {
    const store = new InMemoryUrlStore();
    store.save({ code: 'abc123', url: 'https://existing.example.com', hits: 0 });

    const calls: string[] = [];
    const generator = () => {
      const value = calls.length === 0 ? 'abc123' : 'abc124';
      calls.push(value);
      return value;
    };

    const service = new UrlShortenerService(store, testPort, generator);
    const result = service.createShortUrl('https://new.example.com');

    expect(result.code).toBe('abc124');
    expect(store.findByCode('abc123')?.url).toBe('https://existing.example.com');
    expect(store.findByCode('abc124')?.url).toBe('https://new.example.com');
  });
});