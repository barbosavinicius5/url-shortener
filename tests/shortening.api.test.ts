import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { InMemoryUrlStore } from '../src/store/in-memory-url.store';

const makeApp = (port = 3000) => request(createApp(port, new InMemoryUrlStore()));

describe('URL shortening API', () => {
  it('creates a shortening and redirects to its destination', async () => {
    const api = makeApp(4321);
    const create = await api.post('/shorten').send({ url: 'https://example.com/path?q=1' });
    expect(create.status).toBe(201);
    expect(create.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(create.body.shortUrl).toBe(`http://localhost:4321/${create.body.code}`);

    const redirect = await api.get(`/${create.body.code}`);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe('https://example.com/path?q=1');
  });

  it('returns 404 for unknown redirect and stats codes', async () => {
    const api = makeApp();
    expect((await api.get('/missing')).status).toBe(404);
    expect((await api.get('/missing/stats')).status).toBe(404);
  });

  it.each([
    undefined,
    {},
    { url: '' },
    { url: 'ftp://example.com/file' },
    { url: 'not-a-url' },
  ])('rejects invalid input %#', async (body) => {
    const response = body === undefined ? await makeApp().post('/shorten') : await makeApp().post('/shorten').send(body);
    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe('string');
    expect(response.body.error.length).toBeGreaterThan(0);
  });

  it('counts redirects but not stats requests', async () => {
    const api = makeApp();
    const created = await api.post('/shorten').send({ url: 'http://example.com' });
    const path = `/${created.body.code}`;
    await api.get(path);
    await api.get(path);
    const stats = await api.get(`${path}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body).toEqual({ code: created.body.code, url: 'http://example.com', hits: 2 });
    expect((await api.get(`${path}/stats`)).body.hits).toBe(2);
  });

  it('generates unique six-character alphanumeric codes', async () => {
    const api = makeApp();
    const responses = await Promise.all(Array.from({ length: 20 }, () => api.post('/shorten').send({ url: 'https://example.com' })));
    const codes = responses.map((response) => response.body.code);
    expect(new Set(codes).size).toBe(codes.length);
    codes.forEach((code) => expect(code).toMatch(/^[A-Za-z0-9]{6}$/));
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await makeApp().post('/shorten').set('Content-Type', 'application/json').send('{"url":');
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });
});
