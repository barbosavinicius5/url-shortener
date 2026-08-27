import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryUrlStore } from '../src/store/inMemoryUrlStore.js';
import { UrlService } from '../src/services/urlService.js';
import { getPort, getBaseUrl } from '../src/config.js';

describe('URL Shortener API', () => {
  afterEach(() => {
    // Restore process.env if any test modified it
  });

  describe('POST /shorten', () => {
    it('should create a short URL and return 201 with code and shortUrl', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('shortUrl');
      expect(Object.keys(res.body)).toEqual(['code', 'shortUrl']);
      expect(res.body.shortUrl).toBe('http://localhost:3000/' + res.body.code);
    });

    it('should generate a 6-character alphanumeric code', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it('should generate different codes for the same URL', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
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
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      const res = await request(app)
        .post('/shorten')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });

    it('should return 400 when url does not start with http:// or https://', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should accept HTTPS URLs', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);
    });

    it('should accept HTTP URLs', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      await request(app)
        .post('/shorten')
        .send({ url: 'http://example.com' })
        .expect(201);
    });
  });

  describe('GET /:code', () => {
    it('should redirect to the original URL with 302', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;
      const res = await request(app)
        .get(`/${code}`)
        .expect(302);

      expect(res.headers.location).toBe('https://example.com');
    });

    it('should return 404 for non-existent code', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      const res = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /:code/stats', () => {
    it('should return 200 with code, url, and hits', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
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

    it('should return 404 for non-existent code', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      const res = await request(app)
        .get('/nonexistent/stats')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Hits counting', () => {
    it('should increment hits by 1 per successful redirect', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;

      // First redirect
      await request(app).get(`/${code}`).expect(302);
      let stats = await request(app).get(`/${code}/stats`).expect(200);
      expect(stats.body.hits).toBe(1);

      // Second redirect
      await request(app).get(`/${code}`).expect(302);
      stats = await request(app).get(`/${code}/stats`).expect(200);
      expect(stats.body.hits).toBe(2);
    });

    it('should not increment hits when querying stats', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createRes.body.code;

      // Query stats multiple times
      await request(app).get(`/${code}/stats`).expect(200);
      await request(app).get(`/${code}/stats`).expect(200);
      await request(app).get(`/${code}/stats`).expect(200);

      const stats = await request(app).get(`/${code}/stats`).expect(200);
      expect(stats.body.hits).toBe(0);
    });

    it('should not increment hits for non-existent code', async () => {
      const app = createApp({ baseUrl: 'http://localhost:3000' });
      await request(app).get('/nonexistent').expect(404);

      // Still 404 and no side effects
      await request(app).get('/nonexistent/stats').expect(404);
    });
  });

  describe('Configuration', () => {
    it('should use port 3000 by default', () => {
      const port = getPort({});
      expect(port).toBe(3000);
      expect(getBaseUrl(port)).toBe('http://localhost:3000');
    });

    it('should respect custom PORT', () => {
      const port = getPort({ PORT: '4100' });
      expect(port).toBe(4100);
      expect(getBaseUrl(port)).toBe('http://localhost:4100');
    });

    it('should reflect custom port in shortUrl', async () => {
      const app = createApp({ baseUrl: 'http://localhost:4100' });
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res.body.shortUrl).toContain('localhost:4100');
    });
  });
});