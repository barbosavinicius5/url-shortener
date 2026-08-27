import { describe, it, expect, beforeEach } from 'vitest';
import { ShortenerService, validateCreateLink } from '../src/services/shortener-service';
import { LinkStore } from '../src/stores/link-store';

describe('ShortenerService', () => {
  let store: LinkStore;
  let service: ShortenerService;

  beforeEach(() => {
    store = new LinkStore();
    service = new ShortenerService(store, 3000);
  });

  describe('createLink', () => {
    it('generates a 6-character alphanumeric code', () => {
      const result = service.createLink('https://example.com');
      expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it('returns a short URL with the configured base', () => {
      const result = service.createLink('https://example.com');
      expect(result.shortUrl).toBe(`http://localhost:3000/${result.code}`);
    });

    it('stores the record in the store', () => {
      const result = service.createLink('https://example.com');
      const record = store.getByCode(result.code);
      expect(record).toBeDefined();
      expect(record!.originalUrl).toBe('https://example.com');
      expect(record!.hits).toBe(0);
    });

    it('generates unique codes for consecutive calls', () => {
      const r1 = service.createLink('https://example.com/1');
      const r2 = service.createLink('https://example.com/2');
      expect(r1.code).not.toBe(r2.code);
    });
  });

  describe('findAndIncrement', () => {
    it('returns undefined for missing code', () => {
      const result = service.findAndIncrement('nonexist');
      expect(result).toBeUndefined();
    });

    it('increments hits and returns updated record', () => {
      const created = service.createLink('https://example.com');
      const result = service.findAndIncrement(created.code);
      expect(result).toBeDefined();
      expect(result!.hits).toBe(1);
      expect(result!.originalUrl).toBe('https://example.com');
    });

    it('increments hits on each call', () => {
      const created = service.createLink('https://example.com');
      service.findAndIncrement(created.code);
      service.findAndIncrement(created.code);
      const result = service.findAndIncrement(created.code);
      expect(result!.hits).toBe(3);
    });
  });

  describe('getStats', () => {
    it('returns stats without incrementing hits', () => {
      const created = service.createLink('https://example.com');
      const stats = service.getStats(created.code);
      expect(stats).toBeDefined();
      expect(stats!.hits).toBe(0);
      expect(stats!.url).toBe('https://example.com');
    });

    it('returns updated hits after redirects', () => {
      const created = service.createLink('https://example.com');
      service.findAndIncrement(created.code);
      const stats = service.getStats(created.code);
      expect(stats!.hits).toBe(1);
    });

    it('returns undefined for missing code', () => {
      const stats = service.getStats('nonexist');
      expect(stats).toBeUndefined();
    });
  });

  describe('validateCreateLink', () => {
    it('rejects null body', () => {
      const result = validateCreateLink(null);
      expect(result.valid).toBe(false);
    });

    it('rejects undefined body', () => {
      const result = validateCreateLink(undefined);
      expect(result.valid).toBe(false);
    });

    it('rejects non-object body', () => {
      const result = validateCreateLink('string');
      expect(result.valid).toBe(false);
    });

    it('rejects missing url field', () => {
      const result = validateCreateLink({});
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.message).toContain('required');
    });

    it('rejects empty string url', () => {
      const result = validateCreateLink({ url: '' });
      expect(result.valid).toBe(false);
    });

    it('rejects url with spaces only', () => {
      const result = validateCreateLink({ url: '   ' });
      expect(result.valid).toBe(false);
    });

    it('rejects ftp scheme', () => {
      const result = validateCreateLink({ url: 'ftp://example.com' });
      expect(result.valid).toBe(false);
    });

    it('rejects relative path', () => {
      const result = validateCreateLink({ url: '/relative/path' });
      expect(result.valid).toBe(false);
    });

    it('rejects http without colon-slash', () => {
      const result = validateCreateLink({ url: 'http//example.com' });
      expect(result.valid).toBe(false);
    });

    it('accepts http:// URL', () => {
      const result = validateCreateLink({ url: 'http://example.com' });
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.url).toBe('http://example.com');
    });

    it('accepts https:// URL', () => {
      const result = validateCreateLink({ url: 'https://example.com/page?q=1' });
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.url).toBe('https://example.com/page?q=1');
    });
  });
});