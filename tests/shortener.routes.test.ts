import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { UrlStore } from '../src/store/url.store';

function app(port = 3000) { return createApp(new UrlStore(), port); }

async function createUrl(server: ReturnType<typeof app>, url = 'https://example.com/page') {
  return request(server).post('/shorten').send({ url });
}

describe('URL shortener API', () => {
  it('creates a short URL', async () => {
    const response = await createUrl(app());
    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:3000\/[A-Za-z0-9]{6}$/);
  });

  it('creates and redirects to the original URL', async () => {
    const server = app();
    const created = await createUrl(server, 'https://example.com/original');
    const redirected = await request(server).get(`/${created.body.code}`).redirects(0);
    expect(redirected.status).toBe(302);
    expect(redirected.headers.location).toBe('https://example.com/original');
  });

  it('returns 404 for missing codes and stats', async () => {
    const server = app();
    expect((await request(server).get('/missing')).status).toBe(404);
    expect((await request(server).get('/missing/stats')).status).toBe(404);
  });

  it('rejects missing, invalid, and malformed JSON bodies', async () => {
    const server = app();
    expect((await request(server).post('/shorten').send({})).status).toBe(400);
    expect((await request(server).post('/shorten').send({ url: 'ftp://example.com' })).body.error).toEqual(expect.any(String));
    const malformed = await request(server).post('/shorten').set('Content-Type', 'application/json').send('{"url":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toEqual(expect.any(String));
  });

  it('counts redirects and does not count stats reads', async () => {
    const server = app();
    const created = await createUrl(server);
    const code = created.body.code;
    expect((await request(server).get(`/${code}/stats`)).body.hits).toBe(0);
    await request(server).get(`/${code}`).redirects(0);
    await request(server).get(`/${code}`).redirects(0);
    const stats = await request(server).get(`/${code}/stats`);
    expect(stats.body).toEqual({ code, url: 'https://example.com/page', hits: 2 });
  });

  it('generates distinct six-character codes, including for duplicate URLs', async () => {
    const server = app();
    const first = await createUrl(server);
    const second = await createUrl(server);
    expect(first.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(second.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(second.body.code).not.toBe(first.body.code);
  });

  it('uses the injected port in shortUrl', async () => {
    const response = await createUrl(app(4321));
    expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:4321\/[A-Za-z0-9]{6}$/);
  });
});