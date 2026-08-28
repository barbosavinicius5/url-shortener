import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';

async function createShortUrl(app: Express, url: string): Promise<string> {
  const response = await request(app).post('/shorten').send({ url });
  expect(response.status).toBe(201);
  expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
  return response.body.code as string;
}

function expectBadRequest(response: { status: number; body: { error?: unknown } }): void {
  expect(response.status).toBe(400);
  expect(typeof response.body.error).toBe('string');
  expect((response.body.error as string).length).toBeGreaterThan(0);
}

describe('POST /shorten', () => {
  it('creates a short URL using the default port 3000', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/page' });

    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(
      `http://localhost:3000/${response.body.code}`
    );
  });

  it('builds the shortUrl with an explicitly provided port', async () => {
    const app = createApp({ port: 4310 });

    const response = await request(app)
      .post('/shorten')
      .send({ url: 'http://example.com/other' });

    expect(response.status).toBe(201);
    expect(response.body.shortUrl).toBe(
      `http://localhost:4310/${response.body.code}`
    );
  });

  it('creates distinct codes when the same URL is shortened twice', async () => {
    const app = createApp();

    const first = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/page' });
    const second = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/page' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.code).not.toBe(second.body.code);
  });

  it('retries code generation when a candidate collides with an existing code', async () => {
    const candidates = ['aaaaaa', 'aaaaaa', 'bbbbbb'];
    const app = createApp({
      codeGenerator: () => candidates.shift() ?? 'cccccc'
    });

    const first = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/one' });
    const second = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/two' });

    expect(first.status).toBe(201);
    expect(first.body.code).toBe('aaaaaa');
    expect(second.status).toBe(201);
    expect(second.body.code).toBe('bbbbbb');
    expect(second.body.shortUrl).toBe('http://localhost:3000/bbbbbb');
  });

  it('responds with 500 when a unique code cannot be generated', async () => {
    const app = createApp({ codeGenerator: () => 'aaaaaa' });

    const first = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/one' });
    const second = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/two' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(500);
    expect(typeof second.body.error).toBe('string');
    expect((second.body.error as string).length).toBeGreaterThan(0);
  });

  it('rejects a request without a body', async () => {
    const app = createApp();
    const response = await request(app).post('/shorten');
    expectBadRequest(response);
  });

  it('rejects an empty JSON body', async () => {
    const app = createApp();
    const response = await request(app).post('/shorten').send({});
    expectBadRequest(response);
  });

  it('rejects a JSON body without the url property', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/shorten')
      .send({ other: 'value' });
    expectBadRequest(response);
  });

  it('rejects a non-string url', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/shorten')
      .send({ url: 12345 });
    expectBadRequest(response);
  });

  it('rejects an empty url', async () => {
    const app = createApp();
    const response = await request(app).post('/shorten').send({ url: '' });
    expectBadRequest(response);
  });

  it('rejects an ftp URL', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/shorten')
      .send({ url: 'ftp://example.com/file' });
    expectBadRequest(response);
  });

  it('rejects a URL without an allowed prefix', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/shorten')
      .send({ url: 'example.com/page' });
    expectBadRequest(response);
  });

  it('rejects an uppercase scheme', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/shorten')
      .send({ url: 'HTTP://example.com' });
    expectBadRequest(response);
  });

  it('rejects a malformed URL', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/shorten')
      .send({ url: 'https://' });
    expectBadRequest(response);
  });

  it('rejects a malformed JSON body', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/shorten')
      .set('Content-Type', 'application/json')
      .send('{"url": "https://example.com');
    expectBadRequest(response);
  });
});

describe('GET /:code', () => {
  it('redirects to the original URL with 302', async () => {
    const app = createApp();
    const code = await createShortUrl(app, 'https://example.com/page');

    const response = await request(app).get(`/${code}`).redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://example.com/page');
  });

  it('responds 404 for an unknown code', async () => {
    const app = createApp();

    const response = await request(app).get('/zzzzzz').redirects(0);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Short URL not found');
  });
});

describe('GET /:code/stats', () => {
  it('returns hits 0 before any redirect', async () => {
    const app = createApp();
    const code = await createShortUrl(app, 'https://example.com/page');

    const response = await request(app).get(`/${code}/stats`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      code,
      url: 'https://example.com/page',
      hits: 0
    });
  });

  it('returns hits 1 after a single redirect', async () => {
    const app = createApp();
    const code = await createShortUrl(app, 'https://example.com/page');

    await request(app).get(`/${code}`).redirects(0);
    const response = await request(app).get(`/${code}/stats`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      code,
      url: 'https://example.com/page',
      hits: 1
    });
  });

  it('returns hits 2 after two redirects', async () => {
    const app = createApp();
    const code = await createShortUrl(app, 'https://example.com/page');

    await request(app).get(`/${code}`).redirects(0);
    await request(app).get(`/${code}`).redirects(0);
    const response = await request(app).get(`/${code}/stats`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      code,
      url: 'https://example.com/page',
      hits: 2
    });
  });

  it('does not change hits when stats are read repeatedly', async () => {
    const app = createApp();
    const code = await createShortUrl(app, 'https://example.com/page');

    await request(app).get(`/${code}`).redirects(0);
    const first = await request(app).get(`/${code}/stats`);
    const second = await request(app).get(`/${code}/stats`);
    const third = await request(app).get(`/${code}/stats`);

    expect(first.body.hits).toBe(1);
    expect(second.body.hits).toBe(1);
    expect(third.body.hits).toBe(1);
  });

  it('responds 404 for an unknown code', async () => {
    const app = createApp();

    const response = await request(app).get('/zzzzzz/stats');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Short URL not found');
  });

  it('is matched before the generic /:code route', async () => {
    const app = createApp();
    const code = await createShortUrl(app, 'https://example.com/page');

    const response = await request(app).get(`/${code}/stats`);

    // If /:code were matched first, this request would not answer with the
    // stats payload for the created code.
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      code,
      url: 'https://example.com/page',
      hits: 0
    });
  });
});