import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createUrlStore, type UrlStore } from '../src/store/url.store.js';
import {
  UrlShortenerService,
  type CodeGenerator,
} from '../src/services/url-shortener.service.js';

const SHORT_CODE_PATTERN = /^[A-Za-z0-9]{6}$/;

describe('shortener HTTP contract', () => {
  let store: UrlStore;
  let app: Express;

  const buildService = (generateCode?: CodeGenerator): UrlShortenerService =>
    new UrlShortenerService(store, loadConfig({ PORT: '' }), generateCode);

  beforeEach(() => {
    store = createUrlStore();
    app = createApp(buildService());
  });

  describe('POST /shorten', () => {
    it('creates a short URL for a valid https URL', async () => {
      const response = await request(app)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/pagina' });

      expect(response.status).toBe(201);
      expect(response.body.code).toMatch(SHORT_CODE_PATTERN);
      expect(response.body.shortUrl).toBe(
        `http://localhost:3000/${response.body.code}`,
      );
    });

    it('creates a short URL for a valid http URL with query and fragment', async () => {
      const response = await request(app)
        .post('/shorten')
        .send({ url: 'http://exemplo.com/pagina?query=1#frag' });

      expect(response.status).toBe(201);
      expect(response.body.code).toMatch(SHORT_CODE_PATTERN);
    });

    it('trims surrounding whitespace before storing', async () => {
      const response = await request(app)
        .post('/shorten')
        .send({ url: '  https://exemplo.com/pagina  ' });

      expect(response.status).toBe(201);

      const redirect = await request(app)
        .get(`/${response.body.code}`)
        .redirects(0);

      expect(redirect.status).toBe(302);
      expect(redirect.headers.location).toBe('https://exemplo.com/pagina');
    });

    it('generates distinct codes for two creations of the same URL', async () => {
      const first = await request(app)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/pagina' });
      const second = await request(app)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/pagina' });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.code).toMatch(SHORT_CODE_PATTERN);
      expect(second.body.code).toMatch(SHORT_CODE_PATTERN);
      expect(first.body.code).not.toBe(second.body.code);
    });

    it('retries generation until it finds a free code on collision', async () => {
      let call = 0;
      const collidingGenerator: CodeGenerator = () =>
        call++ === 0 ? 'AAAAAA' : 'BBBBBB';
      app = createApp(buildService(collidingGenerator));

      const first = await request(app)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/a' });
      const second = await request(app)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/b' });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.code).toBe('AAAAAA');
      expect(second.body.code).toBe('BBBBBB');
    });

    it.each([
      { description: 'missing url', body: {} },
      { description: 'empty url', body: { url: '' } },
      { description: 'whitespace-only url', body: { url: '   ' } },
      { description: 'non-string url', body: { url: 42 } },
      { description: 'null url', body: { url: null } },
      { description: 'relative url', body: { url: '/pagina' } },
      { description: 'string without scheme', body: { url: 'exemplo.com/pagina' } },
      { description: 'ftp scheme', body: { url: 'ftp://exemplo.com/arquivo' } },
    ])(
      'rejects $description with 400 and a JSON error',
      async ({ body }) => {
        const response = await request(app).post('/shorten').send(body);

        expect(response.status).toBe(400);
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(typeof response.body.error).toBe('string');
        expect(response.body.error.length).toBeGreaterThan(0);
      },
    );

    it('responds with a JSON error for a malformed JSON body', async () => {
      const response = await request(app)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send('{"url": "https://exemplo.com"');

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('GET /:code', () => {
    it('redirects to the original URL without following the redirect', async () => {
      const created = await request(app)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/pagina' });

      const response = await request(app)
        .get(`/${created.body.code}`)
        .redirects(0);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('https://exemplo.com/pagina');
    });

    it('returns 404 with a JSON error for an unknown code', async () => {
      const response = await request(app).get('/missing');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('GET /:code/stats', () => {
    it('returns zero hits right after creation', async () => {
      const created = await request(app)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/pagina' });

      const response = await request(app).get(`/${created.body.code}/stats`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        code: created.body.code,
        url: 'https://exemplo.com/pagina',
        hits: 0,
      });
    });

    it('counts exactly one hit per redirect', async () => {
      const created = await request(app)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/pagina' });
      const code = created.body.code;

      await request(app).get(`/${code}`).redirects(0);
      await request(app).get(`/${code}`).redirects(0);

      const response = await request(app).get(`/${code}/stats`);
      expect(response.body.hits).toBe(2);
    });

    it('does not count hits when stats is queried', async () => {
      const created = await request(app)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/pagina' });
      const code = created.body.code;

      await request(app).get(`/${code}`).redirects(0);

      const firstStats = await request(app).get(`/${code}/stats`);
      const secondStats = await request(app).get(`/${code}/stats`);

      expect(firstStats.status).toBe(200);
      expect(firstStats.body.hits).toBe(1);
      expect(secondStats.body.hits).toBe(1);
    });

    it('answers with JSON stats instead of redirecting for /stats', async () => {
      const created = await request(app)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/pagina' });

      const response = await request(app)
        .get(`/${created.body.code}/stats`)
        .redirects(0);

      expect(response.status).toBe(200);
      expect(response.headers.location).toBeUndefined();
      expect(response.body.code).toBe(created.body.code);
      expect(response.body.url).toBe('https://exemplo.com/pagina');
    });

    it('returns 404 with a JSON error for an unknown code', async () => {
      const response = await request(app).get('/missing/stats');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('shortUrl base address', () => {
    it('reflects a configured port in shortUrl', async () => {
      const configuredStore = createUrlStore();
      const configuredService = new UrlShortenerService(
        configuredStore,
        loadConfig({ PORT: '4100' }),
      );
      const configuredApp = createApp(configuredService);

      const response = await request(configuredApp)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/pagina' });

      expect(response.status).toBe(201);
      expect(response.body.shortUrl).toMatch(
        /^http:\/\/localhost:4100\/[A-Za-z0-9]{6}$/,
      );
    });

    it('uses port 3000 by default', async () => {
      const response = await request(app)
        .post('/shorten')
        .send({ url: 'https://exemplo.com/pagina' });

      expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:3000\//);
    });
  });
});