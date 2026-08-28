import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { UrlStore } from '../src/store/url.store';
import { UrlShortenerService } from '../src/services/url-shortener.service';
import { getConfig, CODE_LENGTH } from '../src/config';

const CODE_REGEX = /^[A-Za-z0-9]{6}$/;

interface Harness {
  app: ReturnType<typeof createApp>;
  store: UrlStore;
  service: UrlShortenerService;
}

/** Build an isolated app per test to avoid state leaking between cases. */
function makeApp(port = 3000): Harness {
  const store = new UrlStore();
  const service = new UrlShortenerService(store);
  return { app: createApp({ port, store, service }), store, service };
}

const INVALID_BODIES = [
  undefined,
  {},
  { url: 123 },
  { url: '' },
  { url: '   ' },
  { url: 'ftp://example.com' },
  { url: 'javascript:alert(1)' },
  { url: 'not-a-url' },
  { url: 'relative/path' },
];

describe('POST /shorten', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeApp(3000);
  });

  it('returns 201 with a valid 6-char code and a shortUrl using the configured port', async () => {
    const res = await request(h.app)
      .post('/shorten')
      .send({ url: 'https://example.com/page?ref=home' });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(CODE_REGEX);
    expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
  });

  it('then redirects with 302 and Location equal to the original URL', async () => {
    const create = await request(h.app)
      .post('/shorten')
      .send({ url: 'https://example.com/page' });
    const code = create.body.code as string;

    const redirect = await request(h.app).get(`/${code}`).redirects(0);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe('https://example.com/page');
  });

  it('returns different, valid 6-char codes for two creations in the same run', async () => {
    const a = await request(h.app).post('/shorten').send({ url: 'https://a.example.com' });
    const b = await request(h.app).post('/shorten').send({ url: 'https://b.example.com' });

    expect(a.body.code).not.toBe(b.body.code);
    expect(a.body.code).toMatch(CODE_REGEX);
    expect(b.body.code).toMatch(CODE_REGEX);
    expect(a.body.code.length).toBe(CODE_LENGTH);
    expect(b.body.code.length).toBe(CODE_LENGTH);
  });

  it('returns 400 with an error string for missing or invalid url', async () => {
    for (const body of INVALID_BODIES) {
      const res = await request(h.app).post('/shorten').send(body as object);
      expect(res.status, `body=${JSON.stringify(body)}`).toBe(400);
      expect(typeof res.body.error).toBe('string');
    }
  });

  it('preserves the original URL string without normalization', async () => {
    const url = 'https://Example.COM/Path?Q=1';
    const res = await request(h.app).post('/shorten').send({ url });
    expect(res.status).toBe(201);
    const stats = await request(h.app).get(`/${res.body.code}/stats`);
    expect(stats.body.url).toBe(url);
  });
});

describe('GET /:code redirect', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeApp(3000);
  });

  it('returns 404 (and does not create a record) for a missing code', async () => {
    const res = await request(h.app).get('/missing').redirects(0);
    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe('string');
    expect(h.store.has('missing')).toBe(false);
  });
});

describe('GET /:code/stats', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeApp(3000);
  });

  async function shorten(url: string): Promise<string> {
    const res = await request(h.app).post('/shorten').send({ url });
    return res.body.code as string;
  }

  it('reflects 0, 1 and 2 redirects correctly', async () => {
    const code = await shorten('https://example.com');
    const stats0 = await request(h.app).get(`/${code}/stats`);
    expect(stats0.status).toBe(200);
    expect(stats0.body).toEqual({ code, url: 'https://example.com', hits: 0 });

    await request(h.app).get(`/${code}`).redirects(0);
    const stats1 = await request(h.app).get(`/${code}/stats`);
    expect(stats1.body.hits).toBe(1);

    await request(h.app).get(`/${code}`).redirects(0);
    const stats2 = await request(h.app).get(`/${code}/stats`);
    expect(stats2.body).toEqual({ code, url: 'https://example.com', hits: 2 });
  });

  it('never redirects and never changes hits when consulting stats', async () => {
    const code = await shorten('https://example.com');
    const before = await request(h.app).get(`/${code}/stats`).redirects(0);
    expect(before.status).toBe(200);
    const after = await request(h.app).get(`/${code}/stats`).redirects(0);
    expect(after.status).toBe(200);
    expect(after.body.hits).toBe(0);
  });

  it('returns 404 for a missing code stats', async () => {
    const res = await request(h.app).get('/missing/stats');
    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe('string');
  });

  it('treats /:code/stats as stats and not as a redirect to code "stats"', async () => {
    const res = await request(h.app).get('/stats/stats').redirects(0);
    expect(res.status).toBe(404);
  });
});

describe('configuration and shortUrl base', () => {
  it('getConfig resolves PORT=4567 to 4567 and absence to 3000', () => {
    expect(getConfig({ PORT: '4567' }).port).toBe(4567);
    expect(getConfig({}).port).toBe(3000);
  });

  it('getConfig rejects invalid PORT values (including 0)', () => {
    expect(() => getConfig({ PORT: '0' })).toThrow();
    expect(() => getConfig({ PORT: '70000' })).toThrow();
    expect(() => getConfig({ PORT: 'abc' })).toThrow();
  });

  it('shortUrl reflects the configured port without starting a listener', async () => {
    const a = makeApp(4567);
    const r1 = await request(a.app).post('/shorten').send({ url: 'https://example.com' });
    expect(r1.body.shortUrl).toBe(`http://localhost:4567/${r1.body.code}`);

    const b = makeApp(3000);
    const r2 = await request(b.app).post('/shorten').send({ url: 'https://example.com' });
    expect(r2.body.shortUrl).toBe(`http://localhost:3000/${r2.body.code}`);
  });
});

describe('collision handling (injected generator)', () => {
  it('generateUniqueCode retries when the first generated code collides', () => {
    const store = new UrlStore();
    store.save({ code: 'AAAAAA', url: 'https://x.example.com', hits: 0 });
    const sequence = ['AAAAAA', 'BBBBBB', 'CCCCCC'];
    let i = 0;
    const service = new UrlShortenerService(store, () => sequence[i++ % sequence.length]);
    expect(service.generateUniqueCode()).toBe('BBBBBB');
  });

  it('createShortUrl avoids collisions even when generation repeats an occupied code', async () => {
    const store = new UrlStore();
    const sequence = ['ZZZZZZ', 'ZZZZZZ', 'YYYYYY'];
    let i = 0;
    const service = new UrlShortenerService(store, () => sequence[i++ % sequence.length]);
    const r1 = service.createShortUrl('https://a.example.com');
    const r2 = service.createShortUrl('https://b.example.com');
    expect(r1.code).toBe('ZZZZZZ');
    expect(r2.code).toBe('YYYYYY');
    expect(store.has('ZZZZZZ')).toBe(true);
    expect(store.has('YYYYYY')).toBe(true);
  });
});