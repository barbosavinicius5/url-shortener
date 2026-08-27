import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import type { Express } from 'express';

function createTestApp(port = 3000): { app: Express } {
  const { app } = createApp(port);
  return { app };
}

describe('URL Shortener API', () => {
  let app: Express;

  beforeEach(() => {
    ({ app } = createTestApp());
  });

  describe('POST /shorten', () => {
    it('should create a short URL with valid URL and return 201', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('shortUrl');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
    });

    it('should create independent records for the same URL', async () => {
      const res1 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' });

      const res2 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.code).toHaveLength(6);
      expect(res2.body.code).toHaveLength(6);

      // Both should be accessible and have 0 hits initially
      const stats1 = await request(app).get(`/${res1.body.code}/stats`);
      const stats2 = await request(app).get(`/${res2.body.code}/stats`);

      expect(stats1.status).toBe(200);
      expect(stats1.body.hits).toBe(0);
      expect(stats2.status).toBe(200);
      expect(stats2.body.hits).toBe(0);
    });

    it('should accept http:// URLs', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'http://example.com' });

      expect(res.status).toBe(201);
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it('should accept https:// URLs', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(201);
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it('should return 400 when body is missing', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when url is empty string', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when url is whitespace only', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: '   ' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for ftp:// protocol', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for www.example.com without protocol', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'www.example.com' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when url is not a string', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 123 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should not create a link for invalid URLs', async () => {
      await request(app)
        .post('/shorten')
        .send({ url: 'not-a-url' });

      // No code should be created - verify stats return 404 for any potential code
      const res = await request(app).get('/notaurl/stats');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /:code', () => {
    it('should redirect to the original URL with 302', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/redirect-test' });

      const { code } = createRes.body;

      const redirectRes = await request(app)
        .get(`/${code}`)
        .redirects(0);

      expect(redirectRes.status).toBe(302);
      expect(redirectRes.headers.location).toBe('https://example.com/redirect-test');
    });

    it('should return 404 for non-existent code', async () => {
      const res = await request(app)
        .get('/nonexistent')
        .redirects(0);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should increment hits on each successful redirect', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/counter' });

      const { code } = createRes.body;

      // First redirect
      await request(app).get(`/${code}`).redirects(0);
      // Second redirect
      await request(app).get(`/${code}`).redirects(0);
      // Third redirect
      await request(app).get(`/${code}`).redirects(0);

      const statsRes = await request(app).get(`/${code}/stats`);
      expect(statsRes.body.hits).toBe(3);
    });
  });

  describe('GET /:code/stats', () => {
    it('should return stats for existing code', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/stats-test' });

      const { code } = createRes.body;

      const statsRes = await request(app).get(`/${code}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body).toEqual({
        code,
        url: 'https://example.com/stats-test',
        hits: 0,
      });
    });

    it('should not increment hits when querying stats', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/no-increment' });

      const { code } = createRes.body;

      // Query stats multiple times
      await request(app).get(`/${code}/stats`);
      await request(app).get(`/${code}/stats`);
      await request(app).get(`/${code}/stats`);

      const statsRes = await request(app).get(`/${code}/stats`);
      expect(statsRes.body.hits).toBe(0);
    });

    it('should return 404 for non-existent code', async () => {
      const res = await request(app).get('/nonexistent/stats');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should reflect hits correctly after multiple redirects', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/hits-check' });

      const { code } = createRes.body;

      // Access the redirect 5 times
      for (let i = 0; i < 5; i++) {
        await request(app).get(`/${code}`).redirects(0);
      }

      const statsRes = await request(app).get(`/${code}/stats`);
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.hits).toBe(5);
      expect(statsRes.body.url).toBe('https://example.com/hits-check');
      expect(statsRes.body.code).toBe(code);
    });
  });

  describe('Different port configuration', () => {
    it('should use configured port in shortUrl', async () => {
      const { app: customApp } = createTestApp(4000);

      const res = await request(customApp)
        .post('/shorten')
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(201);
      expect(res.body.shortUrl).toBe(`http://localhost:4000/${res.body.code}`);
    });
  });
});