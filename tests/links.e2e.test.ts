import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { InMemoryLinkStore } from '../src/store/in-memory-link-store';
import { UrlShortenerService, defaultCodeGenerator } from '../src/services/url-shortener-service';

describe('URL Shortener API — End-to-End', () => {
  let app: ReturnType<typeof createApp>['app'];
  let store: InMemoryLinkStore;
  let service: UrlShortenerService;

  beforeEach(() => {
    store = new InMemoryLinkStore();
    service = new UrlShortenerService(store);
    const created = createApp({ store, service });
    app = created.app;
  });

  describe('POST /shorten', () => {
    it('should create a short link for a valid HTTPS URL', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/page' })
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body).toHaveProperty('shortUrl');
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
    });

    it('should create a short link for a valid HTTP URL', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'http://example.com/page' })
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it('should return 400 when body is missing', async () => {
      const res = await request(app)
        .post('/shorten')
        .send()
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(store.size()).toBe(0);
    });

    it('should return 400 when url is missing', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(store.size()).toBe(0);
    });

    it('should return 400 when url is empty string', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(store.size()).toBe(0);
    });

    it('should return 400 when url is whitespace only', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: '   ' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(store.size()).toBe(0);
    });

    it('should return 400 when url has invalid scheme (ftp)', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 'ftp://example.com/file' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(store.size()).toBe(0);
    });

    it('should return 400 when url is not a string', async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: 12345 })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(store.size()).toBe(0);
    });

    it('should return 201 with different codes for the same URL', async () => {
      const res1 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/pagina' })
        .expect(201);

      const res2 = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/pagina' })
        .expect(201);

      expect(res1.body.code).not.toBe(res2.body.code);
      expect(res1.body.shortUrl).not.toBe(res2.body.shortUrl);
    });

    it('should create a link with a custom code generator to test collision', async () => {
      // Create a link normally
      const firstRes = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com/first' })
        .expect(201);

      const existingCode = firstRes.body.code;

      // Now create a new app with a generator that returns the existing code first, then a new one
      const collisionStore = new InMemoryLinkStore();
      let callCount = 0;
      const collisionGenerator = () => {
        callCount++;
        if (callCount === 1) return existingCode;
        return 'NEWCR6'; // different code
      };
      const collisionService = new UrlShortenerService(collisionStore, collisionGenerator);
      const collisionApp = createApp({ store: collisionStore, service: collisionService }).app;

      // First create a link to occupy the existingCode
      await request(collisionApp)
        .post('/shorten')
        .send({ url: 'https://example.com/other' })
        .expect(201);

      // Now create a second link - should retry on collision
      const res = await request(collisionApp)
        .post('/shorten')
        .send({ url: 'https://example.com/second' })
        .expect(201);

      expect(res.body.code).toBe('NEWCR6');
      expect(callCount).toBe(2);

      // Original link should still exist
      const orig = collisionStore.findByCode(existingCode);
      expect(orig).toBeDefined();
      expect(orig!.url).toBe('https://example.com/other');

      // New link should exist too
      const newLink = collisionStore.findByCode('NEWCR6');
      expect(newLink).toBeDefined();
      expect(newLink!.url).toBe('https://example.com/second');
    });
  });

  describe('GET /:code — Redirect', () => {
    let code: string;
    const testUrl = 'https://example.com/dest';

    beforeEach(async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: testUrl })
        .expect(201);
      code = res.body.code;
    });

    it('should redirect with 302 to the original URL', async () => {
      const res = await request(app)
        .get(`/${code}`)
        .expect(302);

      expect(res.headers.location).toBe(testUrl);
    });

    it('should increment hits on successful redirect', async () => {
      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body.hits).toBe(2);
    });

    it('should return 404 for non-existent code', async () => {
      const res = await request(app)
        .get('/NONEX1')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('should not create a link or alter store on 404 redirect', async () => {
      const initialSize = store.size();
      await request(app).get('/NONEX1').expect(404);
      expect(store.size()).toBe(initialSize);
    });
  });

  describe('GET /:code/stats — Stats', () => {
    let code: string;
    const testUrl = 'https://example.com/stats-test';

    beforeEach(async () => {
      const res = await request(app)
        .post('/shorten')
        .send({ url: testUrl })
        .expect(201);
      code = res.body.code;
    });

    it('should return 200 with code, url, and hits for existing link', async () => {
      const res = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(res.body).toEqual({
        code,
        url: testUrl,
        hits: 0,
      });
    });

    it('should show correct hits after multiple redirects', async () => {
      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);

      const res = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(res.body.hits).toBe(2);
    });

    it('should not increment hits when stats are queried', async () => {
      await request(app).get(`/${code}`).expect(302);

      const res1 = await request(app).get(`/${code}/stats`).expect(200);
      expect(res1.body.hits).toBe(1);

      const res2 = await request(app).get(`/${code}/stats`).expect(200);
      expect(res2.body.hits).toBe(1); // should not have increased
    });

    it('should return 404 for non-existent code', async () => {
      const res = await request(app)
        .get('/NONEX1/stats')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('should return exact properties: code, url, hits', async () => {
      const res = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      const keys = Object.keys(res.body);
      expect(keys).toEqual(['code', 'url', 'hits']);
    });
  });

  describe('Port configuration', () => {
    it('should use http://localhost:3000 by default', async () => {
      const { app: freshApp } = createApp();
      const res = await request(freshApp)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res.body.shortUrl).toMatch(/^http:\/\/localhost:3000\//);
    });

    it('should reflect PORT env in shortUrl when configured', async () => {
      // Save original
      const originalPort = process.env.PORT;
      process.env.PORT = '4000';

      // Re-import to pick up new PORT
      const { getPort } = await import('../src/config/env');
      const { createApp: createAppAgain } = await import('../src/app');

      const freshStore = new InMemoryLinkStore();
      const freshService = new UrlShortenerService(freshStore);
      const { app: portApp } = createAppAgain({ store: freshStore, service: freshService });

      const res = await request(portApp)
        .post('/shorten')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res.body.shortUrl).toBe(`http://localhost:4000/${res.body.code}`);

      // Restore
      process.env.PORT = originalPort;
    });
  });
});

describe('UrlShortenerService — Unit', () => {
  it('should reject a non-string url', () => {
    const store = new InMemoryLinkStore();
    const service = new UrlShortenerService(store);
    expect(service.validateUrl('')).not.toBeNull();
    expect(service.validateUrl('   ')).not.toBeNull();
  });

  it('should reject invalid protocols', () => {
    const store = new InMemoryLinkStore();
    const service = new UrlShortenerService(store);
    expect(service.validateUrl('ftp://example.com')).not.toBeNull();
    expect(service.validateUrl('file:///tmp/test')).not.toBeNull();
    expect(service.validateUrl('javascript:alert(1)')).not.toBeNull();
  });

  it('should accept http and https URLs', () => {
    const store = new InMemoryLinkStore();
    const service = new UrlShortenerService(store);
    expect(service.validateUrl('http://example.com')).toBeNull();
    expect(service.validateUrl('https://example.com/path?q=1')).toBeNull();
  });

  it('should generate codes with correct format', () => {
    const code = defaultCodeGenerator();
    expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
  });

  it('should handle collision gracefully', () => {
    const store = new InMemoryLinkStore();
    let callOrder = 0;
    const generator = () => {
      callOrder++;
      if (callOrder === 1) return 'AAAAAA';
      if (callOrder === 2) return 'AAAAAA'; // collide again
      return 'BBBBBB';
    };
    const service = new UrlShortenerService(store, generator);

    // Occupy 'AAAAAA'
    service.createLink('https://example.com/first', 'http://localhost:3000');

    callOrder = 0; // reset for next call
    // Now create a new link, it should collide once and then succeed with BBBBBB
    const gen2 = () => {
      callOrder++;
      if (callOrder <= 2) return 'AAAAAA';
      return 'BBBBBB';
    };
    const service2 = new UrlShortenerService(store, gen2);
    const result = service2.createLink('https://example.com/second', 'http://localhost:3000');
    expect(result.code).toBe('BBBBBB');
  });
});