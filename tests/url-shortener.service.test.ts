import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUrlStore } from '../src/store/in-memory-url.store.js';
import { UrlShortenerService, RandomCodeGenerator } from '../src/services/url-shortener.service.js';
import type { CodeGenerator } from '../src/services/url-shortener.service.js';

describe('UrlShortenerService', () => {
  let store: InMemoryUrlStore;
  let service: UrlShortenerService;

  beforeEach(() => {
    store = new InMemoryUrlStore();
    service = new UrlShortenerService(store);
  });

  describe('validateUrl', () => {
    it('should return null for a valid http URL', () => {
      const result = service.validateUrl('http://example.com');
      expect(result).toBeNull();
    });

    it('should return null for a valid https URL', () => {
      const result = service.validateUrl('https://example.com/page?q=1');
      expect(result).toBeNull();
    });

    it('should return error for a missing url (undefined)', () => {
      const result = service.validateUrl(undefined);
      expect(result).toEqual({ error: 'Invalid URL' });
    });

    it('should return error for an empty string', () => {
      const result = service.validateUrl('');
      expect(result).toEqual({ error: 'Invalid URL' });
    });

    it('should return error for a non-string value', () => {
      const result = service.validateUrl(123);
      expect(result).toEqual({ error: 'Invalid URL' });
    });

    it('should return error for an invalid URL string', () => {
      const result = service.validateUrl('not-a-url');
      expect(result).toEqual({ error: 'Invalid URL' });
    });

    it('should return error for ftp protocol', () => {
      const result = service.validateUrl('ftp://files.example.com');
      expect(result).toEqual({ error: 'Invalid URL' });
    });

    it('should return error for javascript protocol', () => {
      const result = service.validateUrl('javascript:alert(1)');
      expect(result).toEqual({ error: 'Invalid URL' });
    });
  });

  describe('createShortUrl', () => {
    it('should generate a code of exactly 6 alphanumeric characters', () => {
      const result = service.createShortUrl('https://example.com', 'http://localhost:3000');
      expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(result.shortUrl).toBe(`http://localhost:3000/${result.code}`);
    });

    it('should use provided baseUrl in shortUrl', () => {
      const result = service.createShortUrl('https://example.com', 'http://localhost:4000');
      expect(result.shortUrl).toMatch(/^http:\/\/localhost:4000\//);
    });

    it('should generate unique codes for multiple creations', () => {
      const result1 = service.createShortUrl('https://example.com/1', 'http://localhost:3000');
      const result2 = service.createShortUrl('https://example.com/2', 'http://localhost:3000');
      expect(result1.code).not.toBe(result2.code);
    });

    it('should not deduplicate same URL', () => {
      const result1 = service.createShortUrl('https://example.com', 'http://localhost:3000');
      const result2 = service.createShortUrl('https://example.com', 'http://localhost:3000');
      expect(result1.code).not.toBe(result2.code);
    });
  });

  describe('getStats', () => {
    it('should return undefined for nonexistent code', () => {
      const stats = service.getStats('nonexist');
      expect(stats).toBeUndefined();
    });

    it('should return stats with hits initially 0', () => {
      const result = service.createShortUrl('https://example.com', 'http://localhost:3000');
      const stats = service.getStats(result.code);
      expect(stats).toBeDefined();
      expect(stats!.code).toBe(result.code);
      expect(stats!.url).toBe('https://example.com');
      expect(stats!.hits).toBe(0);
    });
  });

  describe('incrementHits', () => {
    it('should return undefined for nonexistent code', () => {
      const result = service.incrementHits('nonexist');
      expect(result).toBeUndefined();
    });

    it('should increment hits and return the updated record', () => {
      const created = service.createShortUrl('https://example.com', 'http://localhost:3000');
      const incremented = service.incrementHits(created.code);
      expect(incremented).toBeDefined();
      expect(incremented!.code).toBe(created.code);
      expect(incremented!.url).toBe('https://example.com');
      expect(incremented!.hits).toBe(1);
    });

    it('should increment hits cumulatively', () => {
      const created = service.createShortUrl('https://example.com', 'http://localhost:3000');
      service.incrementHits(created.code);
      service.incrementHits(created.code);
      service.incrementHits(created.code);
      const stats = service.getStats(created.code);
      expect(stats!.hits).toBe(3);
    });
  });

  describe('collision handling', () => {
    it('should retry on collision with a deterministic generator', () => {
      // Deterministic generator that returns fixed codes
      const codes = ['abc123', 'abc123', 'xyz789'];
      let callCount = 0;
      const fakeGenerator: CodeGenerator = {
        generate: () => {
          return codes[callCount++ % codes.length];
        },
      };

      const store2 = new InMemoryUrlStore();
      const service2 = new UrlShortenerService(store2, fakeGenerator);

      const result1 = service2.createShortUrl('https://example.com/1', 'http://localhost:3000');
      expect(result1.code).toBe('abc123');

      const result2 = service2.createShortUrl('https://example.com/2', 'http://localhost:3000');
      // Should have skipped the second 'abc123' (collision) and used 'xyz789'
      expect(result2.code).toBe('xyz789');
    });
  });
});