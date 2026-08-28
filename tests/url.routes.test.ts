import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { InMemoryUrlStore } from '../src/stores/in-memory-url.store';
import { UrlShortenerService } from '../src/services/url-shortener.service';

describe('URL Routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const store = new InMemoryUrlStore();
    const service = new UrlShortenerService(store);
    app = createApp({ service, baseUrl: 'http://localhost:3000' });
  });

  describe('POST /shorten', () => {
    it('creates a short URL with valid input', async () => {
      const response = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page' })
        .expect(201);

      expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:3000\/[A-Za-z0-9]{6}$/);
    });

    it('returns 400 when url is missing', async () => {
      const response = await request(app)
        .post('/shorten')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('returns 400 when url is not a string', async () => {
      const response = await request(app)
        .post('/shorten')
        .send({ url: 123 })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('returns 400 for ftp:// URLs', async () => {
      const response = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('returns 400 for URLs without protocol', async () => {
      const response = await request(app)
        .post('/shorten')
        .send({ url: 'example.com' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('returns 400 for javascript: URLs', async () => {
      const response = await request(app)
        .post('/shorten')
        .send({ url: 'javascript:alert(1)' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('does not create a record for invalid URLs', async () => {
      await request(app)
        .post('/shorten')
        .send({ url: 'invalid' })
        .expect(400);

      const response = await request(app)
        .get('/abc123')
        .expect(404);
    });

    it('reflects configured baseUrl in shortUrl', async () => {
      const customApp = createApp({
        service: new UrlShortenerService(new InMemoryUrlStore()),
        baseUrl: 'http://localhost:8080',
      });

      const response = await request(customApp)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:8080\/[A-Za-z0-9]{6}$/);
    });

    it('can generate different codes for the same URL', async () => {
      const response1 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const response2 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(response1.body.code).not.toBe(response2.body.code);
    });
  });

  describe('GET /:code', () => {
    it('redirects with 302 for existing code', async () => {
      const createResponse = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/target' })
        .expect(201);

      const code = createResponse.body.code;

      await request(app)
        .get(`/${code}`)
        .expect(302)
        .expect('Location', 'https://example.com/target');
    });

    it('returns 404 for non-existent code', async () => {
      await request(app)
        .get('/nonexistent')
        .expect(404);
    });

    it('increments hits on each successful redirect', async () => {
      const createResponse = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      const code = createResponse.body.code;

      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);

      const statsResponse = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsResponse.body.hits).toBe(3);
    });
  });

  describe('GET /:code/stats', () => {
    it('returns stats for existing code', async () => {
      const createResponse = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/stats' })
        .expect(201);

      const code = createResponse.body.code;

      const response = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(response.body.code).toBe(code);
      expect(response.body.url).toBe('https://example.com/stats');
      expect(response.body.hits).toBe(0);
    });

    it('returns 404 for non-existent code', async () => {
      await request(app)
        .get('/nonexistent/stats')
        .expect(404);
    });

    it('reflects accumulated hits from redirects', async () => {
      const createResponse = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/hits' })
        .expect(201);

      const code = createResponse.body.code;

      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);

      const statsResponse = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsResponse.body.hits).toBe(2);
    });

    it('does not increment hits when querying stats', async () => {
      const createResponse = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/no-increment' })
        .expect(201);

      const code = createResponse.body.code;

      await request(app).get(`/${code}`).expect(302);

      await request(app).get(`/${code}/stats`).expect(200);
      await request(app).get(`/${code}/stats`).expect(200);
      await request(app).get(`/${code}/stats`).expect(200);

      const finalStats = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(finalStats.body.hits).toBe(1);
    });
  });

  describe('route order', () => {
    it('matches /:code/stats before /:code', async () => {
      const createResponse = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/order' })
        .expect(201);

      const code = createResponse.body.code;

      const statsResponse = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsResponse.body.code).toBe(code);
    });
  });
});