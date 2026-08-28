import { describe, it, expect, beforeEach } from 'vitest';
import { UrlStore } from '../src/store/url.store';
import {
  UrlShortenerService,
  InvalidUrlError,
  NotFoundError,
} from '../src/services/url-shortener.service';

describe('UrlShortenerService (unit)', () => {
  let store: UrlStore;
  let service: UrlShortenerService;

  beforeEach(() => {
    store = new UrlStore();
    service = new UrlShortenerService(store);
  });

  describe('createShortUrl', () => {
    it('creates a record with a 6-char alphanumeric code, zero hits and the original url', () => {
      const record = service.createShortUrl('https://example.com/path');
      expect(record.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(record.url).toBe('https://example.com/path');
      expect(record.hits).toBe(0);
      expect(store.has(record.code)).toBe(true);
    });

    it('allows the same URL to be shortened multiple times into different codes', () => {
      const a = service.createShortUrl('https://example.com');
      const b = service.createShortUrl('https://example.com');
      expect(a.code).not.toBe(b.code);
      expect(store.has(a.code)).toBe(true);
      expect(store.has(b.code)).toBe(true);
    });

    it('rejects non-strings, empty/whitespace and non-http(s) URLs', () => {
      const bad = [
        undefined,
        null,
        42,
        {},
        '',
        '   ',
        'ftp://example.com',
        'javascript:alert(1)',
        'ws://example.com',
        'relative/path',
      ];
      for (const value of bad) {
        expect(() => service.createShortUrl(value), `value=${JSON.stringify(value)}`).toThrow(
          InvalidUrlError,
        );
      }
    });
  });

  describe('generateUniqueCode', () => {
    it('returns a code not present in the store', () => {
      for (let i = 0; i < 50; i += 1) {
        const code = service.generateUniqueCode();
        expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
        service.createShortUrl(`https://example.com/${i}`);
      }
    });
  });

  describe('redirect', () => {
    it('increments hits exactly once and returns the record', () => {
      const rec = service.createShortUrl('https://example.com');
      const r1 = service.redirect(rec.code);
      expect(r1.hits).toBe(1);
      expect(r1.url).toBe('https://example.com');
      const r2 = service.redirect(rec.code);
      expect(r2.hits).toBe(2);
    });

    it('throws NotFoundError for an unknown code and does not create a record', () => {
      expect(() => service.redirect('nope')).toThrow(NotFoundError);
      expect(store.has('nope')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('returns a DTO with code, url and accumulated hits', () => {
      const rec = service.createShortUrl('https://example.com');
      service.redirect(rec.code);
      service.redirect(rec.code);
      const stats = service.getStats(rec.code);
      expect(stats).toEqual({ code: rec.code, url: 'https://example.com', hits: 2 });
    });

    it('returns a copy and does not mutate the stored record', () => {
      const rec = service.createShortUrl('https://example.com');
      service.redirect(rec.code);
      const stats = service.getStats(rec.code);
      stats.hits = 999;
      expect(service.getStats(rec.code).hits).toBe(1);
    });

    it('throws NotFoundError for an unknown code', () => {
      expect(() => service.getStats('nope')).toThrow(NotFoundError);
    });
  });
});