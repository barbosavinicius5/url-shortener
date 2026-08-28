import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, createApp } from '../src/app';

describe('POST /shorten', () => {
  it('creates a short URL with a 6-character alphanumeric code', async () => {
    const response = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/page' });

    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(
      `http://localhost:3000/${response.body.code}`
    );
  });

  it('uses the configured port in shortUrl when building the app', async () => {
    const customApp = createApp({ port: 4545 });
    const response = await request(customApp)
      .post('/shorten')
      .send({ url: 'https://example.com/custom-port' });

    expect(response.status).toBe(201);
    expect(response.body.shortUrl).toBe(
      `http://localhost:4545/${response.body.code}`
    );
  });

  it('creates two distinct records even for the same URL (no deduplication)', async () => {
    const responseOne = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/same' });
    const responseTwo = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/same' });

    expect(responseOne.status).toBe(201);
    expect(responseTwo.status).toBe(201);
    expect(responseOne.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(responseTwo.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
  });

  it('returns 400 when the url field is missing', async () => {
    const response = await request(app).post('/shorten').send({});

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe('string');
    expect(response.body.error.length).toBeGreaterThan(0);
  });

  it('returns 400 for a url not starting with http:// or https://', async () => {
    const response = await request(app)
      .post('/shorten')
      .send({ url: 'ftp://example.com/file' });

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe('string');
    expect(response.body.error.length).toBeGreaterThan(0);
  });

  it('returns 400 for a bare domain without a protocol', async () => {
    const response = await request(app)
      .post('/shorten')
      .send({ url: 'example.com' });

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe('string');
    expect(response.body.error.length).toBeGreaterThan(0);
  });
});

describe('GET /:code', () => {
  it('redirects 302 to the original URL', async () => {
    const originalUrl = 'https://example.com/redirect-target';
    const created = await request(app).post('/shorten').send({ url: originalUrl });

    const response = await request(app)
      .get(`/${created.body.code}`)
      .redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(originalUrl);
  });

  it('returns 404 for an unknown code', async () => {
    const response = await request(app).get('/missing').redirects(0);

    expect(response.status).toBe(404);
  });
});

describe('GET /:code/stats', () => {
  it('returns 200 with code, url and hits equal to 0 right after creation', async () => {
    const created = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/stats' });

    const response = await request(app).get(`/${created.body.code}/stats`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      code: created.body.code,
      url: 'https://example.com/stats',
      hits: 0
    });
  });

  it('counts one hit per successful redirect', async () => {
    const created = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/hits' });

    await request(app).get(`/${created.body.code}`).redirects(0);
    await request(app).get(`/${created.body.code}`).redirects(0);
    await request(app).get(`/${created.body.code}`).redirects(0);

    const response = await request(app).get(`/${created.body.code}/stats`);
    expect(response.body.hits).toBe(3);
  });

  it('does not increment hits when stats are queried', async () => {
    const created = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/no-count' });

    await request(app).get(`/${created.body.code}/stats`);
    await request(app).get(`/${created.body.code}/stats`);

    const response = await request(app).get(`/${created.body.code}/stats`);
    expect(response.body.hits).toBe(0);
  });

  it('returns 404 for an unknown code', async () => {
    const response = await request(app).get('/missing/stats');

    expect(response.status).toBe(404);
  });
});