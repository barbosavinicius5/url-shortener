import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { resolvePort } from '../src/server';
import { UrlStore } from '../src/store/url-store';

const makeApp = (port = 3000) => request(createApp(new UrlStore(), port));

describe('URL shortener API', () => {
  it('creates a shortening with a six-character code and configured port', async () => {
    const response = await makeApp(4310).post('/shorten').send({ url: 'https://example.com/page' });
    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(`http://localhost:4310/${response.body.code}`);
  });

  it('redirects and records exactly one hit per redirect', async () => {
    const api = makeApp();
    const created = await api.post('/shorten').send({ url: 'https://example.com/original' });
    const code = created.body.code as string;
    const redirect = await api.get(`/${code}`).redirects(0);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe('https://example.com/original');
    const stats = await api.get(`/${code}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body).toEqual({ code, url: 'https://example.com/original', hits: 1 });
    await api.get(`/${code}/stats`);
    expect((await api.get(`/${code}/stats`)).body.hits).toBe(1);
  });

  it('generates unique alphanumeric codes', async () => {
    const api = makeApp();
    const codes: string[] = [];
    for (let index = 0; index < 100; index += 1) {
      const response = await api.post('/shorten').send({ url: `https://example.com/${index}` });
      expect(response.status).toBe(201);
      codes.push(response.body.code as string);
    }
    expect(new Set(codes).size).toBe(100);
    expect(codes.every((code) => /^[A-Za-z0-9]{6}$/.test(code))).toBe(true);
  });

  it.each([undefined, '', 'relative/path', 'ftp://example.com/file', 42])('rejects invalid URL %p', async (url) => {
    const body = url === undefined ? {} : { url };
    const response = await makeApp().post('/shorten').send(body);
    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('error');
  });

  it('accepts HTTP and defaults the port to 3000', async () => {
    expect(resolvePort(undefined)).toBe(3000);
    const response = await makeApp().post('/shorten').send({ url: 'http://example.com' });
    expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:3000\/[A-Za-z0-9]{6}$/);
  });

  it.each(['/missing', '/missing/stats'])('returns JSON 404 for %s', async (path) => {
    const response = await makeApp().get(path);
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 400 JSON for malformed JSON', async () => {
    const response = await makeApp().post('/shorten').set('Content-Type', 'application/json').send('{"url":');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});