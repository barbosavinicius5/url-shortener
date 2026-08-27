import { describe, expect, it } from 'vitest';
import { UrlShortenerService, ServiceValidationError } from '../src/services/url-shortener.service';
import { InMemoryUrlStore } from '../src/stores/url.store';

describe('UrlShortenerService', () => {
  it('retries a generated code collision', () => {
    const values = ['ABC123', 'ABC123', 'xyz789'];
    const service = new UrlShortenerService(new InMemoryUrlStore(), 3000, () => values.shift()!);
    const first = service.create({ url: 'https://one.test' });
    const second = service.create({ url: 'https://two.test' });
    expect(first.code).toBe('ABC123');
    expect(second.code).toBe('xyz789');
  });

  it('validates input without changing accepted URLs', () => {
    const service = new UrlShortenerService(new InMemoryUrlStore(), 3000);
    expect(() => service.create({ url: '  ' })).toThrow(ServiceValidationError);
    expect(service.create({ url: 'HTTP://Example.COM/a' }).shortUrl).toMatch(/localhost:3000\//);
  });
});