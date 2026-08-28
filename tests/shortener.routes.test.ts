import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { UrlShortenerService } from "../src/services/url-shortener.service.js";
import { InMemoryUrlStore } from "../src/stores/in-memory-url.store.js";

function createTestApp(baseUrl = "http://localhost:3000", generator?: () => string) {
  const store = new InMemoryUrlStore();
  const service = new UrlShortenerService(store, baseUrl, generator);
  return createApp({ service });
}

describe("URL shortener routes", () => {
  it("creates an HTTP short URL with a six-character alphanumeric code", async () => {
    const app = createTestApp();

    const response = await request(app).post("/shorten").send({ url: "http://example.com/page" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      code: expect.stringMatching(/^[A-Za-z0-9]{6}$/),
      shortUrl: expect.stringMatching(/^http:\/\/localhost:3000\/[A-Za-z0-9]{6}$/),
    });
  });

  it("accepts HTTPS URLs", async () => {
    const response = await request(createTestApp())
      .post("/shorten")
      .send({ url: "https://example.com/secure" });

    expect(response.status).toBe(201);
  });

  it.each([
    [{}, "A valid HTTP or HTTPS URL is required"],
    [{ url: "" }, "A valid HTTP or HTTPS URL is required"],
    [{ url: "not a URL" }, "A valid HTTP or HTTPS URL is required"],
    [{ url: "ftp://example.com/file" }, "A valid HTTP or HTTPS URL is required"],
    [{ url: 42 }, "A valid HTTP or HTTPS URL is required"],
  ])("rejects invalid URL input", async (body, message) => {
    const response = await request(createTestApp()).post("/shorten").send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: message });
  });

  it("creates independent records for repeated URLs", async () => {
    const app = createTestApp();
    const first = await request(app).post("/shorten").send({ url: "https://example.com/repeated" });
    const second = await request(app).post("/shorten").send({ url: "https://example.com/repeated" });

    expect(first.body.code).not.toBe(second.body.code);
    expect((await request(app).get(`/${first.body.code}/stats`)).body.url).toBe(
      "https://example.com/repeated",
    );
    expect((await request(app).get(`/${second.body.code}/stats`)).body.url).toBe(
      "https://example.com/repeated",
    );
  });

  it("retries a generated code when it collides", async () => {
    const generatedCodes = ["abc123", "abc123", "xyz789"];
    const generator = () => generatedCodes.shift() ?? "new456";
    const app = createTestApp("http://localhost:3000", generator);

    const first = await request(app).post("/shorten").send({ url: "https://example.com/one" });
    const second = await request(app).post("/shorten").send({ url: "https://example.com/two" });

    expect(first.body.code).toBe("abc123");
    expect(second.body.code).toBe("xyz789");
  });

  it("generates unique alphanumeric codes for many links", async () => {
    const app = createTestApp();
    const responses = await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        request(app).post("/shorten").send({ url: `https://example.com/page-${index}` }),
      ),
    );
    const codes = responses.map((response) => response.body.code);

    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[A-Za-z0-9]{6}$/.test(code))).toBe(true);
  });

  it("redirects with 302 and the original URL", async () => {
    const app = createTestApp();
    const created = await request(app).post("/shorten").send({ url: "https://example.com/redirect" });

    const response = await request(app).get(`/${created.body.code}`).redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://example.com/redirect");
  });

  it("returns 404 for an unknown redirect code", async () => {
    const response = await request(createTestApp()).get("/missing").redirects(0);

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual(expect.any(String));
  });

  it("counts redirects in stats without counting stats requests", async () => {
    const app = createTestApp();
    const created = await request(app).post("/shorten").send({ url: "https://example.com/counts" });
    const code = created.body.code;

    expect((await request(app).get(`/${code}/stats`)).body).toEqual({
      code,
      url: "https://example.com/counts",
      hits: 0,
    });

    await request(app).get(`/${code}`).redirects(0);
    await request(app).get(`/${code}`).redirects(0);
    const afterRedirects = await request(app).get(`/${code}/stats`);

    expect(afterRedirects.status).toBe(200);
    expect(afterRedirects.body).toEqual({
      code,
      url: "https://example.com/counts",
      hits: 2,
    });

    await request(app).get(`/${code}/stats`);
    expect((await request(app).get(`/${code}/stats`)).body.hits).toBe(2);
  });

  it("returns 404 for unknown stats", async () => {
    const response = await request(createTestApp()).get("/missing/stats");

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual(expect.any(String));
  });

  it("uses a configured base URL for short links", async () => {
    const response = await request(createTestApp("http://localhost:4310"))
      .post("/shorten")
      .send({ url: "https://example.com/configured" });

    expect(response.status).toBe(201);
    expect(response.body.shortUrl).toMatch(/^http:\/\/localhost:4310\/[A-Za-z0-9]{6}$/);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await request(createTestApp())
      .post("/shorten")
      .set("Content-Type", "application/json")
      .send('{"url":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid JSON payload" });
  });
});