import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const createTestApp = (port = 3000, codes = ['abc123', 'def456', 'ghi789']) => {
  let index = 0;
  return createApp(port, { codeGenerator: () => codes[index++ % codes.length] });
};

describe('URL shortener API', () => {
  it('creates a short URL with the default port and no hits in the response', async () => {
    const response = await request(createTestApp()).post('/shorten').send({ url: 'https://example.com/page' });
    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(`http://localhost:3000/${response.body.code}`);
    expect(response.body).not.toHaveProperty('hits');
  });

  it('uses the configured port in shortUrl', async () => {
    const response = await request(createTestApp(4310)).post('/shorten').send({ url: 'http://example.com' });
    expect(response.body.shortUrl).toBe('http://localhost:4310/abc123');
  });

  it.each([{}, { url: '' }, { url: 'ftp://example.com' }, { url: 123 }])('rejects invalid URL payload %#', async (body) => {
    const response = await request(createTestApp()).post('/shorten').send(body);
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
    expect(response.body.error.length).toBeGreaterThan(0);
  });

  it('redirects and increments hits only for successful redirects', async () => {
    const app = createTestApp();
    const created = await request(app).post('/shorten').send({ url: 'https://example.com/original' });
    const code = created.body.code;
    const first = await request(app).get(`/${code}`).redirects(0);
    expect(first.status).toBe(302);
    expect(first.headers.location).toBe('https://example.com/original');
    const second = await request(app).get(`/${code}`).redirects(0);
    expect(second.status).toBe(302);
    const stats = await request(app).get(`/${code}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body).toEqual({ code, url: 'https://example.com/original', hits: 2 });
    expect((await request(app).get(`/${code}/stats`)).body.hits).toBe(2);
  });

  it('returns 404 for unknown redirect and stats codes', async () => {
    const app = createTestApp();
    const redirect = await request(app).get('/nope12').redirects(0);
    expect(redirect.status).toBe(404);
    expect(redirect.headers.location).toBeUndefined();
    expect((await request(app).get('/nope12/stats')).status).toBe(404);
  });

  it('creates distinct codes for repeated submissions and retries collisions', async () => {
    const app = createTestApp(3000, ['abc123', 'abc123', 'def456']);
    const first = await request(app).post('/shorten').send({ url: 'https://example.com' });
    const second = await request(app).post('/shorten').send({ url: 'https://example.com' });
    expect(first.body.code).toBe('abc123');
    expect(second.body.code).toBe('def456');
  });
});