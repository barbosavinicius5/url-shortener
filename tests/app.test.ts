import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { LinkStore } from '../src/store/link-store.js';
import { UrlShortenerService } from '../src/services/url-shortener-service.js';

const PORT = 4567;

describe('URL Shortener API', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({ port: PORT });
  });

  describe('POST /shorten', () => {
    it('should return 201 with code and shortUrl for a valid URL', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/long-url' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:${PORT}/${res.body.code}`);
    });

    it('should return different codes for the same URL', async () => {
      const url = 'https://example.com/same-url';
      const res1 = await request(app).post('/shorten').send({ url });
      const res2 = await request(app).post('/shorten').send({ url });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.code).not.toBe(res2.body.code);
    });

    it('should return 400 for missing body', async () => {
      const res = await request(app).post('/shorten');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for empty body object', async () => {
      const res = await request(app).post('/shorten').send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for URL without http/https prefix', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for non-string url', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 12345 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for empty string url', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /:code — redirect', () => {
    it('should redirect 302 to the original URL', async () => {
      const originalUrl = 'https://example.com/redirect-test';
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: originalUrl });
      const { code } = createRes.body;

      const redirectRes = await request(app)
        .get(`/${code}`)
        .redirects(0);

      expect(redirectRes.status).toBe(302);
      expect(redirectRes.headers.location).toBe(originalUrl);
    });

    it('should return 404 for missing code', async () => {
      const res = await request(app).get('/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /:code/stats — stats', () => {
    it('should return 200 with code, url and hits starting at 0', async () => {
      const url = 'https://example.com/stats-test';
      const createRes = await request(app)
        .post('/shorten')
        .send({ url });
      const { code } = createRes.body;

      const statsRes = await request(app).get(`/${code}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body).toEqual({
        code,
        url,
        hits: 0,
      });
    });

    it('should increment hits on each redirect', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/hits-test' });
      const { code } = createRes.body;

      // First redirect
      await request(app).get(`/${code}`).redirects(0);
      // Second redirect
      await request(app).get(`/${code}`).redirects(0);

      const statsRes = await request(app).get(`/${code}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.hits).toBe(2);
    });

    it('should not increment hits when querying stats', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/no-increment' });
      const { code } = createRes.body;

      // Query stats twice without redirecting
      await request(app).get(`/${code}/stats`);
      const statsRes = await request(app).get(`/${code}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.hits).toBe(0);
    });

    it('should return 404 for stats of missing code', async () => {
      const res = await request(app).get('/missing/stats');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('404 for unmatched routes', () => {
    it('should return 404 JSON for a random path', async () => {
      const res = await request(app).get('/some/random/path');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Collision handling', () => {
    it('should retry when generated code collides', async () => {
      // Pre-populate store with a code we'll generate first
      const store = new LinkStore();
      store.save({ code: 'abc123', url: 'https://example.com/first', hits: 0 });

      // Mock Math.random to return predictable sequence:
      // First 6 calls produce 'abc123' (collision), next 6 produce 'xyz789'
      const mockRandom = vi.spyOn(Math, 'random').mockImplementation(() => {
        // We'll use call count tracking via closure
        if (!mockRandom.callCount) mockRandom.callCount = 0;
        mockRandom.callCount++;

        // Sequence for 'abc123': a=26,b=27,c=28,1=53,2=54,3=55
        const seq1 = [26/62, 27/62, 28/62, 53/62, 54/62, 55/62];
        // Sequence for 'xyz789': x=49,y=50,z=51,7=59,8=60,9=61
        const seq2 = [49/62, 50/62, 51/62, 59/62, 60/62, 61/62];

        const idx = mockRandom.callCount - 1;
        if (idx < 6) return seq1[idx];
        return seq2[idx - 6];
      });
      (mockRandom as any).callCount = 0;

      const appWithCollision = createApp({ port: 4568, store });
      const res = await request(appWithCollision)
        .post('/shorten')
        .send({ url: 'https://example.com/second' });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('xyz789');

      mockRandom.mockRestore();
    });
  });

  describe('PORT configuration', () => {
    it('should use the given port in shortUrl', async () => {
      const appCustom = createApp({ port: 9999 });
      const res = await request(appCustom)
        .post('/shorten')
        .send({ url: 'https://example.com/port-test' });

      expect(res.status).toBe(201);
      expect(res.body.shortUrl).toMatch(/^http:\/\/localhost:9999\//);
    });

    it('should default to 3000 when no port provided', async () => {
      const appDefault = createApp();
      const res = await request(appDefault)
        .post('/shorten')
        .send({ url: 'https://example.com/default-port' });

      expect(res.status).toBe(201);
      expect(res.body.shortUrl).toMatch(/^http:\/\/localhost:3000\//);
    });
  });
});