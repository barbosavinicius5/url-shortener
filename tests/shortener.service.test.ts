import { describe, expect, it } from 'vitest';
import { ShortenerService } from '../src/services/shortener.service';
import { UrlStore } from '../src/store/url.store';

describe('ShortenerService', () => {
  it('preserves the first record when a generated code collides', () => {
    const store = new UrlStore();
    const generated = ['aaaaaa', 'aaaaaa', 'bbbbbb'];
    const service = new ShortenerService(store, () => generated.shift()!);
    const first = service.createShortUrl('https://one.example');
    const second = service.createShortUrl('https://two.example');
    expect(first).toEqual({ code: 'aaaaaa', url: 'https://one.example', hits: 0 });
    expect(second.code).toBe('bbbbbb');
    expect(service.getStats('aaaaaa')).toEqual(first);
  });

  it('tracks only explicit resolutions and validates protocols', () => {
    const service = new ShortenerService(new UrlStore(), () => 'ABC123');
    expect(() => service.createShortUrl('ftp://example.com')).toThrow('Invalid URL');
    const record = service.createShortUrl('HTTPS://example.com/path');
    expect(service.getStats(record.code)?.hits).toBe(0);
    expect(service.resolveAndTrack(record.code)?.hits).toBe(1);
    expect(service.getStats(record.code)?.hits).toBe(1);
  });
});