import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';
import { InMemoryUrlStore } from '../src/storage/in-memory-url.store';
import { getPort } from '../src/config/env';

function buildApp(port = 3000): { store: InMemoryUrlStore; app: Express } {
  const store = new InMemoryUrlStore();
  const app = createApp(store, { port });
  return { store, app };
}

let store: InMemoryUrlStore;
let app: Express;

beforeEach(() => {
  const built = buildApp(3000);
  store = built.store;
  app = built.app;
});

describe('POST /shorten', () => {
  it('returns 201 with a six-character code and shortUrl on the configured port', async () => {
    const response = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/page' });

    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(
      `http://localhost:3000/${response.body.code}`
    );
  });

  it('generates distinct codes for two creations, even for the same URL', async () => {
    const first = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/same' });
    const second = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/same' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.code).not.toBe(second.body.code);
  });

  it('returns 400 with an error property for unusable bodies', async () => {
    const invalidBodies: unknown[] = [
      {},
      { url: 42 },
      { url: '' },
      { url: 'not a url' },
      { url: 'ftp://example.com/file' },
      { url: 'javascript:alert(1)' }
    ];

    for (const body of invalidBodies) {
      const response = await request(app)
        .post('/shorten')
        .send(body as object);

      expect(response.status).toBe(400);
      expect(typeof response.body.error).toBe('string');
    }
  });

  it('returns 400 with an error property for a non-object body', async () => {
    const response = await request(app).post('/shorten').send('plain string');

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe('string');
  });

  it('returns 400 with an error property for malformed JSON', async () => {
    const response = await request(app)
      .post('/shorten')
      .set('Content-Type', 'application/json')
      .send('{"url": "https://example.com"');

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe('string');
  });
});

describe('GET /:code', () => {
  it('redirects 302 to the original URL and sets Location', async () => {
    const created = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/target' });

    const response = await request(app)
      .get(`/${created.body.code}`)
      .redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://example.com/target');
  });

  it('returns 404 with an error property for an unknown code', async () => {
    const response = await request(app).get('/zzzzzz').redirects(0);

    expect(response.status).toBe(404);
    expect(typeof response.body.error).toBe('string');
  });
});

describe('GET /:code/stats', () => {
  it('counts hits from redirects and stays unchanged when stats are read', async () => {
    const created = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/counted' });
    const code = created.body.code;

    await request(app).get(`/${code}`).redirects(0);
    await request(app).get(`/${code}/stats`);
    await request(app).get(`/${code}`).redirects(0);

    const response = await request(app).get(`/${code}/stats`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      code,
      url: 'https://example.com/counted',
      hits: 2
    });
  });

  it('returns 404 with an error property for an unknown code', async () => {
    const response = await request(app).get('/zzzzzz/stats');

    expect(response.status).toBe(404);
    expect(typeof response.body.error).toBe('string');
  });
});

describe('port configuration', () => {
  it('composes shortUrl with a custom port', async () => {
    const { app: customApp } = buildApp(4310);

    const response = await request(customApp)
      .post('/shorten')
      .send({ url: 'https://example.com/port' });

    expect(response.status).toBe(201);
    expect(response.body.shortUrl).toBe(
      `http://localhost:4310/${response.body.code}`
    );
  });

  it('defaults getPort to 3000 when PORT is not set', () => {
    expect(getPort({})).toBe(3000);
  });
});

describe('unknown routes', () => {
  it('returns 404 JSON for paths without a route', async () => {
    const response = await request(app).get('/definitely/not/a/route');

    expect(response.status).toBe(404);
    expect(typeof response.body.error).toBe('string');
  });
});