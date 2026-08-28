import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { DEFAULT_PORT, loadConfig } from '../src/config.js';
import { CODE_LENGTH } from '../src/services/url-shortener-service.js';

const CODE_PATTERN = /^[A-Za-z0-9]{6}$/;
const DEFAULT_BASE = `http://localhost:${DEFAULT_PORT}`;

describe('POST /shorten', () => {
  it('creates a short URL with a 6-char alphanumeric code and returns only the contract fields', async () => {
    const app = createApp();

    const res = await request(app).post('/shorten').send({ url: 'https://example.com/path' });

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.code).toMatch(CODE_PATTERN);
    expect(res.body.shortUrl).toBe(`${DEFAULT_BASE}/${res.body.code}`);
    expect(Object.keys(res.body).sort()).toEqual(['code', 'shortUrl']);
  });

  it.each([
    ['missing url field', {}],
    ['empty url', { url: '' }],
    ['whitespace-only url', { url: '   ' }],
    ['non-string url', { url: 42 }],
    ['null url', { url: null }],
    ['unsupported protocol', { url: 'ftp://example.com/file' }],
  ])('rejects %s with 400 and a useful JSON error', async (_label, payload) => {
    const app = createApp();

    const res = await request(app).post('/shorten').send(payload);

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(typeof res.body.error).toBe('string');
    expect((res.body.error as string).length).toBeGreaterThan(0);
  });

  it('answers JSON (not HTML) for malformed JSON bodies', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/shorten')
      .set('Content-Type', 'application/json')
      .send('{"url": "');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(typeof res.body.error).toBe('string');
  });
});

describe('GET /:code', () => {
  it('redirects 302 to the original URL and counts each call exactly once', async () => {
    const app = createApp();
    const created = await request(app).post('/shorten').send({ url: 'https://example.com/docs' });
    const code = created.body.code as string;

    const first = await request(app).get(`/${code}`).redirects(0);
    expect(first.status).toBe(302);
    expect(first.headers.location).toBe('https://example.com/docs');

    const second = await request(app).get(`/${code}`).redirects(0);
    expect(second.status).toBe(302);
    expect(second.headers.location).toBe('https://example.com/docs');

    const stats = await request(app).get(`/${code}/stats`);
    expect(stats.body.hits).toBe(2);
  });

  it('returns 404 with a JSON error for unknown codes', async () => {
    const app = createApp();

    const res = await request(app).get('/missing').redirects(0);

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(typeof res.body.error).toBe('string');
  });
});

describe('GET /:code/stats', () => {
  it('returns code, url and hits after three redirects without mutating the counter', async () => {
    const app = createApp();
    const created = await request(app).post('/shorten').send({ url: 'https://example.com/stats' });
    const code = created.body.code as string;

    for (let i = 0; i < 3; i += 1) {
      const redirectRes = await request(app).get(`/${code}`).redirects(0);
      expect(redirectRes.status).toBe(302);
    }

    const before = await request(app).get(`/${code}/stats`);
    expect(before.status).toBe(200);
    expect(before.body).toEqual({ code, url: 'https://example.com/stats', hits: 3 });

    const after = await request(app).get(`/${code}/stats`);
    expect(after.status).toBe(200);
    expect(after.body.hits).toBe(3);
  });

  it('reports zero hits before any redirect', async () => {
    const app = createApp();
    const created = await request(app).post('/shorten').send({ url: 'https://example.com/fresh' });
    const code = created.body.code as string;

    const res = await request(app).get(`/${code}/stats`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code, url: 'https://example.com/fresh', hits: 0 });
  });

  it('returns 404 with a JSON error for unknown codes', async () => {
    const app = createApp();

    const res = await request(app).get('/missing/stats');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(typeof res.body.error).toBe('string');
  });
});

describe('code generation', () => {
  it('creates distinct codes for the same URL (no deduplication)', async () => {
    const app = createApp();

    const first = await request(app).post('/shorten').send({ url: 'https://example.com/same' });
    const second = await request(app).post('/shorten').send({ url: 'https://example.com/same' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.code).toMatch(CODE_PATTERN);
    expect(second.body.code).toMatch(CODE_PATTERN);
    expect(first.body.code).not.toBe(second.body.code);
  });

  it('keeps codes formatted and unique across many links', async () => {
    const app = createApp();
    const codes: string[] = [];

    for (let i = 0; i < 25; i += 1) {
      const res = await request(app).post('/shorten').send({ url: `https://example.com/page/${i}` });
      expect(res.status).toBe(201);
      expect(res.body.code).toMatch(CODE_PATTERN);
      expect(res.body.code).toHaveLength(CODE_LENGTH);
      codes.push(res.body.code as string);
    }

    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('configuration', () => {
  it('defaults to port 3000 when PORT is not set', () => {
    const config = loadConfig({});

    expect(config.port).toBe(DEFAULT_PORT);
    expect(config.baseUrl).toBe(DEFAULT_BASE);
  });

  it('reflects the configured PORT in shortUrl and keeps redirects working', async () => {
    const previousPort = process.env.PORT;
    process.env.PORT = '4567';
    try {
      const app = createApp();

      const created = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/port-test' });
      expect(created.status).toBe(201);
      expect(created.body.shortUrl).toBe(`http://localhost:4567/${created.body.code}`);

      const redirectRes = await request(app).get(`/${created.body.code}`).redirects(0);
      expect(redirectRes.status).toBe(302);
      expect(redirectRes.headers.location).toBe('https://example.com/port-test');
    } finally {
      if (previousPort === undefined) {
        delete process.env.PORT;
      } else {
        process.env.PORT = previousPort;
      }
    }
  });

  it('fails deterministically for an invalid PORT value', () => {
    expect(() => loadConfig({ PORT: 'not-a-port' })).toThrow(/PORT/);
  });
});

describe('unknown routes', () => {
  it('responds 404 JSON for unmatched methods/paths', async () => {
    const app = createApp();

    const res = await request(app).put('/whatever');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(typeof res.body.error).toBe('string');
  });
});