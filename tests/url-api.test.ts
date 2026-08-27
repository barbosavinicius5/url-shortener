import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryUrlStore } from '../src/store/in-memory-url.store.js';
import type { UrlStore } from '../src/types/url.js';

function createTestApp(baseUrl?: string, store?: UrlStore) {
  return createApp({ store, baseUrl });
}

describe('URL Shortener API', () => {
  describe('POST /shorten', () => {
    it('returns 201 with code and shortUrl for a valid URL', async () => {
      const app = createTestApp('http://localhost:9999');
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/long/path' })
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('shortUrl');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:9999/${res.body.code}`);
    });

    it('returns 201 with different codes for the same URL submitted twice', async () => {
      const app = createTestApp();
      const res1 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/duplicate' })
        .expect(201);

      const res2 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/duplicate' })
        .expect(201);

      expect(res1.body.code).not.toBe(res2.body.code);
    });

    it('returns 400 for missing body', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/shorten')
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 for empty object', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/shorten')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 for empty url string', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/shorten')
        .send({ url: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 for whitespace-only url', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/shorten')
        .send({ url: '   ' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 for url without http:// or https://', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 for url missing scheme entirely', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'not-a-url' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 for invalid JSON body', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send('not-json')
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url is null', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/shorten')
        .send({ url: null })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url is a number', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/shorten')
        .send({ url: 123 })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /:code (redirect)', () => {
    it('redirects 302 to the original URL for an existing code', async () => {
      const app = createTestApp('http://localhost:7777');
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/redirect-test' })
        .expect(201);

      const { code } = createRes.body;

      const redirectRes = await request(app)
        .get(`/${code}`)
        .expect(302);

      expect(redirectRes.headers.location).toBe('https://example.com/redirect-test');
    });

    it('returns 404 for a non-existent code', async () => {
      const app = createTestApp();
      const res = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /:code/stats', () => {
    it('returns 200 with code, url and hits (0 initially)', async () => {
      const store: UrlStore = new InMemoryUrlStore();
      const app = createTestApp('http://localhost:8888', store);

      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/stats-test' })
        .expect(201);

      const { code } = createRes.body;

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body).toEqual({
        code,
        url: 'https://example.com/stats-test',
        hits: 0,
      });
    });

    it('returns hits incremented after redirects', async () => {
      const store: UrlStore = new InMemoryUrlStore();
      const app = createTestApp('http://localhost:6666', store);

      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/hits-test' })
        .expect(201);

      const { code } = createRes.body;

      // First stat check: hits = 0
      const stats1 = await request(app)
        .get(`/${code}/stats`)
        .expect(200);
      expect(stats1.body.hits).toBe(0);

      // First redirect
      await request(app).get(`/${code}`).expect(302);

      // Second stat check: hits = 1
      const stats2 = await request(app)
        .get(`/${code}/stats`)
        .expect(200);
      expect(stats2.body.hits).toBe(1);

      // Second redirect
      await request(app).get(`/${code}`).expect(302);

      // Third stat check: hits = 2
      const stats3 = await request(app)
        .get(`/${code}/stats`)
        .expect(200);
      expect(stats3.body.hits).toBe(2);
      expect(stats3.body.code).toBe(code);
      expect(stats3.body.url).toBe('https://example.com/hits-test');
    });

    it('returns 404 for non-existent code in stats', async () => {
      const app = createTestApp();
      const res = await request(app)
        .get('/missing/stats')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('handles redirect vs stats routing correctly', async () => {
      const store: UrlStore = new InMemoryUrlStore();
      const app = createTestApp('http://localhost:5555', store);

      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/routing-check' })
        .expect(201);

      const { code } = createRes.body;

      // /:code/stats should return JSON stats, not redirect
      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);
      expect(statsRes.body).toHaveProperty('code');
      expect(statsRes.body).toHaveProperty('url');
      expect(statsRes.body).toHaveProperty('hits');
    });
  });

  describe('factory with custom store', () => {
    it('uses a separate store per app instance (no state leakage)', async () => {
      const store1 = new InMemoryUrlStore();
      const store2 = new InMemoryUrlStore();
      const app1 = createTestApp('http://localhost:1111', store1);
      const app2 = createTestApp('http://localhost:2222', store2);

      // Create URL in app1
      const create1 = await request(app1)
        .post('/shorten')
        .send({ url: 'https://example.com/isolated' })
        .expect(201);

      const code1 = create1.body.code;

      // app2 should not find it
      const get2 = await request(app2)
        .get(`/${code1}`)
        .expect(404);

      expect(get2.body).toHaveProperty('error');
    });
  });
});