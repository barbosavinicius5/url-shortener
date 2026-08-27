import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { InMemoryUrlStore } from '../src/stores/in-memory-url-store';

describe('URL Shortener API', () => {
  let store: InMemoryUrlStore;

  beforeEach(() => {
    store = new InMemoryUrlStore();
  });

  describe('POST /shorten', () => {
    it('should create a short URL and return 201', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/long-page' })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body).toHaveProperty('shortUrl');
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
    });

    it('should generate distinct codes for different requests', async () => {
      const app = createApp({ port: 3000 }, store);
      const res1 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page1' })
        .expect(201);

      const res2 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page2' })
        .expect(201);

      expect(res1.body.code).not.toBe(res2.body.code);
      expect(res1.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res2.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it('should allow same URL to be shortened multiple times with different codes', async () => {
      const app = createApp({ port: 3000 }, store);
      const res1 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/same-url' })
        .expect(201);

      const res2 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/same-url' })
        .expect(201);

      expect(res1.body.code).not.toBe(res2.body.code);
    });

    it('should return 400 when url is missing', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .post('/shorten')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });

    it('should return 400 when body is empty object', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .post('/shorten')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when url is not a string', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .post('/shorten')
        .send({ url: 123 })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when url is empty string', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .post('/shorten')
        .send({ url: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for invalid URL format', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'not-a-url' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for ftp protocol', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for javascript protocol', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'javascript:alert(1)' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for relative URLs', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .post('/shorten')
        .send({ url: '/relative/path' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should use the configured port in shortUrl', async () => {
      const app = createApp({ port: 4000 }, store);
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page' })
        .expect(201);

      expect(res.body.shortUrl).toBe(`http://localhost:4000/${res.body.code}`);
    });
  });

  describe('GET /:code', () => {
    it('should redirect 302 with Location header for existing code', async () => {
      const app = createApp({ port: 3000 }, store);
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/redirect-me' })
        .expect(201);

      const code = createRes.body.code;

      const redirectRes = await request(app)
        .get(`/${code}`)
        .redirects(0)
        .expect(302);

      expect(redirectRes.headers.location).toBe('https://example.com/redirect-me');
    });

    it('should return 404 for non-existent code', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .get('/nonexist')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('should increment hits on each redirect', async () => {
      const app = createApp({ port: 3000 }, store);
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/hits-test' })
        .expect(201);

      const code = createRes.body.code;

      // First redirect
      await request(app).get(`/${code}`).redirects(0).expect(302);
      // Second redirect
      await request(app).get(`/${code}`).redirects(0).expect(302);
      // Third redirect
      await request(app).get(`/${code}`).redirects(0).expect(302);

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body.hits).toBe(3);
    });
  });

  describe('GET /:code/stats', () => {
    it('should return stats for existing code', async () => {
      const app = createApp({ port: 3000 }, store);
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/stats-test' })
        .expect(201);

      const code = createRes.body.code;

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body).toEqual({
        code,
        url: 'https://example.com/stats-test',
        hits: 0,
      });
    });

    it('should return 404 for non-existent code in stats', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .get('/nonexist/stats')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('should not increment hits when consulting stats', async () => {
      const app = createApp({ port: 3000 }, store);
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/stats-no-increment' })
        .expect(201);

      const code = createRes.body.code;

      // Do a redirect first
      await request(app).get(`/${code}`).redirects(0).expect(302);

      // Check stats (should not affect hits)
      const stats1 = await request(app).get(`/${code}/stats`).expect(200);
      expect(stats1.body.hits).toBe(1);

      // Check stats again — should still be 1
      const stats2 = await request(app).get(`/${code}/stats`).expect(200);
      expect(stats2.body.hits).toBe(1);
    });

    it('should separate stats from redirect hits', async () => {
      const app = createApp({ port: 3000 }, store);
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/stats-separate' })
        .expect(201);

      const code = createRes.body.code;

      // Redirect twice
      await request(app).get(`/${code}`).redirects(0).expect(302);
      await request(app).get(`/${code}`).redirects(0).expect(302);

      // Stats should show 2, not more
      const statsRes = await request(app).get(`/${code}/stats`).expect(200);
      expect(statsRes.body.hits).toBe(2);
    });
  });

  describe('Integration: full flow', () => {
    it('should complete the full create-redirect-stats flow', async () => {
      const app = createApp({ port: 3000 }, store);
      const originalUrl = 'https://example.com/full-flow';

      // Create
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: originalUrl })
        .expect(201);

      const { code } = createRes.body;

      // Redirect
      const redirectRes = await request(app)
        .get(`/${code}`)
        .redirects(0)
        .expect(302);

      expect(redirectRes.headers.location).toBe(originalUrl);

      // Stats
      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body).toEqual({
        code,
        url: originalUrl,
        hits: 1,
      });
    });
  });

  describe('404 for unmatched routes', () => {
    it('should return 404 for routes that do not match any pattern', async () => {
      const app = createApp({ port: 3000 }, store);

      // Multi-segment paths don't match /:code or /shorten
      const res = await request(app)
        .get('/some/nested/path')
        .expect(404);

      expect(res.body).toEqual({ error: 'Not found' });
    });
  });

  describe('Invalid JSON body', () => {
    it('should return 400 for malformed JSON', async () => {
      const app = createApp({ port: 3000 }, store);
      const res = await request(app)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send('not-json')
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });
});