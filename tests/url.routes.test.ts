import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';
import { InMemoryUrlStore } from '../src/store/url.store';
import { UrlService } from '../src/services/url.service';

describe('URL Shortener API Routes', () => {
  let app: Express;
  let store: InMemoryUrlStore;

  beforeEach(() => {
    store = new InMemoryUrlStore();
    app = createApp({ store });
  });

  describe('POST /shorten', () => {
    it('creates a shortened URL for a valid https URL', async () => {
      const targetUrl = 'https://example.com/some/long/path?param=123';
      const res = await request(app)
        .post('/shorten')
        .send({ url: targetUrl });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('shortUrl');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
    });

    it('creates a shortened URL for a valid http URL', async () => {
      const targetUrl = 'http://example.org/test';
      const res = await request(app)
        .post('/shorten')
        .send({ url: targetUrl });

      expect(res.status).toBe(201);
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
    });

    it('generates distinct codes for duplicate URL submissions', async () => {
      const targetUrl = 'https://example.com/duplicate';
      const res1 = await request(app)
        .post('/shorten')
        .send({ url: targetUrl });
      const res2 = await request(app)
        .post('/shorten')
        .send({ url: targetUrl });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.code).not.toBe(res2.body.code);
    });

    it('uses configured custom port in shortUrl', async () => {
      const customStore = new InMemoryUrlStore();
      const customApp = createApp({ port: 4567, store: customStore });
      const res = await request(customApp)
        .post('/shorten')
        .send({ url: 'https://example.com/custom-port' });

      expect(res.status).toBe(201);
      expect(res.body.shortUrl).toBe(`http://localhost:4567/${res.body.code}`);
    });

    it('returns 400 when body is missing or not a JSON object', async () => {
      const resArray = await request(app)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(['https://example.com']));
      expect(resArray.status).toBe(400);
      expect(resArray.body).toHaveProperty('error');

      const resString = await request(app)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify('https://example.com'));
      expect(resString.status).toBe(400);
      expect(resString.body).toHaveProperty('error');
    });

    it('returns 400 when url field is missing', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url is not a string', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 12345 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url is an empty string', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: '   ' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url lacks a scheme', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'example.com/mypage' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when url has a non-http(s) scheme', async () => {
      const resFtp = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com/file.txt' });
      expect(resFtp.status).toBe(400);
      expect(resFtp.body).toHaveProperty('error');

      const resMailto = await request(app)
        .post('/shorten')
        .send({ url: 'mailto:user@example.com' });
      expect(resMailto.status).toBe(400);
      expect(resMailto.body).toHaveProperty('error');

      const resFile = await request(app)
        .post('/shorten')
        .send({ url: 'file:///etc/passwd' });
      expect(resFile.status).toBe(400);
      expect(resFile.body).toHaveProperty('error');
    });

    it('returns 400 on malformed JSON payload', async () => {
      const res = await request(app)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send('{"url": invalid-json}');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid JSON body' });
    });
  });

  describe('GET /:code (Redirection)', () => {
    it('redirects with 302 to the original URL for existing code', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/redirect-target' });

      const code = createRes.body.code;

      const redirectRes = await request(app)
        .get(`/${code}`)
        .redirects(0);

      expect(redirectRes.status).toBe(302);
      expect(redirectRes.headers.location).toBe('https://example.com/redirect-target');
    });

    it('increments hits counter on successful redirection', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/hits-count' });

      const code = createRes.body.code;

      await request(app).get(`/${code}`).redirects(0);
      await request(app).get(`/${code}`).redirects(0);

      const statsRes = await request(app).get(`/${code}/stats`);
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.hits).toBe(2);
    });

    it('returns 404 for non-existent code and does not redirect', async () => {
      const res = await request(app)
        .get('/nonexistent123')
        .redirects(0);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.headers.location).toBeUndefined();
    });

    it('does not alter hits of existing code when requesting non-existent code', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/isolation-check' });

      const code = createRes.body.code;

      await request(app).get('/wrongCode').redirects(0);

      const statsRes = await request(app).get(`/${code}/stats`);
      expect(statsRes.body.hits).toBe(0);
    });
  });

  describe('GET /:code/stats', () => {
    it('returns 200 with code, url and hits=0 for newly created short URL', async () => {
      const targetUrl = 'https://example.com/new-stats';
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: targetUrl });

      const code = createRes.body.code;

      const statsRes = await request(app).get(`/${code}/stats`);
      expect(statsRes.status).toBe(200);
      expect(statsRes.body).toEqual({
        code,
        url: targetUrl,
        hits: 0,
      });
    });

    it('returns updated hits count after multiple redirects', async () => {
      const targetUrl = 'https://example.com/multi-hits';
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: targetUrl });

      const code = createRes.body.code;

      await request(app).get(`/${code}`).redirects(0);
      await request(app).get(`/${code}`).redirects(0);
      await request(app).get(`/${code}`).redirects(0);

      const statsRes = await request(app).get(`/${code}/stats`);
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.hits).toBe(3);
    });

    it('does not mutate hits count when querying stats multiple times', async () => {
      const targetUrl = 'https://example.com/non-mutating-stats';
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: targetUrl });

      const code = createRes.body.code;

      await request(app).get(`/${code}/stats`);
      await request(app).get(`/${code}/stats`);
      const finalStats = await request(app).get(`/${code}/stats`);

      expect(finalStats.status).toBe(200);
      expect(finalStats.body.hits).toBe(0);
    });

    it('returns 404 for non-existent code stats', async () => {
      const res = await request(app).get('/unknownCode/stats');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Collision resolution and code generation', () => {
    it('retries code generation when collision occurs and generates unique code', async () => {
      const mockStore = new InMemoryUrlStore();
      const generatedCodes = ['dup001', 'dup001', 'unq002'];
      let callCount = 0;
      const generator = () => {
        const selected = generatedCodes[callCount] ?? 'fallback';
        callCount++;
        return selected;
      };

      const customService = new UrlService(mockStore, 3000, generator);
      const customApp = createApp({ service: customService, store: mockStore });

      const res1 = await request(customApp)
        .post('/shorten')
        .send({ url: 'https://example.com/first' });
      expect(res1.status).toBe(201);
      expect(res1.body.code).toBe('dup001');

      const res2 = await request(customApp)
        .post('/shorten')
        .send({ url: 'https://example.com/second' });
      expect(res2.status).toBe(201);
      expect(res2.body.code).toBe('unq002');
      expect(mockStore.findByCode('dup001')?.url).toBe('https://example.com/first');
      expect(mockStore.findByCode('unq002')?.url).toBe('https://example.com/second');
    });
  });
});