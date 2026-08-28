import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app';

const DEFAULT_PORT = 3000;

describe('URL Shortener API', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp(DEFAULT_PORT);
  });

  describe('POST /shorten', () => {
    it('creates a short URL and returns 201 with code and shortUrl', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page' })
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('shortUrl');
      expect(Object.keys(res.body)).toEqual(['code', 'shortUrl']);

      const code = res.body.code as string;
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:${DEFAULT_PORT}/${code}`);
    });

    it('respects a configured port', async () => {
      const customPort = 4173;
      const customApp = createApp(customPort);

      const res = await request(customApp)
        .post('/shorten')
        .send({ url: 'https://example.com/page' })
        .expect(201);

      expect(res.body.shortUrl).toBe(`http://localhost:${customPort}/${res.body.code}`);
    });

    it('generates different codes for the same URL', async () => {
      const res1 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page' })
        .expect(201);

      const res2 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page' })
        .expect(201);

      expect(res1.body.code).not.toBe(res2.body.code);
    });

    it('generates unique codes for many creations', async () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const res = await request(app)
          .post('/shorten')
          .send({ url: `https://example.com/page${i}` })
          .expect(201);
        codes.add(res.body.code as string);
      }
      expect(codes.size).toBe(50);
    });

    it('returns 400 when url is missing', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });

    it('returns 400 when url is empty string', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url is whitespace only', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: '   ' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url is a relative path', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: '/relative/path' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url uses non-HTTP scheme', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'javascript:alert(1)' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url is malformed', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'not-a-url' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url is a number', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 123 })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url is an object', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: {} })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url is an array', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: ['https://example.com'] })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 with invalid JSON payload', async () => {
      await request(app)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send('{"url": }')
        .expect(400);
    });
  });

  describe('GET /:code', () => {
    it('redirects to the original URL with 302', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page' })
        .expect(201);

      const code = createRes.body.code as string;

      const redirectRes = await request(app)
        .get(`/${code}`)
        .expect(302);

      expect(redirectRes.headers['location']).toBe('https://example.com/page');
    });

    it('returns 404 for missing code', async () => {
      const res = await request(app)
        .get('/missing')
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('GET /:code/stats', () => {
    it('returns stats with correct fields', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page' })
        .expect(201);

      const code = createRes.body.code as string;

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body).toEqual({
        code,
        url: 'https://example.com/page',
        hits: 0,
      });
    });

    it('reflects hits from redirects', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page' })
        .expect(201);

      const code = createRes.body.code as string;

      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body.hits).toBe(3);
    });

    it('does not increment hits when querying stats', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page' })
        .expect(201);

      const code = createRes.body.code as string;

      await request(app).get(`/${code}/stats`).expect(200);
      await request(app).get(`/${code}/stats`).expect(200);

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body.hits).toBe(0);
    });

    it('returns 404 for missing code', async () => {
      const res = await request(app)
        .get('/missing/stats')
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });
  });
});