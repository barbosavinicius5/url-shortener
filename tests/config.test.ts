import { describe, it, expect, vi, afterEach } from "vitest";
import {
  resolvePort,
  getPort,
  DEFAULT_PORT,
  buildBaseUrl,
  buildShortUrl,
} from "../src/config";

describe("config", () => {
  describe("resolvePort", () => {
    it("returns default port when undefined", () => {
      expect(resolvePort(undefined)).toBe(DEFAULT_PORT);
    });

    it("returns default port when empty string", () => {
      expect(resolvePort("")).toBe(DEFAULT_PORT);
    });

    it("returns numeric port from string", () => {
      expect(resolvePort("8080")).toBe(8080);
    });

    it("returns numeric port from string with leading/trailing spaces", () => {
      expect(resolvePort(" 4000 ")).toBe(4000);
    });

    it("throws on non-numeric string", () => {
      expect(() => resolvePort("abc")).toThrow(/Invalid PORT/);
    });

    it("throws on port out of range (negative)", () => {
      expect(() => resolvePort("-1")).toThrow(/Invalid PORT/);
    });

    it("throws on port out of range (too large)", () => {
      expect(() => resolvePort("99999")).toThrow(/Invalid PORT/);
    });
  });

  describe("getPort", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns default when PORT env is empty", () => {
      vi.stubEnv("PORT", "");
      expect(getPort()).toBe(DEFAULT_PORT);
    });

    it("returns configured port from env", () => {
      vi.stubEnv("PORT", "4000");
      expect(getPort()).toBe(4000);
    });
  });

  describe("buildBaseUrl", () => {
    it("builds base URL from port number", () => {
      expect(buildBaseUrl(3000)).toBe("http://localhost:3000");
      expect(buildBaseUrl(8080)).toBe("http://localhost:8080");
    });
  });

  describe("buildShortUrl", () => {
    it("builds short URL from base URL and code", () => {
      expect(buildShortUrl("http://localhost:3000", "abc123")).toBe(
        "http://localhost:3000/abc123",
      );
    });
  });
});