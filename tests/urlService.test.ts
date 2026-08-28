import { describe, expect, it } from 'vitest';
import { InMemoryUrlStore } from '../src/store/inMemoryUrlStore';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  generateCode
} from '../src/services/codeGenerator';
import { createUrlService } from '../src/services/urlService';
import type { UrlService } from '../src/services/urlService';
import { validateUrl } from '../src/services/urlValidator';

interface TestHarness {
  store: InMemoryUrlStore;
  service: UrlService;
}

function createHarness(candidates?: string[]): TestHarness {
  const store = new InMemoryUrlStore();
  // When the candidate queue is exhausted the generator repeats the last
  // candidate, so a single-entry queue behaves like an always-same generator.
  const fallback =
    candidates !== undefined && candidates.length > 0
      ? candidates[candidates.length - 1]
      : 'zzzzzz';
  const codeGenerator = candidates
    ? () => candidates.shift() ?? fallback
    : undefined;
  const service = createUrlService(store, {
    baseUrl: 'http://localhost:3000',
    ...(codeGenerator === undefined ? {} : { codeGenerator })
  });
  return { store, service };
}

describe('generateCode', () => {
  it('produces exactly six alphanumeric characters', () => {
    for (let index = 0; index < 50; index += 1) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
      for (const char of code) {
        expect(CODE_ALPHABET).toContain(char);
      }
    }
  });
});

describe('validateUrl', () => {
  it('accepts http and https URLs', () => {
    expect(validateUrl('http://example.com')).toEqual({
      valid: true,
      url: 'http://example.com'
    });
    expect(validateUrl('https://example.com/page?q=1')).toEqual({
      valid: true,
      url: 'https://example.com/page?q=1'
    });
  });

  it('rejects non-string values', () => {
    expect(validateUrl(undefined).valid).toBe(false);
    expect(validateUrl(null).valid).toBe(false);
    expect(validateUrl(42).valid).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(validateUrl('').valid).toBe(false);
  });

  it('rejects prefixes other than http:// and https://', () => {
    expect(validateUrl('ftp://example.com').valid).toBe(false);
    expect(validateUrl('example.com/page').valid).toBe(false);
    expect(validateUrl('HTTP://example.com').valid).toBe(false);
  });

  it('rejects syntactically invalid URLs', () => {
    expect(validateUrl('https://').valid).toBe(false);
    expect(validateUrl('http://exa mple.com').valid).toBe(false);
  });
});

describe('createShortUrl', () => {
  it('creates a record with hits 0 and builds the shortUrl from the baseUrl', () => {
    const { service, store } = createHarness();

    const result = service.createShortUrl('https://example.com/page');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected success');
    }
    expect(result.data.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(result.data.shortUrl).toBe(
      `http://localhost:3000/${result.data.code}`
    );
    expect(store.findByCode(result.data.code)).toEqual({
      code: result.data.code,
      url: 'https://example.com/page',
      hits: 0
    });
  });

  it('keeps the original URL exactly as provided', () => {
    const { service, store } = createHarness();
    const url = 'https://Example.com/Page?Query=1#fragment';

    const result = service.createShortUrl(url);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected success');
    }
    expect(store.findByCode(result.data.code)?.url).toBe(url);
  });

  it('returns an invalid-url error for rejected input', () => {
    const { service } = createHarness();

    const result = service.createShortUrl('ftp://example.com/file');

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected failure');
    }
    expect(result.kind).toBe('invalid-url');
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('retries generation when a candidate collides with a stored code', () => {
    const { service, store } = createHarness(['aaaaaa', 'aaaaaa', 'bbbbbb']);

    const first = service.createShortUrl('https://example.com/one');
    const second = service.createShortUrl('https://example.com/two');

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      throw new Error('expected success');
    }
    expect(first.data.code).toBe('aaaaaa');
    expect(second.data.code).toBe('bbbbbb');
    expect(store.findByCode('aaaaaa')?.url).toBe('https://example.com/one');
    expect(store.findByCode('bbbbbb')?.url).toBe('https://example.com/two');
  });

  it('gives up after too many collisions instead of looping forever', () => {
    const { service, store } = createHarness(['aaaaaa']);

    const first = service.createShortUrl('https://example.com/one');
    const second = service.createShortUrl('https://example.com/two');

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (second.ok) {
      throw new Error('expected failure');
    }
    expect(second.kind).toBe('code-generation-failed');
    // The existing record is untouched by the failed attempt.
    expect(store.findByCode('aaaaaa')?.url).toBe('https://example.com/one');
    expect(store.findByCode('aaaaaa')?.hits).toBe(0);
  });

  it('creates distinct codes for the same URL', () => {
    const { service } = createHarness();

    const first = service.createShortUrl('https://example.com/page');
    const second = service.createShortUrl('https://example.com/page');

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      throw new Error('expected success');
    }
    expect(first.data.code).not.toBe(second.data.code);
  });
});

describe('redirectToOriginalUrl', () => {
  it('increments hits exactly once per call', () => {
    const { service } = createHarness();
    const created = service.createShortUrl('https://example.com/page');
    if (!created.ok) {
      throw new Error('expected success');
    }
    const code = created.data.code;

    const first = service.redirectToOriginalUrl(code);
    const second = service.redirectToOriginalUrl(code);

    expect(first?.url).toBe('https://example.com/page');
    expect(first?.hits).toBe(1);
    expect(second?.hits).toBe(2);
  });

  it('returns undefined for unknown codes without creating records', () => {
    const { service, store } = createHarness();

    expect(service.redirectToOriginalUrl('zzzzzz')).toBeUndefined();
    expect(store.incrementHits('zzzzzz')).toBeUndefined();
    expect(store.findByCode('zzzzzz')).toBeUndefined();
  });
});

describe('getStats', () => {
  it('returns a DTO without mutating the store', () => {
    const { service } = createHarness();
    const created = service.createShortUrl('https://example.com/page');
    if (!created.ok) {
      throw new Error('expected success');
    }
    const code = created.data.code;

    expect(service.getStats(code)).toEqual({
      code,
      url: 'https://example.com/page',
      hits: 0
    });
    expect(service.getStats(code)).toEqual({
      code,
      url: 'https://example.com/page',
      hits: 0
    });
    expect(service.getStats('zzzzzz')).toBeUndefined();
  });

  it('reflects only the hits counted by redirects', () => {
    const { service } = createHarness();
    const created = service.createShortUrl('https://example.com/page');
    if (!created.ok) {
      throw new Error('expected success');
    }
    const code = created.data.code;

    service.redirectToOriginalUrl(code);
    service.getStats(code);
    service.getStats(code);
    service.redirectToOriginalUrl(code);

    expect(service.getStats(code)?.hits).toBe(2);
  });
});

describe('InMemoryUrlStore', () => {
  it('returns copies so callers cannot mutate stored records', () => {
    const store = new InMemoryUrlStore();
    store.save({ code: 'abc123', url: 'https://example.com', hits: 0 });

    const record = store.findByCode('abc123');
    if (record === undefined) {
      throw new Error('missing record');
    }
    record.hits = 99;

    expect(store.findByCode('abc123')?.hits).toBe(0);
  });

  it('increments only the requested record', () => {
    const store = new InMemoryUrlStore();
    store.save({ code: 'abc123', url: 'https://example.com', hits: 0 });
    store.save({ code: 'def456', url: 'https://example.org', hits: 0 });

    expect(store.incrementHits('abc123')?.hits).toBe(1);
    expect(store.findByCode('abc123')?.hits).toBe(1);
    expect(store.findByCode('def456')?.hits).toBe(0);
  });

  it('does not create records for unknown codes', () => {
    const store = new InMemoryUrlStore();

    expect(store.incrementHits('zzzzzz')).toBeUndefined();
    expect(store.findByCode('zzzzzz')).toBeUndefined();
  });
});