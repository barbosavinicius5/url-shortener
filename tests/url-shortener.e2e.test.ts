import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const url = 'https://example.com/original?x=1';

function createTestApp(publicBaseUrl = 'http://localhost:3000') {
  return createApp({ publicBaseUrl });
}

describe('URL shortener API', () => {
  it('creates a short URL with the public contract', async () => {
    const response = await request(createTestApp()).post('/shorten').send({ url });
    expect(response.status).toBe(201);
    expect(Object.keys(response.body).sort()).toEqual(['code', 'shortUrl']);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:3000\/[A-Za-z0-9]{6}$/);
  });

  it('uses an injected public port', async () => {
    const response = await request(createTestApp('http://localhost:4321')).post('/shorten').send({ url });
    expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:4321\/[A-Za-z0-9]{6}$/);
  });

  it('creates distinct codes for the same URL', async () => {
    const app = createTestApp();
    const first = await request(app).post('/shorten').send({ url });
    const second = await request(app).post('/shorten').send({ url });
    expect(first.body.code).not.toBe(second.body.code);
  });

  it.each([
    {}, { url: 42 }, { url: '' }, { url: 'not-a-url' },
    { url: 'ftp://example.com/file' }, { url: 'www.example.com' },
  ])('rejects invalid body %#', async (body) => {
    const response = await request(createTestApp()).post('/shorten').send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'URL must be a valid HTTP or HTTPS URL' });
  });

  it('redirects with 302 to the original URL', async () => {
    const app = createTestApp();
    const created = await request(app).post('/shorten').send({ url });
    const response = await request(app).get(`/${created.body.code}`).redirects(0);
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(url);
  });

  it('counts redirects and does not count stats reads', async () => {
    const app = createTestApp();
    const created = await request(app).post('/shorten').send({ url });
    await request(app).get(`/${created.body.code}`).redirects(0);
    await request(app).get(`/${created.body.code}`).redirects(0);
    const stats = await request(app).get(`/${created.body.code}/stats`);
    expect(stats.body).toEqual({ code: created.body.code, url, hits: 2 });
    expect((await request(app).get(`/${created.body.code}/stats`)).body.hits).toBe(2);
  });

  it('returns 404 for missing codes without changing existing records', async () => {
    const app = createTestApp();
    const created = await request(app).post('/shorten').send({ url });
    expect((await request(app).get('/missing')).status).toBe(404);
    expect((await request(app).get('/missing/stats')).status).toBe(404);
    expect((await request(app).get(`/${created.body.code}/stats`)).body.hits).toBe(0);
  });
});