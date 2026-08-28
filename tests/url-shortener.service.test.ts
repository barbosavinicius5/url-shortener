import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryUrlStore } from '../src/stores/in-memory-url.store';
import { UrlShortenerService } from '../src/services/url-shortener.service';

describe('UrlShortenerService', () => {
  let store: InMemoryUrlStore;
  let service: UrlShortenerService;

  beforeEach(() => {
    store = new InMemoryUrlStore();
    service = new UrlShortenerService(store);
  });

  describe('isValidUrl', () => {
    it('returns true for http:// URLs', () => {
      expect(service.isValidUrl('http://example.com')).toBe(true);
    });

    it('returns true for https:// URLs', () => {
      expect(service.isValidUrl('https://example.com/path')).toBe(true);
    });

    it('returns false for ftp:// URLs', () => {
      expect(service.isValidUrl('ftp://example.com')).toBe(false);
    });

    it('returns false for javascript: URLs', () => {
      expect(service.isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('returns false for URLs without protocol', () => {
      expect(service.isValidUrl('example.com')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(service.isValidUrl('')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(service.isValidUrl(null)).toBe(false);
      expect(service.isValidUrl(undefined)).toBe(false);
      expect(service.isValidUrl(123)).toBe(false);
      expect(service.isValidUrl({})).toBe(false);
    });
  });

  describe('createShortUrl', () => {
    it('creates a short URL with 6-character alphanumeric code', () => {
      const result = service.createShortUrl('https://example.com', 'http://localhost:3000');
      expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(result.shortUrl).toBe(`http://localhost:3000/${result.code}`);
    });

    it('initializes hits to 0', () => {
      const result = service.createShortUrl('https://example.com', 'http://localhost:3000');
      const stats = service.getStats(result.code);
      expect(stats?.hits).toBe(0);
    });

    it('generates unique codes for repeated calls', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const result = service.createShortUrl('https://example.com', 'http://localhost:3000');
        expect(codes.has(result.code)).toBe(false);
        codes.add(result.code);
      }
    });

    it('normalizes baseUrl to avoid double slash', () => {
      const result = service.createShortUrl('https://example.com', 'http://localhost:3000/');
      expect(result.shortUrl).toBe(`http://localhost:3000/${result.code}`);
    });

    it('stores the original URL', () => {
      const result = service.createShortUrl('https://example.com/path?query=1', 'http://localhost:3000');
      const stats = service.getStats(result.code);
      expect(stats?.url).toBe('https://example.com/path?query=1');
    });
  });

  describe('redirect', () => {
    it('returns the original URL and increments hits', () => {
      const result = service.createShortUrl('https://example.com', 'http://localhost:3000');
      const url = service.redirect(result.code);
      expect(url).toBe('https://example.com');
      const stats = service.getStats(result.code);
      expect(stats?.hits).toBe(1);
    });

    it('increments hits on each redirect', () => {
      const result = service.createShortUrl('https://example.com', 'http://localhost:3000');
      service.redirect(result.code);
      service.redirect(result.code);
      service.redirect(result.code);
      const stats = service.getStats(result.code);
      expect(stats?.hits).toBe(3);
    });

    it('returns undefined for non-existent code', () => {
      const url = service.redirect('nonexistent');
      expect(url).toBeUndefined();
    });

    it('does not increment hits for non-existent code', () => {
      service.redirect('nonexistent');
      expect(store.has('nonexistent')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('returns stats without incrementing hits', () => {
      const result = service.createShortUrl('https://example.com', 'http://localhost:3000');
      service.redirect(result.code);
      service.redirect(result.code);
      const stats1 = service.getStats(result.code);
      const stats2 = service.getStats(result.code);
      const stats3 = service.getStats(result.code);
      expect(stats1?.hits).toBe(2);
      expect(stats2?.hits).toBe(2);
      expect(stats3?.hits).toBe(2);
    });

    it('returns undefined for non-existent code', () => {
      const stats = service.getStats('nonexistent');
      expect(stats).toBeUndefined();
    });

    it('returns a projection that does not allow mutation of internal state', () => {
      const result = service.createShortUrl('https://example.com', 'http://localhost:3000');
      const stats = service.getStats(result.code);
      if (stats) {
        stats.hits = 999;
      }
      const statsAgain = service.getStats(result.code);
      expect(statsAgain?.hits).toBe(0);
    });
  });

  describe('code collision handling', () => {
    it('retries generation when code collides', () => {
      const originalGenerateCode = service['generateCode'];
      let callCount = 0;
      const mockGenerateCode = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return 'abc123';
        }
        return 'def456';
      });
      service['generateCode'] = mockGenerateCode;

      service.createShortUrl('https://example.com', 'http://localhost:3000');
      service.createShortUrl('https://example.com', 'http://localhost:3000');

      expect(mockGenerateCode).toHaveBeenCalledTimes(2);
      expect(store.has('abc123')).toBe(true);
      expect(store.has('def456')).toBe(true);
    });
  });
});