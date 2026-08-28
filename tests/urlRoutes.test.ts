import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';

const VALID_HTTPS = 'https://example.com/some/long/path?q=1';
const VALID_HTTP = 'http://example.org/page';

describe('POST /shorten', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp(3000);
  });

  it('should return 201, a 6-char alphanumeric code and a localhost:3000 shortUrl for a valid HTTPS URL', async () => {
    const res = await request(app).post('/shorten').send({ url: VALID_HTTPS });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
  });

  it('should accept an HTTP URL and reflect a configured port (4321) in the shortUrl', async () => {
    const appOn4321 = createApp(4321);
    const res = await request(appOn4321).post('/shorten').send({ url: VALID_HTTP });

    expect(res.status).toBe(201);
    expect(res.body.shortUrl).toBe(`http://localhost:4321/${res.body.code}`);
  });

  it('should produce distinct codes for two creations in the same execution', async () => {
    const first = await request(app).post('/shorten').send({ url: VALID_HTTPS });
    const second = await request(app).post('/shorten').send({ url: VALID_HTTPS });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.code).not.toBe(second.body.code);
  });

  it('should return 400 with a string error when url is missing, empty, whitespace, ftp: or javascript:', async () => {
    const cases: unknown[] = [
      {},
      { url: '' },
      { url: '   ' },
      { url: 'ftp://example.com' },
      { url: 'javascript:alert(1)' },
      { url: 123 },
    ];

    for (const payload of cases) {
      const res = await request(app).post('/shorten').send(payload as object);
      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    }
  });
});

describe('GET /:code redirect', () => {
  let app: Express;
  let code: string;

  beforeEach(async () => {
    app = createApp(3000);
    const created = await request(app).post('/shorten').send({ url: VALID_HTTPS });
    code = created.body.code;
  });

  it('should respond 302 with a Location header equal to the original URL and not follow the redirect', async () => {
    const res = await request(app).get(`/${code}`).redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(VALID_HTTPS);
  });
});

describe('GET /:code/stats and hit counting', () => {
  let app: Express;
  let code: string;

  beforeEach(async () => {
    app = createApp(3000);
    const created = await request(app).post('/shorten').send({ url: VALID_HTTPS });
    code = created.body.code;
  });

  it('should report hits: 2 after two successful redirects', async () => {
    await request(app).get(`/${code}`).redirects(0);
    await request(app).get(`/${code}`).redirects(0);

    const res = await request(app).get(`/${code}/stats`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code, url: VALID_HTTPS, hits: 2 });
  });

  it('should not increment hits when consulting stats before or after redirects', async () => {
    const before = await request(app).get(`/${code}/stats`);
    expect(before.status).toBe(200);
    expect(before.body).toEqual({ code, url: VALID_HTTPS, hits: 0 });

    await request(app).get(`/${code}`).redirects(0);
    const afterRedirect = await request(app).get(`/${code}/stats`);
    expect(afterRedirect.body.hits).toBe(1);

    const afterStats = await request(app).get(`/${code}/stats`);
    expect(afterStats.body.hits).toBe(1);
    expect(afterStats.body).toEqual({ code, url: VALID_HTTPS, hits: 1 });
  });
});

describe('missing codes', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp(3000);
  });

  it('should return 404 for GET /missing and GET /missing/stats', async () => {
    const redirect = await request(app).get('/missing');
    expect(redirect.status).toBe(404);
    expect(typeof redirect.body.error).toBe('string');

    const stats = await request(app).get('/missing/stats');
    expect(stats.status).toBe(404);
    expect(typeof stats.body.error).toBe('string');
  });
});

describe('route precedence (/:code/stats vs /:code)', () => {
  let app: Express;
  let code: string;

  beforeEach(async () => {
    app = createApp(3000);
    const created = await request(app).post('/shorten').send({ url: VALID_HTTPS });
    code = created.body.code;
  });

  it('should serve an existing /:code/stats as stats (200, not 302) and never increment hits or treat it as a redirect', async () => {
    const stats = await request(app).get(`/${code}/stats`);

    expect(stats.status).toBe(200);
    expect(stats.headers.location).toBeUndefined();
    expect(stats.body).toEqual({ code, url: VALID_HTTPS, hits: 0 });

    // Confirm a later real redirect starts counting from 0 (proving /stats did
    // NOT pass through the redirect route).
    await request(app).get(`/${code}`).redirects(0);
    const after = await request(app).get(`/${code}/stats`);
    expect(after.body.hits).toBe(1);
  });

  it('should return 404 (stats) and not a redirect for a missing /x/stats path', async () => {
    const res = await request(app).get('/abc123/stats');
    expect(res.status).toBe(404);
    expect(res.headers.location).toBeUndefined();
  });
});