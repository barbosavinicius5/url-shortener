import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { UrlShortenerService } from '../src/services/urlShortenerService.js';
import { UrlStore } from '../src/store/urlStore.js';

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp(new UrlShortenerService(new UrlStore()));
});

describe('POST /shorten', () => {
  it('creates a six-character alphanumeric short URL', async () => {
    const response = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/a-page' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      code: expect.stringMatching(/^[A-Za-z0-9]{6}$/),
      shortUrl: expect.stringMatching(/^http:\/\/localhost:3000\/[A-Za-z0-9]{6}$/),
    });
  });

  it.each([
    {},
    { url: 123 },
    { url: 'ftp://example.com/resource' },
  ])('rejects an invalid URL payload: %j', async (payload) => {
    const response = await request(app).post('/shorten').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
    expect(response.body.error.length).toBeGreaterThan(0);
  });

  it('rejects a non-object body', async () => {
    const response = await request(app)
      .post('/shorten')
      .set('Content-Type', 'application/json')
      .send('[]');

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });
});

describe('redirects and statistics', () => {
  it('redirects to the original URL with a 302 status', async () => {
    const creation = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/original' });

    const response = await request(app).get(`/${creation.body.code}`).redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://example.com/original');
  });

  it('counts successful redirects in stats', async () => {
    const creation = await request(app)
      .post('/shorten')
      .send({ url: 'http://example.com/count-me' });
    const code = creation.body.code;

    await request(app).get(`/${code}`).redirects(0);
    const stats = await request(app).get(`/${code}/stats`);

    expect(stats.status).toBe(200);
    expect(stats.body).toEqual({
      code,
      url: 'http://example.com/count-me',
      hits: 1,
    });
  });

  it('reports zero hits immediately after creation', async () => {
    const creation = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/not-visited' });

    const stats = await request(app).get(`/${creation.body.code}/stats`);

    expect(stats.status).toBe(200);
    expect(stats.body.hits).toBe(0);
  });

  it('returns 404 for missing redirects and stats without changing stored hits', async () => {
    const creation = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/kept-at-zero' });

    expect((await request(app).get('/missing')).status).toBe(404);
    expect((await request(app).get('/missing/stats')).status).toBe(404);

    const stats = await request(app).get(`/${creation.body.code}/stats`);
    expect(stats.body.hits).toBe(0);
  });

  it('creates independent codes for the same URL', async () => {
    const url = 'https://example.com/repeated';
    const first = await request(app).post('/shorten').send({ url });
    const second = await request(app).post('/shorten').send({ url });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.code).not.toBe(second.body.code);
  });

  it('keeps codes unique across multiple creations', async () => {
    const responses = await Promise.all(
      Array.from({ length: 25 }, (_, index) =>
        request(app).post('/shorten').send({ url: `https://example.com/item-${index}` }),
      ),
    );
    const codes = responses.map((response) => response.body.code);

    expect(responses.every((response) => response.status === 201)).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[A-Za-z0-9]{6}$/.test(code))).toBe(true);
  });
});