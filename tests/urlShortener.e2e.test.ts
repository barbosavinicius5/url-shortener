import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import express from 'express';

function createTestApp(port = 3000) {
  return createApp({ port, baseUrl: `http://localhost:${port}` });
}

describe('URL Shortener API', () => {
  let app: express.Express;

  beforeEach(() => {
    const testApp = createTestApp();
    app = testApp.app;
  });

  describe('POST /shorten', () => {
    it('should create a short URL and return 201 with code and shortUrl', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('shortUrl');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
    });

    it('should return 400 when url is missing', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });

    it('should return 400 when url is not a string', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 123 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for invalid URL format', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'not-a-url' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for disallowed protocol', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com/file' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should allow duplicate URLs with different codes', async () => {
      const res1 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/dup' });

      const res2 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/dup' });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.code).not.toBe(res2.body.code);
    });
  });

  describe('GET /:code', () => {
    it('should redirect to the original URL with 302', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/redirect' });

      const { code } = createRes.body;

      const res = await request(app).get(`/${code}`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://example.com/redirect');
    });

    it('should return 404 for non-existent code', async () => {
      const res = await request(app).get('/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /:code/stats', () => {
    it('should return stats with hits: 0 for newly created URL', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/stats' });

      const { code } = createRes.body;

      const res = await request(app).get(`/${code}/stats`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code,
        url: 'https://example.com/stats',
        hits: 0,
      });
    });

    it('should not increment hits when querying stats', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/stats-no-inc' });

      const { code } = createRes.body;

      await request(app).get(`/${code}/stats`);
      await request(app).get(`/${code}/stats`);

      const res = await request(app).get(`/${code}/stats`);

      expect(res.status).toBe(200);
      expect(res.body.hits).toBe(0);
    });

    it('should increment hits after successful redirects', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/hits' });

      const { code } = createRes.body;

      await request(app).get(`/${code}`);
      await request(app).get(`/${code}`);

      const statsRes = await request(app).get(`/${code}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.hits).toBe(2);
    });

    it('should not increment hits for non-existent code redirects', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/hits-no-inc' });

      const { code } = createRes.body;

      // Try to redirect with wrong code
      await request(app).get('/wrongcode');

      const statsRes = await request(app).get(`/${code}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.hits).toBe(0);
    });

    it('should return 404 for non-existent code stats', async () => {
      const res = await request(app).get('/nonexistent/stats');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Configuration', () => {
    it('should use PORT from config for shortUrl base', () => {
      const testApp = createTestApp(4000);
      const { config } = testApp;
      expect(config.port).toBe(4000);
      expect(config.baseUrl).toBe('http://localhost:4000');
    });

    it('should default to port 3000 when no config provided', () => {
      const config = (createApp() as any).config;
      expect(config.port).toBe(3000);
      expect(config.baseUrl).toBe('http://localhost:3000');
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/unknown-route');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for malformed JSON body', async () => {
      const res = await request(app)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send('{"invalid json');

      expect(res.status).toBe(400);
    });
  });
});