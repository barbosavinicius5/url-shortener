import { describe, it, expect } from "vitest";
import { UrlStore } from "../src/store/urlStore";
import {
  UrlShortenerService,
  InvalidUrlError,
  isValidHttpUrl,
  CODE_LENGTH,
} from "../src/services/urlShortenerService";

describe("isValidHttpUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isValidHttpUrl("http://example.com")).toBe(true);
    expect(isValidHttpUrl("https://example.com/path?q=1")).toBe(true);
  });

  it("rejects missing, empty, non-string and non-http(s) values", () => {
    expect(isValidHttpUrl(undefined)).toBe(false);
    expect(isValidHttpUrl("")).toBe(false);
    expect(isValidHttpUrl(42)).toBe(false);
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
    expect(isValidHttpUrl("not a url")).toBe(false);
  });
});

describe("UrlShortenerService", () => {
  const makeService = () => new UrlShortenerService(new UrlStore());

  it("creates a record with a six-character alphanumeric code and hits: 0", () => {
    const service = makeService();
    const result = service.createShortUrl({ url: "https://example.com/a" }, 3000);

    expect(result.code).toMatch(new RegExp(`^[A-Za-z0-9]{${CODE_LENGTH}}$`));
    expect(result.shortUrl).toBe(`http://localhost:3000/${result.code}`);

    const stats = service.getStats(result.code);
    expect(stats).toEqual({ code: result.code, url: "https://example.com/a", hits: 0 });
  });

  it("honors a custom port when building shortUrl", () => {
    const service = makeService();
    const result = service.createShortUrl({ url: "https://example.com/a" }, 4321);
    expect(result.shortUrl).toBe(`http://localhost:4321/${result.code}`);
  });

  it("throws InvalidUrlError for invalid input", () => {
    const service = makeService();
    expect(() => service.createShortUrl({}, 3000)).toThrow(InvalidUrlError);
    expect(() => service.createShortUrl({ url: "ftp://example.com" }, 3000)).toThrow(
      InvalidUrlError,
    );
  });

  it("increments hits exactly once per redirect and does not mutate on stats", () => {
    const service = makeService();
    const { code } = service.createShortUrl({ url: "https://example.com/hits" }, 3000);

    const redirected = service.redirect(code);
    expect(redirected?.hits).toBe(1);

    const afterStats = service.getStats(code);
    expect(afterStats?.hits).toBe(1);

    expect(service.redirect("missing")).toBeUndefined();
    expect(service.getStats("missing")).toBeUndefined();
  });
});