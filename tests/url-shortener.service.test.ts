import { describe, expect, it, vi } from 'vitest';
import { InMemoryUrlStore } from '../src/storage/in-memory-url.store';
import {
  InvalidBodyError,
  InvalidUrlError,
  NotFoundError,
  UrlShortenerService
} from '../src/services/url-shortener.service';
import { getPort } from '../src/config/env';

function buildService(): {
  store: InMemoryUrlStore;
  service: UrlShortenerService;
} {
  const store = new InMemoryUrlStore();
  const service = new UrlShortenerService(store, 'http://localhost:3000');
  return { store, service };
}

describe('UrlShortenerService', () => {
  it('creates a record with six alphanumeric characters and zero hits', () => {
    const { service, store } = buildService();
    const result = service.shorten({ url: 'https://example.com/page' });

    expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(result.shortUrl).toBe(`http://localhost:3000/${result.code}`);

    const record = store.findByCode(result.code);
    expect(record?.url).toBe('https://example.com/page');
    expect(record?.hits).toBe(0);
  });

  it('retries generation until it finds a free code (forced collision)', () => {
    const { service } = buildService();

    // Each generation consumes 6 Math.random calls. The first code and the
    // first attempt of the second generation collide; the second attempt of
    // the second generation differs, proving the retry loop.
    const sequence = [
      0, 0, 0, 0, 0, 0, // first code: "AAAAAA"
      0, 0, 0, 0, 0, 0, // collision: "AAAAAA" again
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5 // retry: "ffffff"
    ];
    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockImplementation(() => sequence.shift() ?? 0);

    try {
      const first = service.shorten({ url: 'https://example.com/a' });
      const second = service.shorten({ url: 'https://example.com/a' });

      expect(first.code).toBe('AAAAAA');
      expect(second.code).toBe('ffffff');
      expect(second.code).not.toBe(first.code);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('rejects bodies that are not JSON objects', () => {
    const { service } = buildService();

    for (const payload of [null, 'string', 42, []]) {
      expect(() => service.shorten(payload)).toThrow(InvalidBodyError);
    }
  });

  it('rejects missing, non-string, empty and non-http(s) urls', () => {
    const { service } = buildService();

    const invalidPayloads: unknown[] = [
      {},
      { url: 42 },
      { url: '' },
      { url: '   ' },
      { url: 'not a url' },
      { url: 'ftp://example.com/file' },
      { url: 'javascript:alert(1)' }
    ];

    for (const payload of invalidPayloads) {
      expect(() => service.shorten(payload)).toThrow(InvalidUrlError);
    }
  });

  it('increments hits only through redirect, never through stats', () => {
    const { service, store } = buildService();
    const { code } = service.shorten({ url: 'https://example.com/hits' });

    service.redirect(code);
    service.getStats(code);
    service.redirect(code);

    expect(store.findByCode(code)?.hits).toBe(2);
  });

  it('throws NotFoundError for unknown codes in redirect and stats', () => {
    const { service } = buildService();

    expect(() => service.redirect('zzzzzz')).toThrow(NotFoundError);
    expect(() => service.getStats('zzzzzz')).toThrow(NotFoundError);
  });
});

describe('getPort', () => {
  it('defaults to 3000 when PORT is missing or empty', () => {
    expect(getPort({})).toBe(3000);
    expect(getPort({ PORT: '' })).toBe(3000);
  });

  it('accepts valid integers from the provided environment', () => {
    expect(getPort({ PORT: '8080' })).toBe(8080);
    expect(getPort({ PORT: '1' })).toBe(1);
    expect(getPort({ PORT: '65535' })).toBe(65535);
  });

  it('throws for invalid values instead of falling back silently', () => {
    expect(() => getPort({ PORT: 'abc' })).toThrow();
    expect(() => getPort({ PORT: '0' })).toThrow();
    expect(() => getPort({ PORT: '70000' })).toThrow();
    expect(() => getPort({ PORT: '3.5' })).toThrow();
    expect(() => getPort({ PORT: '3000 ' })).toThrow();
  });
});