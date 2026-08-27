import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { LinkService } from '../src/services/link-service.js';
import { InMemoryLinkStore } from '../src/store/in-memory-link-store.js';

function createTestApp(port = 3000, generator?: () => string) {
  const store = new InMemoryLinkStore();
  const service = new LinkService(store, generator);
  return { app: createApp({ port, service }), service, store };
}

describe('link API', () => {
  it('creates a link with the default port', async () => {
    const { app } = createTestApp();

    const response = await request(app).post('/shorten').send({ url: 'https://example.com/path' });

    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(`http://localhost:3000/${response.body.code}`);
  });

  it('uses a custom port in the short URL', async () => {
    const { app } = createTestApp(8080);

    const response = await request(app).post('/shorten').send({ url: 'https://example.com/path' });

    expect(response.status).toBe(201);
    expect(response.body.shortUrl).toBe(`http://localhost:8080/${response.body.code}`);
  });

  it('redirects to the original URL', async () => {
    const { app } = createTestApp();
    const creation = await request(app).post('/shorten').send({ url: 'https://example.com/path' });

    const response = await request(app).get(`/${creation.body.code}`).redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://example.com/path');
  });

  it('counts multiple redirects and does not count stats requests', async () => {
    const { app } = createTestApp();
    const creation = await request(app).post('/shorten').send({ url: 'https://example.com/path' });
    const code = creation.body.code as string;

    expect((await request(app).get(`/${code}`).redirects(0)).status).toBe(302);
    expect((await request(app).get(`/${code}`).redirects(0)).status).toBe(302);

    const firstStats = await request(app).get(`/${code}/stats`);
    const secondStats = await request(app).get(`/${code}/stats`);
    expect(firstStats.status).toBe(200);
    expect(firstStats.body).toEqual({ code, url: 'https://example.com/path', hits: 2 });
    expect(secondStats.body).toEqual({ code, url: 'https://example.com/path', hits: 2 });
  });

  it('returns initial stats without incrementing hits', async () => {
    const { app } = createTestApp();
    const creation = await request(app).post('/shorten').send({ url: 'https://example.com/path' });
    const response = await request(app).get(`/${creation.body.code}/stats`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ code: creation.body.code, url: 'https://example.com/path', hits: 0 });
  });

  it.each([
    [{}, 'missing URL'],
    [{ url: 123 }, 'non-string URL'],
    [{ url: 'ftp://example.com' }, 'unsupported protocol'],
  ])('rejects %s', async (body) => {
    const { app } = createTestApp();
    const response = await request(app).post('/shorten').send(body);

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });

  it('creates different codes for repeated URLs', async () => {
    const generatedCodes = ['AAAA00', 'AAAA01'];
    const generator = () => generatedCodes.shift() ?? 'AAAA02';
    const { app } = createTestApp(3000, generator);

    const first = await request(app).post('/shorten').send({ url: 'https://example.com/path' });
    const second = await request(app).post('/shorten').send({ url: 'https://example.com/path' });

    expect(first.body.code).not.toBe(second.body.code);
  });

  it('retries when the generated code collides', () => {
    const generatedCodes = ['ABC123', 'ABC123', 'XYZ789'];
    const service = new LinkService(new InMemoryLinkStore(), () => generatedCodes.shift() ?? 'LAST00');

    service.createLink('https://example.com/first');
    const created = service.createLink('https://example.com/second');

    expect(created.code).toBe('XYZ789');
    expect(service.getStats('ABC123')).toMatchObject({ url: 'https://example.com/first' });
  });

  it('returns 404 for unknown codes in redirect and stats', async () => {
    const { app } = createTestApp();

    const redirect = await request(app).get('/missing').redirects(0);
    const stats = await request(app).get('/missing/stats');

    expect(redirect.status).toBe(404);
    expect(redirect.body).toEqual({ error: 'Short code not found' });
    expect(stats.status).toBe(404);
    expect(stats.body).toEqual({ error: 'Short code not found' });
  });
});