import { describe, it, expect, beforeEach } from "vitest";
import {
  UrlShortenerService,
  isValidUrl,
  defaultCodeGenerator,
} from "../src/services/urlShortenerService";
import { InMemoryUrlStore } from "../src/storage/inMemoryUrlStore";
import type { CodeGenerator } from "../src/types/url";

describe("UrlShortenerService", () => {
  describe("isValidUrl", () => {
    it("should accept https URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
    });

    it("should accept http URLs", () => {
      expect(isValidUrl("http://example.com")).toBe(true);
    });

    it("should reject ftp URLs", () => {
      expect(isValidUrl("ftp://example.com")).toBe(false);
    });

    it("should reject non-strings", () => {
      expect(isValidUrl(123)).toBe(false);
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(undefined)).toBe(false);
      expect(isValidUrl({})).toBe(false);
    });

    it("should reject empty strings", () => {
      expect(isValidUrl("")).toBe(false);
      expect(isValidUrl("   ")).toBe(false);
    });

    it("should reject javascript: URLs", () => {
      expect(isValidUrl("javascript:alert(1)")).toBe(false);
    });

    it("should trim whitespace and accept valid URL", () => {
      expect(isValidUrl("  https://example.com  ")).toBe(true);
    });
  });

  describe("createShortUrl", () => {
    it("should create a record with code and shortUrl", () => {
      const store = new InMemoryUrlStore();
      const service = new UrlShortenerService(store);

      const result = service.createShortUrl("https://example.com", "http://localhost:3000");

      expect(result).toHaveProperty("code");
      expect(result).toHaveProperty("shortUrl");
      expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(result.shortUrl).toBe(`http://localhost:3000/${result.code}`);
    });

    it("should store the record with hits: 0", () => {
      const store = new InMemoryUrlStore();
      const service = new UrlShortenerService(store);

      const result = service.createShortUrl("https://example.com", "http://localhost:3000");
      const record = store.find(result.code);

      expect(record).toBeDefined();
      expect(record!.url).toBe("https://example.com");
      expect(record!.hits).toBe(0);
    });

    it("should handle collision with injected generator", () => {
      const store = new InMemoryUrlStore();
      let callCount = 0;
      const collidingGenerator: CodeGenerator = () => {
        callCount++;
        if (callCount === 1) return "abc123";
        return "def456";
      };

      // Pre-populate the store with the colliding code
      store.save({ code: "abc123", url: "https://existing.com", hits: 0 });

      const service = new UrlShortenerService(store, collidingGenerator);
      const result = service.createShortUrl("https://new.com", "http://localhost:3000");

      expect(result.code).toBe("def456");
      expect(callCount).toBe(2);

      // Original record should still exist
      const existingRecord = store.find("abc123");
      expect(existingRecord).toBeDefined();
      expect(existingRecord!.url).toBe("https://existing.com");
    });

    it("should not deduplicate URLs", () => {
      const store = new InMemoryUrlStore();
      const service = new UrlShortenerService(store);

      const result1 = service.createShortUrl("https://example.com", "http://localhost:3000");
      const result2 = service.createShortUrl("https://example.com", "http://localhost:3000");

      expect(result1.code).not.toBe(result2.code);
      expect(store.find(result1.code)).toBeDefined();
      expect(store.find(result2.code)).toBeDefined();
    });

    it("should throw after maximum attempts", () => {
      const store = new InMemoryUrlStore();
      const stuckGenerator: CodeGenerator = () => "onlycode";
      store.save({ code: "onlycode", url: "https://blocked.com", hits: 0 });

      const service = new UrlShortenerService(store, stuckGenerator);

      expect(() => {
        service.createShortUrl("https://new.com", "http://localhost:3000");
      }).toThrow("Failed to generate a unique code after maximum attempts");
    });
  });

  describe("redirect", () => {
    it("should increment hits and return record", () => {
      const store = new InMemoryUrlStore();
      const service = new UrlShortenerService(store);

      const created = service.createShortUrl("https://example.com", "http://localhost:3000");

      const record = service.redirect(created.code);
      expect(record).not.toBeNull();
      expect(record!.hits).toBe(1);

      const afterSecond = service.redirect(created.code);
      expect(afterSecond!.hits).toBe(2);
    });

    it("should return null for non-existent code", () => {
      const store = new InMemoryUrlStore();
      const service = new UrlShortenerService(store);

      const result = service.redirect("noexist");
      expect(result).toBeNull();
    });
  });

  describe("getStats", () => {
    it("should return stats without incrementing hits", () => {
      const store = new InMemoryUrlStore();
      const service = new UrlShortenerService(store);

      const created = service.createShortUrl("https://example.com", "http://localhost:3000");

      const stats1 = service.getStats(created.code);
      expect(stats1!.hits).toBe(0);

      service.redirect(created.code);

      const stats2 = service.getStats(created.code);
      expect(stats2!.hits).toBe(1);

      // Verify accessing stats didn't change hits
      const stats3 = service.getStats(created.code);
      expect(stats3!.hits).toBe(1);
    });

    it("should return null for non-existent code", () => {
      const store = new InMemoryUrlStore();
      const service = new UrlShortenerService(store);

      const result = service.getStats("noexist");
      expect(result).toBeNull();
    });
  });

  describe("defaultCodeGenerator", () => {
    it("should produce 6-character alphanumeric strings", () => {
      for (let i = 0; i < 20; i++) {
        const code = defaultCodeGenerator();
        expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
      }
    });
  });
});