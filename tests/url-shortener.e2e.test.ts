import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { getPort } from '../src/config/environment';

const validUrl = 'https://example.com/original';

describe('URL shortener API', () => {
  it('creates a short URL with the expected shape', async () => {
    const response = await request(createApp()).post('/shorten').send({ url: validUrl });
    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:3000\/[A-Za-z0-9]{6}$/);
  });

  it('creates distinct codes for the same URL', async () => {
    const api = request(createApp());
    const first = await api.post('/shorten').send({ url: validUrl });
    const second = await api.post('/shorten').send({ url: validUrl });
    expect(first.body.code).not.toBe(second.body.code);
  });

  it.each([
    {},
    { url: 123 },
    { url: 'not a URL' },
    { url: 'ftp://example.com/file' },
  ])('rejects invalid input %#', async (body) => {
    const response = await request(createApp()).post('/shorten').send(body);
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
    expect(response.body.error.length).toBeGreaterThan(0);
  });

  it('redirects and starts stats at zero', async () => {
    const api = request(createApp());
    const created = await api.post('/shorten').send({ url: validUrl });
    const redirect = await api.get(`/${created.body.code}`).redirects(0);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe(validUrl);
    const stats = await api.get(`/${created.body.code}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body).toEqual({ code: created.body.code, url: validUrl, hits: 1 });
  });

  it('counts successful redirects and not stats requests', async () => {
    const api = request(createApp());
    const created = await api.post('/shorten').send({ url: validUrl });
    const path = `/${created.body.code}`;
    await api.get(`${path}/stats`);
    await api.get(path).redirects(0);
    await api.get(`${path}/stats`);
    await api.get(path).redirects(0);
    const stats = await api.get(`${path}/stats`);
    expect(stats.body.hits).toBe(2);
  });

  it('returns JSON 404 for missing redirect and stats', async () => {
    const api = request(createApp());
    for (const path of ['/missing', '/missing/stats']) {
      const response = await api.get(path).redirects(0);
      expect(response.status).toBe(404);
      expect(response.body.error).toEqual(expect.any(String));
    }
  });

  it('uses a custom port in the generated short URL', async () => {
    const response = await request(createApp(4321)).post('/shorten').send({ url: validUrl });
    expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:4321\/[A-Za-z0-9]{6}$/);
    expect(getPort({ PORT: '4321' })).toBe(4321);
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await request(createApp()).post('/shorten').set('Content-Type', 'application/json').send('{');
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });
});