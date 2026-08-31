import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const originalPort = process.env.PORT;
afterEach(() => {
  if (originalPort === undefined) delete process.env.PORT;
  else process.env.PORT = originalPort;
});

describe('URL shortener API', () => {
  it('creates a valid short link with the default port', async () => {
    delete process.env.PORT;
    const response = await request(createApp()).post('/shorten').send({ url: 'https://example.com/path' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ shortUrl: expect.stringMatching(/^http:\/\/localhost:3000\/[A-Za-z0-9]{6}$/) });
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
  });

  it('uses a configured port when the app is created', async () => {
    process.env.PORT = '4567';
    const response = await request(createApp()).post('/shorten').send({ url: 'http://example.com' });
    expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:4567\//);
  });

  it.each([undefined, {}, { url: 42 }, { url: 'ftp://example.com' }, { url: 'https://' }])('rejects invalid URL payload %j', async (body) => {
    const response = await request(createApp()).post('/shorten').send(body);
    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe('string');
  });

  it('redirects and reports stats without changing hits on stats reads', async () => {
    const app = createApp();
    const created = await request(app).post('/shorten').send({ url: 'https://example.com/original' });
    const code = created.body.code as string;
    expect((await request(app).get(`/${code}/stats`)).body.hits).toBe(0);
    const redirect = await request(app).get(`/${code}`).redirects(0);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe('https://example.com/original');
    expect((await request(app).get(`/${code}/stats`)).body).toEqual({ code, url: 'https://example.com/original', hits: 1 });
    await request(app).get(`/${code}`);
    expect((await request(app).get(`/${code}/stats`)).body.hits).toBe(2);
  });

  it('returns consistent not-found responses and preserves valid links', async () => {
    const app = createApp();
    const created = await request(app).post('/shorten').send({ url: 'https://example.com' });
    const code = created.body.code as string;
    expect((await request(app).get('/missing')).body).toEqual({ error: 'Short link not found' });
    expect((await request(app).get('/missing/stats')).body).toEqual({ error: 'Short link not found' });
    expect((await request(app).get(`/${code}/stats`)).body.hits).toBe(0);
    expect((await request(app).get('/unknown/path')).body).toEqual({ error: 'Not found' });
  });

  it('creates distinct codes for duplicate URLs', async () => {
    const app = createApp();
    const first = await request(app).post('/shorten').send({ url: 'https://example.com' });
    const second = await request(app).post('/shorten').send({ url: 'https://example.com' });
    expect(first.body.code).not.toBe(second.body.code);
  });
});