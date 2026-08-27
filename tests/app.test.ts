import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../src/app';
import { InMemoryUrlStore } from '../src/store/in-memory-url-store';
import { UrlShortenerService } from '../src/services/url-shortener-service';
import { DEFAULT_PORT, getPort } from '../src/config';

const CODE_PATTERN = /^[A-Za-z0-9]{6}$/;

function buildTestApp(port = DEFAULT_PORT): Express {
  const store = new InMemoryUrlStore();
  const service = new UrlShortenerService(store, `http://localhost:${port}`);
  return createApp({ store, service, port });
}

describe('POST /shorten', () => {
  let app: Express;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('creates a short URL for a valid http:// URL', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'http://example.com/path' });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(CODE_PATTERN);
    expect(res.body.shortUrl).toBe(`http://localhost:${DEFAULT_PORT}/${res.body.code}`);
    expect(Object.keys(res.body).sort()).toEqual(['code', 'shortUrl']);
  });

  it('creates a short URL for a valid https:// URL', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/secure' });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(CODE_PATTERN);
    expect(res.body.shortUrl).toBe(`http://localhost:${DEFAULT_PORT}/${res.body.code}`);
  });

  it('generates distinct codes for two creations of the same URL', async () => {
    const first = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/dup' });
    const second = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/dup' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.code).not.toBe(second.body.code);
  });

  it('returns 400 when url is missing', async () => {
    const res = await request(app).post('/shorten').send({});

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 when url is not a string', async () => {
    const res = await request(app).post('/shorten').send({ url: 12345 });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 for a URL with an unsupported protocol', async () => {
    const res = await request(app).post('/shorten').send({ url: 'ftp://example.com/file' });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 for a malformed URL', async () => {
    const res = await request(app).post('/shorten').send({ url: 'http://' });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await request(app)
      .post('/shorten')
      .set('Content-Type', 'application/json')
      .send('{"url": "https://example.com"');

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });
});

describe('GET /:code', () => {
  let app: Express;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('redirects 302 to the original URL for an existing code', async () => {
    const created = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/target' });

    const res = await request(app).get(`/${created.body.code}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com/target');
  });

  it('returns 404 without Location header for an unknown code', async () => {
    const res = await request(app).get('/zzzzzz');

    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe('string');
    expect(res.headers.location).toBeUndefined();
  });
});

describe('GET /:code/stats', () => {
  let app: Express;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('returns exact keys with hits starting at zero for a new code', async () => {
    const created = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/stats' });

    const res = await request(app).get(`/${created.body.code}/stats`);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['code', 'hits', 'url']);
    expect(res.body.code).toBe(created.body.code);
    expect(res.body.url).toBe('https://example.com/stats');
    expect(res.body.hits).toBe(0);
  });

  it('counts exactly one hit after one valid redirect', async () => {
    const created = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/hits' });

    await request(app).get(`/${created.body.code}`);

    const res = await request(app).get(`/${created.body.code}/stats`);
    expect(res.status).toBe(200);
    expect(res.body.hits).toBe(1);
  });

  it('counts two hits after two redirects and stats does not increment', async () => {
    const created = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/two-hits' });

    await request(app).get(`/${created.body.code}`);
    await request(app).get(`/${created.body.code}`);

    const first = await request(app).get(`/${created.body.code}/stats`);
    expect(first.body.hits).toBe(2);

    const second = await request(app).get(`/${created.body.code}/stats`);
    expect(second.body.hits).toBe(2);
  });

  it('returns 404 for an unknown code', async () => {
    const res = await request(app).get('/zzzzzz/stats');

    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe('string');
  });
});

describe('port configuration', () => {
  it('uses port 3000 by default', () => {
    expect(getPort({})).toBe(3000);
    expect(DEFAULT_PORT).toBe(3000);
  });

  it('reflects a custom PORT in the generated shortUrl', async () => {
    const app = buildTestApp(4545);

    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/port' });

    expect(res.status).toBe(201);
    expect(res.body.shortUrl).toBe(`http://localhost:4545/${res.body.code}`);
  });

  it('reads a custom PORT from the environment', () => {
    expect(getPort({ PORT: '8080' })).toBe(8080);
  });

  it('fails fast on an invalid PORT value', () => {
    expect(() => getPort({ PORT: 'not-a-port' })).toThrow();
    expect(() => getPort({ PORT: '0' })).toThrow();
    expect(() => getPort({ PORT: '70000' })).toThrow();
  });
});