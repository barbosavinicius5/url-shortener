import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { ShortenerService } from '../src/services/shortener-service';
import { LinkStore } from '../src/stores/link-store';

function makeService(port = 3000) {
  const store = new LinkStore();
  const service = new ShortenerService(store, port);
  return { store, service };
}

describe('Links Routes', () => {
  describe('POST /shorten', () => {
    it('creates a short link and returns 201', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body).toEqual({
        code: res.body.code,
        shortUrl: `http://localhost:3000/${res.body.code}`,
      });
    });

    it('returns 400 for missing url field', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

      const res = await request(app)
        .post('/shorten')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 for empty url', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

      const res = await request(app)
        .post('/shorten')
        .send({ url: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 for ftp:// url', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

      const res = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 for relative path', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

      const res = await request(app)
        .post('/shorten')
        .send({ url: '/relative/path' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('allows repeated submissions of the same URL', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

      const res1 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const res2 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res1.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res2.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });
  });

  describe('GET /:code', () => {
    it('redirects 302 to the original URL', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

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

    it('returns 404 for nonexistent code', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

      const res = await request(app)
        .get('/nonexist')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('increments hits after redirect', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;

      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body.hits).toBe(2);
    });
  });

  describe('GET /:code/stats', () => {
    it('returns 200 with stats immediately after creation', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body).toEqual({
        code,
        url: 'https://example.com',
        hits: 0,
      });
    });

    it('does not increment hits when stats are queried', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;

      // Query stats twice, hits should stay 0
      await request(app).get(`/${code}/stats`).expect(200);
      const statsRes = await request(app).get(`/${code}/stats`).expect(200);

      expect(statsRes.body.hits).toBe(0);
    });

    it('returns 404 for nonexistent code', async () => {
      const { service } = makeService();
      const app = createApp({ port: 3000, service });

      const res = await request(app)
        .get('/nonexist/stats')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Port reflection in shortUrl', () => {
    it('uses default 3000 when no port is injected', async () => {
      const { service } = makeService(3000);
      const app = createApp({ port: 3000, service });

      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res.body.shortUrl).toMatch(/^http:\/\/localhost:3000\//);
    });

    it('uses injected port', async () => {
      const { service } = makeService(4173);
      const app = createApp({ port: 4173, service });

      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res.body.shortUrl).toMatch(/^http:\/\/localhost:4173\//);
    });
  });
});