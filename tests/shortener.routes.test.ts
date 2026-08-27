import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const makeApp = (port?: number) => createApp(port ? { port } : {});

describe('URL shortener HTTP API', () => {
  it('creates a short URL with the default port', async () => {
    const response = await request(makeApp()).post('/shorten').send({ url: 'https://example.com/page' });
    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(`http://localhost:3000/${response.body.code}`);
  });

  it('creates different codes for repeated URLs', async () => {
    const app = makeApp();
    const first = await request(app).post('/shorten').send({ url: 'https://example.com' });
    const second = await request(app).post('/shorten').send({ url: 'https://example.com' });
    expect(second.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(second.body.code).not.toBe(first.body.code);
  });

  it.each([undefined, '', 'ftp://example.com', 'example.com'])('rejects invalid URL %s', async (url) => {
    const response = await request(makeApp()).post('/shorten').send(url === undefined ? {} : { url });
    expect(response.status).toBe(400);
    expect(response.type).toMatch(/json/);
    expect(response.body.error).toEqual(expect.any(String));
  });

  it('rejects malformed JSON', async () => {
    const response = await request(makeApp()).post('/shorten').set('Content-Type', 'application/json').send('{');
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });

  it('redirects and counts hits, while stats remains read-only', async () => {
    const app = makeApp();
    const created = await request(app).post('/shorten').send({ url: 'https://example.com/original' });
    const code = created.body.code;
    expect((await request(app).get(`/${code}/stats`)).body).toEqual({ code, url: 'https://example.com/original', hits: 0 });
    const redirect = await request(app).get(`/${code}`);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe('https://example.com/original');
    await request(app).get(`/${code}`);
    expect((await request(app).get(`/${code}/stats`)).body).toEqual({ code, url: 'https://example.com/original', hits: 2 });
  });

  it('returns JSON 404s and uses an explicit port', async () => {
    const app = makeApp(8080);
    const created = await request(app).post('/shorten').send({ url: 'http://example.com' });
    expect(created.body.shortUrl).toBe(`http://localhost:8080/${created.body.code}`);
    for (const path of ['/missing', '/missing/stats', '/unknown-route']) {
      const response = await request(app).get(path);
      expect(response.status).toBe(404);
      expect(response.body.error).toEqual(expect.any(String));
    }
  });
});