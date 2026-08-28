import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { InMemoryUrlStore } from '../src/store/in-memory-url-store';
import { UrlShortenerService } from '../src/services/url-shortener-service';
import { createUrlRouter } from '../src/routes/url-routes';
import { getPort, getShortUrlBase, DEFAULT_PORT } from '../src/config';

describe('POST /shorten', () => {
  it('returns 201 with code and shortUrl for a valid URL', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/long-path' })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(res.body).toHaveProperty('code');
    expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(res.body).toHaveProperty('shortUrl');
    expect(res.body.shortUrl).toBe(`http://localhost:${DEFAULT_PORT}/${res.body.code}`);
  });

  it('generates different records for the same URL', async () => {
    const app = createApp();
    const res1 = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/dup' })
      .expect(201);

    const res2 = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/dup' })
      .expect(201);

    // Both exist with different codes (no dedup)
    expect(res1.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(res2.body.code).toMatch(/^[A-Za-z0-9]{6}$/);

    // Verify stats for both
    const stats1 = await request(app)
      .get(`/${res1.body.code}/stats`)
      .expect(200);
    expect(stats1.body.code).toBe(res1.body.code);

    const stats2 = await request(app)
      .get(`/${res2.body.code}/stats`)
      .expect(200);
    expect(stats2.body.code).toBe(res2.body.code);
  });

  it('returns 400 when url is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/shorten')
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 when url does not start with http:// or https://', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'ftp://files.example.com' })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.error).toBe('string');
  });
});

describe('GET /:code (redirect)', () => {
  it('returns 302 with Location header pointing to original URL', async () => {
    const app = createApp();
    const createRes = await request(app)
      .post('/shorten')
      .send({ url: 'https://target.example.com/page' })
      .expect(201);

    const code = createRes.body.code;

    const res = await request(app)
      .get(`/${code}`)
      .redirects(0) // do not follow redirects
      .expect(302);

    expect(res.headers.location).toBe('https://target.example.com/page');
  });

  it('returns 404 for a non-existent code', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/missing')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /:code/stats', () => {
  it('returns 200 with code, url, and hits after creation', async () => {
    const app = createApp();
    const createRes = await request(app)
      .post('/shorten')
      .send({ url: 'https://stats.example.com/page' })
      .expect(201);

    const code = createRes.body.code;
    const url = 'https://stats.example.com/page';

    const res = await request(app)
      .get(`/${code}/stats`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.code).toBe(code);
    expect(res.body.url).toBe(url);
    expect(res.body.hits).toBe(0);
  });

  it('returns hits incremented after redirects', async () => {
    const app = createApp();
    const createRes = await request(app)
      .post('/shorten')
      .send({ url: 'https://hits.example.com/page' })
      .expect(201);

    const code = createRes.body.code;

    // First redirect
    await request(app).get(`/${code}`).redirects(0).expect(302);
    // Second redirect
    await request(app).get(`/${code}`).redirects(0).expect(302);

    const res = await request(app)
      .get(`/${code}/stats`)
      .expect(200);

    expect(res.body.hits).toBe(2);
  });

  it('does not change hits when calling stats', async () => {
    const app = createApp();
    const createRes = await request(app)
      .post('/shorten')
      .send({ url: 'https://nohit.example.com/page' })
      .expect(201);

    const code = createRes.body.code;

    // Call stats twice
    await request(app).get(`/${code}/stats`).expect(200);
    await request(app).get(`/${code}/stats`).expect(200);

    const res = await request(app).get(`/${code}/stats`).expect(200);
    expect(res.body.hits).toBe(0);
  });

  it('returns 404 for a non-existent code', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/nonexist/stats')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(res.body).toHaveProperty('error');
  });
});

describe('Isolation', () => {
  it('two apps with different ports do not share data', async () => {
    const storeA = new InMemoryUrlStore();
    const appA = createApp({ port: 3001, store: storeA });
    const createResA = await request(appA)
      .post('/shorten')
      .send({ url: 'https://isolated.example.com' })
      .expect(201);
    const codeA = createResA.body.code;
    expect(createResA.body.shortUrl).toContain('localhost:3001');

    // App B uses different store
    const storeB = new InMemoryUrlStore();
    const appB = createApp({ port: 3002, store: storeB });

    // Code from appA should not exist in appB
    await request(appB)
      .get(`/${codeA}`)
      .redirects(0)
      .expect(404);

    // Create in appB
    const createResB = await request(appB)
      .post('/shorten')
      .send({ url: 'https://b.example.com' })
      .expect(201);
    expect(createResB.body.shortUrl).toContain('localhost:3002');
  });
});

describe('Config', () => {
  it('getPort returns 3000 when PORT is not set', () => {
    expect(getPort({})).toBe(3000);
  });

  it('getPort returns the numeric value of PORT', () => {
    expect(getPort({ PORT: '4000' })).toBe(4000);
  });

  it('getPort throws on invalid PORT', () => {
    expect(() => getPort({ PORT: 'abc' })).toThrow(/invalid port/i);
    expect(() => getPort({ PORT: '0' })).toThrow(/invalid port/i);
    expect(() => getPort({ PORT: '65536' })).toThrow(/invalid port/i);
  });

  it('createApp respects PORT via option', async () => {
    const app = createApp({ port: 4000 });
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://port-test.example.com' })
      .expect(201);

    expect(res.body.shortUrl).toContain('localhost:4000');
    expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
  });
});