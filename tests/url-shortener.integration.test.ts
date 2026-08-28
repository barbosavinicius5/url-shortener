import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../src/app';
import { InMemoryUrlStore } from '../src/stores/in-memory-url.store';
import { getPort } from '../src/config/env';

const CODE_REGEX = /^[A-Za-z0-9]{6}$/;
const DEFAULT_HOST = 'localhost:3000';
const CUSTOM_HOST = 'example.org:4100';

describe('URL Shortener API', () => {
  let store: InMemoryUrlStore;
  let app: Express;

  // A fresh store + app per test guarantees no shared codes or hit counts.
  beforeEach(() => {
    store = new InMemoryUrlStore();
    app = createApp(store);
  });

  describe('POST /shorten', () => {
    it('creates a short URL with 201 and a valid code/shortUrl (default host)', async () => {
      const res = await request(app)
        .post('/shorten')
        .set('Host', DEFAULT_HOST)
        .send({ url: 'https://example.com/long/path' });

      expect(res.status).toBe(201);
      expect(res.body.code).toMatch(CODE_REGEX);
      expect(res.body.shortUrl).toBe(`http://${DEFAULT_HOST}/${res.body.code}`);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('builds shortUrl using a custom host/port from the request', async () => {
      const res = await request(app)
        .post('/shorten')
        .set('Host', CUSTOM_HOST)
        .send({ url: 'https://example.com/long/path' });

      expect(res.status).toBe(201);
      expect(res.body.shortUrl).toBe(`http://${CUSTOM_HOST}/${res.body.code}`);
    });

    it('generates distinct codes for multiple creations (even same URL)', async () => {
      const first = await request(app)
        .post('/shorten')
        .set('Host', DEFAULT_HOST)
        .send({ url: 'https://example.com/same' });
      const second = await request(app)
        .post('/shorten')
        .set('Host', DEFAULT_HOST)
        .send({ url: 'https://example.com/same' }); // identical URL

      expect(first.body.code).toMatch(CODE_REGEX);
      expect(second.body.code).toMatch(CODE_REGEX);
      expect(first.body.code).not.toBe(second.body.code);
    });
  });

  describe('validation (POST /shorten)', () => {
    it.each([
      ['missing url', {}],
      ['empty url', { url: '' }],
      ['whitespace-only url', { url: '   ' }],
      ['non-string url', { url: 123 }],
      ['null url', { url: null }],
      ['ftp scheme', { url: 'ftp://example.com' }],
      ['not a valid URL', { url: 'not-a-url' }],
    ])('returns 400 for %s', async (_label, payload) => {
      const res = await request(app).post('/shorten').send(payload);
      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error.length).toBeGreaterThan(0);
    });

    it('returns 400 when the body is not a JSON object', async () => {
      const res = await request(app)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send('a string, not an object');
      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    });

    it('returns 400 when the body cannot be parsed as JSON', async () => {
      const res = await request(app)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send('{ not valid json');
      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('GET /:code (redirect)', () => {
    it('redirects to the original URL with 302 and counts one hit', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .set('Host', DEFAULT_HOST)
        .send({ url: 'https://example.com/page' });
      const code = createRes.body.code;

      const redirectRes = await request(app).get(`/${code}`);
      expect(redirectRes.status).toBe(302);
      expect(redirectRes.headers.location).toBe('https://example.com/page');

      const statsRes = await request(app).get(`/${code}/stats`);
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.hits).toBe(1);
      expect(statsRes.body.url).toBe('https://example.com/page');
    });

    it('returns 404 for an unknown code', async () => {
      const res = await request(app).get('/doesnotexist');
      expect(res.status).toBe(404);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error.length).toBeGreaterThan(0);
    });
  });

  describe('GET /:code/stats', () => {
    it('returns 404 for an unknown code', async () => {
      const res = await request(app).get('/doesnotexist/stats');
      expect(res.status).toBe(404);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error.length).toBeGreaterThan(0);
    });

    it('does not increment hits when only stats is consulted', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .set('Host', DEFAULT_HOST)
        .send({ url: 'https://example.com/counter' });
      const code = createRes.body.code;

      await request(app).get(`/${code}/stats`);
      await request(app).get(`/${code}/stats`);
      await request(app).get(`/${code}/stats`);

      const statsRes = await request(app).get(`/${code}/stats`);
      expect(statsRes.body.hits).toBe(0);
    });

    it('increments hits exactly once per successful redirect and preserves through stats', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .set('Host', DEFAULT_HOST)
        .send({ url: 'https://example.com/many' });
      const code = createRes.body.code;

      await request(app).get(`/${code}`); // 1
      await request(app).get(`/${code}`); // 2
      await request(app).get(`/${code}`); // 3

      const afterRedirects = await request(app).get(`/${code}/stats`);
      expect(afterRedirects.body.hits).toBe(3);

      // Stats calls must not change the count.
      await request(app).get(`/${code}/stats`);
      await request(app).get(`/${code}/stats`);
      const finalStats = await request(app).get(`/${code}/stats`);
      expect(finalStats.body.hits).toBe(3);
    });
  });

  describe('createApp isolation', () => {
    it('returns an Express app without opening a socket', () => {
      const isolatedApp = createApp();
      expect(isolatedApp).toBeDefined();
      expect(typeof isolatedApp.listen).toBe('function');
    });
  });
});

describe('getPort (environment config)', () => {
  const original = process.env.PORT;

  afterEach(() => {
    process.env.PORT = original;
  });

  it('defaults to 3000 when PORT is not set', () => {
    delete process.env.PORT;
    expect(getPort()).toBe(3000);
  });

  it('uses the configured PORT value', () => {
    process.env.PORT = '4100';
    expect(getPort()).toBe(4100);
  });

  it('rejects a PORT value out of range', () => {
    process.env.PORT = '80000';
    expect(() => getPort()).toThrow();
  });

  it('rejects a non-numeric PORT value', () => {
    process.env.PORT = 'not-a-number';
    expect(() => getPort()).toThrow();
  });
});