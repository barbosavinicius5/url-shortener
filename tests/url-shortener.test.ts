import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp, resolvePort } from '../src/app.js';
import { InMemoryUrlStore } from '../src/store/in-memory-url-store.js';

describe('URL Shortener API', () => {
  let store: InMemoryUrlStore;

  beforeEach(() => {
    store = new InMemoryUrlStore();
  });

  describe('POST /shorten', () => {
    it('should create a short URL and return 201 with code and shortUrl', async () => {
      const app = createApp(store, 3000);
      const res = await supertest(app)
        .post('/shorten')
        .send({ url: 'https://example.com/long-url' })
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
    });

    it('should reflect the configured port in shortUrl', async () => {
      const app = createApp(store, 4567);
      const res = await supertest(app)
        .post('/shorten')
        .send({ url: 'https://example.com/port-test' })
        .expect(201);

      expect(res.body.shortUrl).toBe(`http://localhost:4567/${res.body.code}`);
    });

    it('should return 400 when url is missing', async () => {
      const app = createApp(store, 3000);
      const res = await supertest(app)
        .post('/shorten')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when url is empty string', async () => {
      const app = createApp(store, 3000);
      const res = await supertest(app)
        .post('/shorten')
        .send({ url: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when url uses unsupported protocol', async () => {
      const app = createApp(store, 3000);
      const res = await supertest(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when url is not a valid URL', async () => {
      const app = createApp(store, 3000);
      const res = await supertest(app)
        .post('/shorten')
        .send({ url: 'not-a-url' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /:code', () => {
    it('should redirect 302 to the original URL', async () => {
      const app = createApp(store, 3000);
      const createRes = await supertest(app)
        .post('/shorten')
        .send({ url: 'https://example.com/redirect-test' })
        .expect(201);

      const { code } = createRes.body;

      const redirectRes = await supertest(app)
        .get(`/${code}`)
        .redirects(0)
        .expect(302);

      expect(redirectRes.headers.location).toBe('https://example.com/redirect-test');
    });

    it('should return 404 for an unknown code', async () => {
      const app = createApp(store, 3000);
      const res = await supertest(app)
        .get('/missing')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /:code/stats', () => {
    it('should return hits = 0 before any redirect', async () => {
      const app = createApp(store, 3000);
      const createRes = await supertest(app)
        .post('/shorten')
        .send({ url: 'https://example.com/stats-test' })
        .expect(201);

      const { code } = createRes.body;

      const statsRes = await supertest(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body).toEqual({
        code,
        url: 'https://example.com/stats-test',
        hits: 0,
      });
    });

    it('should reflect hits after redirects', async () => {
      const app = createApp(store, 3000);
      const createRes = await supertest(app)
        .post('/shorten')
        .send({ url: 'https://example.com/hits-test' })
        .expect(201);

      const { code } = createRes.body;

      // Two redirects
      await supertest(app).get(`/${code}`).redirects(0).expect(302);
      await supertest(app).get(`/${code}`).redirects(0).expect(302);

      const statsRes = await supertest(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body.hits).toBe(2);
    });

    it('should return 404 for an unknown code', async () => {
      const app = createApp(store, 3000);
      const res = await supertest(app)
        .get('/missing/stats')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('resolvePort', () => {
    it('should return 3000 as default when env is not set', () => {
      const port = resolvePort(undefined);
      // This test relies on process.env.PORT not being set
      expect(port).toBe(3000);
    });

    it('should parse valid port string', () => {
      expect(resolvePort('4000')).toBe(4000);
    });

    it('should fallback to 3000 for invalid port string', () => {
      expect(resolvePort('abc')).toBe(3000);
    });
  });

  describe('unique code generation', () => {
    it('should generate distinct codes for successive creations', async () => {
      const app = createApp(store, 3000);
      const res1 = await supertest(app)
        .post('/shorten')
        .send({ url: 'https://example.com/one' })
        .expect(201);

      const res2 = await supertest(app)
        .post('/shorten')
        .send({ url: 'https://example.com/two' })
        .expect(201);

      expect(res1.body.code).not.toBe(res2.body.code);
      expect(res1.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res2.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });
  });
});