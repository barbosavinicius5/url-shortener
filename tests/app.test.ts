import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { InMemoryUrlStore } from '../src/store/inMemoryUrlStore';
import * as urlShortenerService from '../src/services/urlShortenerService';

describe('URL Shortener API', () => {
  let store: InMemoryUrlStore;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    store = new InMemoryUrlStore();
    app = createApp(store);
  });

  describe('POST /shorten', () => {
    it('should create a short URL and return 201 with code and shortUrl', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/long-page' })
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('shortUrl');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
    });

    it('should redirect to the original URL on GET /:code', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/long-page' })
        .expect(201);

      const { code } = createRes.body;

      const redirectRes = await request(app)
        .get(`/${code}`)
        .redirects(0)
        .expect(302);

      expect(redirectRes.headers.location).toBe('https://example.com/long-page');
    });

    it('should generate distinct codes for two different URLs', async () => {
      const res1 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/first' })
        .expect(201);

      const res2 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/second' })
        .expect(201);

      expect(res1.body.code).not.toBe(res2.body.code);
    });

    it('should generate distinct codes even for the same URL', async () => {
      const url = 'https://example.com/same-page';

      const res1 = await request(app)
        .post('/shorten')
        .send({ url })
        .expect(201);

      const res2 = await request(app)
        .post('/shorten')
        .send({ url })
        .expect(201);

      expect(res1.body.code).not.toBe(res2.body.code);
    });

    it('should retry when generated code collides', async () => {
      // Pre-seed store with code that will be generated first
      // We use vi.mock on the crypto module to control randomBytes
      vi.doMock('crypto', () => {
        let callCount = 0;
        return {
          randomBytes: (_size: number) => {
            callCount++;
            if (callCount <= 2) {
              // First two calls return the same bytes => collision
              return Buffer.from([0, 0, 0, 0, 0, 0]);
            }
            // Third call returns different bytes
            return Buffer.from([1, 1, 1, 1, 1, 1]);
          },
        };
      });

      // Need to re-import the modules with the mocked crypto
      const { createApp: mockedCreateApp } = await import('../src/app');
      const { InMemoryUrlStore: MockedStore } = await import('../src/store/inMemoryUrlStore');

      const collisionStore = new MockedStore();
      // Pre-seed with code 'AAAAAA' (all zeros = 6 'A's)
      collisionStore.save({ code: 'AAAAAA', url: 'https://example.com/existing', hits: 0 });
      const mockedApp = mockedCreateApp(collisionStore);

      const res = await request(mockedApp)
        .post('/shorten')
        .send({ url: 'https://example.com/new-page' })
        .expect(201);

      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.code).not.toBe('AAAAAA');

      vi.unmock('crypto');
    });

    it('should return 400 when url is missing', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).not.toHaveLength(0);
    });

    it('should return 400 when url is empty string', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).not.toHaveLength(0);
    });

    it('should return 400 when url scheme is not http/https', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).not.toHaveLength(0);
    });

    it('should return 400 when url is not a string', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 12345 })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).not.toHaveLength(0);
    });

    it('should not create a record when validation fails', async () => {
      await request(app)
        .post('/shorten')
        .send({ url: 'invalid' })
        .expect(400);

      // Verify that no URL was created (store is empty)
      await request(app)
        .get('/invalid')
        .redirects(0)
        .expect(404);
    });
  });

  describe('GET /:code', () => {
    it('should return 404 for non-existent code', async () => {
      const res = await request(app)
        .get('/nonexist')
        .redirects(0)
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Short URL not found');
    });

    it('should redirect 302 for an existing code', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/test-redirect' })
        .expect(201);

      const { code } = createRes.body;

      const res = await request(app)
        .get(`/${code}`)
        .redirects(0)
        .expect(302);

      expect(res.headers.location).toBe('https://example.com/test-redirect');
    });
  });

  describe('GET /:code/stats', () => {
    it('should return 200 with code, url, and hits: 0 for a new record', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/stats-test' })
        .expect(201);

      const { code } = createRes.body;

      const res = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(res.body).toEqual({
        code,
        url: 'https://example.com/stats-test',
        hits: 0,
      });
    });

    it('should reflect incremented hits after redirects', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/hits-test' })
        .expect(201);

      const { code } = createRes.body;

      // First redirect
      await request(app).get(`/${code}`).redirects(0).expect(302);
      // Second redirect
      await request(app).get(`/${code}`).redirects(0).expect(302);
      // Third redirect
      await request(app).get(`/${code}`).redirects(0).expect(302);

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body).toEqual({
        code,
        url: 'https://example.com/hits-test',
        hits: 3,
      });
    });

    it('should not increment hits when stats are queried', async () => {
      const createRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/stats-no-inc' })
        .expect(201);

      const { code } = createRes.body;

      // Query stats twice
      await request(app).get(`/${code}/stats`).expect(200);
      const statsRes = await request(app).get(`/${code}/stats`).expect(200);

      expect(statsRes.body.hits).toBe(0);
    });

    it('should return 404 for non-existent code', async () => {
      const res = await request(app)
        .get('/missing/stats')
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Short URL not found');
    });
  });

  describe('PORT configuration', () => {
    afterEach(() => {
      delete process.env.PORT;
    });

    it('should use default port 3000 in shortUrl when PORT is not set', async () => {
      delete process.env.PORT;
      const appWithDefaultPort = createApp(new InMemoryUrlStore());

      const res = await request(appWithDefaultPort)
        .post('/shorten')
        .send({ url: 'https://example.com/default-port' })
        .expect(201);

      expect(res.body.shortUrl).toMatch(/^http:\/\/localhost:3000\//);
    });

    it('should use PORT env var in shortUrl when PORT is set', async () => {
      process.env.PORT = '8080';
      const appWithCustomPort = createApp(new InMemoryUrlStore());

      const res = await request(appWithCustomPort)
        .post('/shorten')
        .send({ url: 'https://example.com/custom-port' })
        .expect(201);

      expect(res.body.shortUrl).toMatch(/^http:\/\/localhost:8080\//);
    });
  });

  describe('Malformed JSON', () => {
    it('should return 400 with error for invalid JSON body', async () => {
      const res = await request(app)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send('not-json')
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });
});