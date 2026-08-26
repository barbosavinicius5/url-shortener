import request from 'supertest';
import { describe, expect, beforeEach, it } from 'vitest';
import express from 'express';
import { createApp } from '../src/app';

let app: express.Express;
beforeEach(() => { app = createApp(); });

describe('URL shortener HTTP API', () => {
  it('creates a short URL with the expected format', async () => {
    const response = await request(app).post('/shorten').send({ url: 'https://example.com/page' });
    expect(response.status).toBe(201);
    expect(response.type).toMatch(/json/);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(`http://localhost:3000/${response.body.code}`);
  });

  it.each(['http://example.com', 'https://example.com'])('accepts %s URLs', async (url) => {
    expect((await request(app).post('/shorten').send({ url })).status).toBe(201);
  });

  it.each([{}, { url: '' }, { url: 42 }, { url: 'ftp://example.com' }, { url: 'example.com' }, { url: 'httpsx://example.com' }])('rejects invalid payload %#', async (payload) => {
    const response = await request(app).post('/shorten').send(payload);
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
    expect(response.body.error.length).toBeGreaterThan(0);
  });

  it('generates distinct six-character codes', async () => {
    const first = await request(app).post('/shorten').send({ url: 'https://one.example' });
    const second = await request(app).post('/shorten').send({ url: 'https://two.example' });
    expect(first.body.code).not.toBe(second.body.code);
  });

  it('redirects and increments hits exactly once per request', async () => {
    const created = await request(app).post('/shorten').send({ url: 'https://example.com/destination' });
    const code = created.body.code as string;
    const redirect = await request(app).get(`/${code}`).redirects(0);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe('https://example.com/destination');
    await request(app).get(`/${code}`).redirects(0);
    const stats = await request(app).get(`/${code}/stats`);
    expect(stats.body).toEqual({ code, url: 'https://example.com/destination', hits: 2 });
  });

  it('does not increment hits when reading stats', async () => {
    const created = await request(app).post('/shorten').send({ url: 'http://example.com' });
    const code = created.body.code as string;
    expect((await request(app).get(`/${code}/stats`)).body.hits).toBe(0);
    expect((await request(app).get(`/${code}/stats`)).body.hits).toBe(0);
  });

  it('uses an injected port in short URLs', async () => {
    const customApp = createApp(4000);
    const response = await request(customApp).post('/shorten').send({ url: 'https://example.com' });
    expect(response.body.shortUrl).toBe(`http://localhost:4000/${response.body.code}`);
  });

  it('returns 404 for unknown codes', async () => {
    expect((await request(app).get('/missing')).status).toBe(404);
    expect((await request(app).get('/missing/stats')).status).toBe(404);
  });

  it('normalizes malformed JSON to a JSON 400 error', async () => {
    const response = await request(app).post('/shorten').set('Content-Type', 'application/json').send('{"url":');
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });
});