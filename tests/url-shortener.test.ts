import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { Express } from 'express';

describe('URL shortener API', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp({ port: 3000 });
  });

  it('creates a valid short URL', async () => {
    const response = await request(app).post('/shorten').send({ url: 'https://example.com/page' });
    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(`http://localhost:3000/${response.body.code}`);
  });

  it.each([undefined, '', 'ftp://example.com', 'not a url'])('rejects invalid URL %s', async (url) => {
    const response = await request(app).post('/shorten').send(url === undefined ? {} : { url });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it('redirects a created URL and counts successful redirects', async () => {
    const created = await request(app).post('/shorten').send({ url: 'https://example.com/original' });
    const code = created.body.code as string;
    const first = await request(app).get(`/${code}`);
    const second = await request(app).get(`/${code}`);
    expect(first.status).toBe(302);
    expect(first.headers.location).toBe('https://example.com/original');
    expect(second.status).toBe(302);
    const stats = await request(app).get(`/${code}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body).toEqual({ code, url: 'https://example.com/original', hits: 2 });
    const statsAgain = await request(app).get(`/${code}/stats`);
    expect(statsAgain.body.hits).toBe(2);
  });

  it('returns 404 for unknown redirect and stats codes', async () => {
    expect((await request(app).get('/missing')).status).toBe(404);
    expect((await request(app).get('/missing/stats')).status).toBe(404);
  });

  it('generates distinct codes for repeated submissions', async () => {
    const url = 'https://example.com/same';
    const first = await request(app).post('/shorten').send({ url });
    const second = await request(app).post('/shorten').send({ url });
    expect(first.body.code).not.toBe(second.body.code);
  });
});