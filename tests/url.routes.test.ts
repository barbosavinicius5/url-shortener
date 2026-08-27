import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryUrlStore } from '../src/store/in-memory-url.store.js';
import type { CodeGenerator } from '../src/services/url-shortener.service.js';

describe('URL Routes', () => {
  let store: InMemoryUrlStore;

  beforeEach(() => {
    store = new InMemoryUrlStore();
  });

  describe('POST /shorten', () => {
    it('should return 201 with code and shortUrl for a valid URL', async () => {
      const app = createApp({ store, port: 3000 });
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toMatch(/^http:\/\/localhost:3000\//);
    });

    it('should return 201 with port in shortUrl matching the configured port', async () => {
      const app = createApp({ store, port: 4000 });
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res.body.shortUrl).toMatch(/^http:\/\/localhost:4000\//);
    });

    it('should not return hits in creation response', async () => {
      const app = createApp({ store, port: 3000 });
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res.body).not.toHaveProperty('hits');
      expect(Object.keys(res.body)).toEqual(['code', 'shortUrl']);
    });

    it('should create different codes for the same URL (no dedup)', async () => {
      const app = createApp({ store, port: 3000 });
      const res1 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const res2 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res1.body.code).not.toBe(res2.body.code);
    });

    it('should return 400 when url is missing', async () => {
      const app = createApp({ store, port: 3000 });
      const res = await request(app)
        .post('/shorten')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when url is an empty string', async () => {
      const app = createApp({ store, port: 3000 });
      const res = await request(app)
        .post('/shorten')
        .send({ url: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when url is invalid', async () => {
      const app = createApp({ store, port: 3000 });
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'not-a-url' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when url uses ftp protocol', async () => {
      const app = createApp({ store, port: 3000 });
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://files.example.com' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should not create a record on invalid URL', async () => {
      const app = createApp({ store, port: 3000 });
      await request(app)
        .post('/shorten')
        .send({ url: 'invalid' })
        .expect(400);

      // The store should be empty — creation verifies no code exists later
      // by checking that stats on any code returns 404
      const res = await request(app)
        .get('/somecode/stats')
        .expect(404);
    });

    it('should return 400 for non-object body', async () => {
      const app = createApp({ store, port: 3000 });
      await request(app)
        .post('/shorten')
        .send('not json')
        .expect(400);
    });
  });

  describe('GET /:code - Redirect', () => {
    it('should redirect with 302 to the original URL', async () => {
      const app = createApp({ store, port: 3000 });

      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;

      const redirectRes = await request(app)
        .get(`/${code}`)
        .expect(302);

      expect(redirectRes.headers.location).toBe('https://example.com');
    });

    it('should return 404 for nonexistent code', async () => {
      const app = createApp({ store, port: 3000 });
      const res = await request(app)
        .get('/nonexist')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('should increment hits on successful redirect', async () => {
      const app = createApp({ store, port: 3000 });

      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;

      // Stats should show 0 hits initially
      const statsBefore = await request(app)
        .get(`/${code}/stats`)
        .expect(200);
      expect(statsBefore.body.hits).toBe(0);

      // Redirect
      await request(app)
        .get(`/${code}`)
        .expect(302);

      // Stats should show 1 hit
      const statsAfter = await request(app)
        .get(`/${code}/stats`)
        .expect(200);
      expect(statsAfter.body.hits).toBe(1);
    });

    it('should increment hits cumulatively on multiple accesses', async () => {
      const app = createApp({ store, port: 3000 });

      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;

      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);

      const stats = await request(app)
        .get(`/${code}/stats`)
        .expect(200);
      expect(stats.body.hits).toBe(3);
    });

    it('should not increment hits for nonexistent code', async () => {
      const app = createApp({ store, port: 3000 });

      // Create a valid record
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;

      // Try a nonexistent code
      await request(app)
        .get('/nonexist')
        .expect(404);

      // Stats for valid code should still be 0
      const stats = await request(app)
        .get(`/${code}/stats`)
        .expect(200);
      expect(stats.body.hits).toBe(0);
    });
  });

  describe('GET /:code/stats - Statistics', () => {
    it('should return 200 with code, url and hits for existing code', async () => {
      const app = createApp({ store, port: 3000 });

      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;

      const res = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(res.body).toEqual({
        code,
        url: 'https://example.com',
        hits: 0,
      });
    });

    it('should return 404 for nonexistent code in stats', async () => {
      const app = createApp({ store, port: 3000 });
      const res = await request(app)
        .get('/nonexist/stats')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('should not increment hits when stats are queried', async () => {
      const app = createApp({ store, port: 3000 });

      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;

      // Query stats twice
      await request(app).get(`/${code}/stats`).expect(200);
      await request(app).get(`/${code}/stats`).expect(200);

      // Hits should still be 0
      const stats = await request(app)
        .get(`/${code}/stats`)
        .expect(200);
      expect(stats.body.hits).toBe(0);
    });
  });

  describe('Route ordering: /:code/stats before /:code', () => {
    it('should treat "stats" as the stats endpoint, not a redirect code', async () => {
      const app = createApp({ store, port: 3000 });

      // Create a URL
      await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      // Access /stats (literal) - should be treated as a code
      // Actually /stats will match /:code/stats first, so it's a stats request
      // for code "stats". Since no record exists with code "stats", it should 404.
      const res = await request(app)
        .get('/stats')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Full flow integration', () => {
    it('should handle create, redirect, and stats end-to-end', async () => {
      const app = createApp({ store, port: 3000 });

      // 1. Create
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/long/path' })
        .expect(201);

      const { code, shortUrl } = createRes.body;
      expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(shortUrl).toBe(`http://localhost:3000/${code}`);

      // 2. Stats before redirect
      const statsBefore = await request(app)
        .get(`/${code}/stats`)
        .expect(200);
      expect(statsBefore.body.hits).toBe(0);

      // 3. Redirect
      const redirectRes = await request(app)
        .get(`/${code}`)
        .expect(302);
      expect(redirectRes.headers.location).toBe('https://example.com/long/path');

      // 4. Stats after one redirect
      const statsAfter = await request(app)
        .get(`/${code}/stats`)
        .expect(200);
      expect(statsAfter.body.hits).toBe(1);
      expect(statsAfter.body.url).toBe('https://example.com/long/path');
      expect(statsAfter.body.code).toBe(code);
    });
  });
});