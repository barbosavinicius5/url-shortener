import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";
import { InMemoryShortUrlStore } from "../src/stores/in-memory-short-url.store";
import { parsePort } from "../src/config/port";
import { generateCode, isValidHttpUrl } from "../src/validation/url-validation";

let store: InMemoryShortUrlStore;
let app: Express;

beforeEach(() => {
  store = new InMemoryShortUrlStore();
  app = createApp({ store });
});

describe("POST /shorten", () => {
  it("creates a short URL with 201 and a 6-character alphanumeric code", async () => {
    const response = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" });

    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(`http://localhost:3000/${response.body.code}`);
  });

  it("uses the configured port in shortUrl", async () => {
    const customApp = createApp({ store, port: 4000 });
    const response = await request(customApp)
      .post("/shorten")
      .send({ url: "https://example.com/page" });

    expect(response.status).toBe(201);
    expect(response.body.shortUrl).toBe(`http://localhost:4000/${response.body.code}`);
  });

  it("rejects a missing url with 400 and an error message", async () => {
    const response = await request(app).post("/shorten").send({});

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe("string");
  });

  it("rejects a non-HTTP(S) url with 400 and an error message", async () => {
    for (const url of ["ftp://example.com/file", "www.example.com", "example.com", ""]) {
      const response = await request(app).post("/shorten").send({ url });
      expect(response.status).toBe(400);
      expect(typeof response.body.error).toBe("string");
    }
  });

  it("rejects a malformed JSON body with 400", async () => {
    const response = await request(app)
      .post("/shorten")
      .set("Content-Type", "application/json")
      .send("{not-json");

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe("string");
  });

  it("generates distinct codes for repeated and different URLs", async () => {
    const codes: string[] = [];
    for (const url of [
      "https://example.com/same",
      "https://example.com/same",
      "http://other.org/path",
    ]) {
      const response = await request(app).post("/shorten").send({ url });
      expect(response.status).toBe(201);
      codes.push(response.body.code);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("GET /:code (redirect)", () => {
  it("redirects 302 to the exact original URL and counts the hit", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page?a=1&b=2" });
    const code = created.body.code as string;

    const redirect = await request(app).get(`/${code}`).redirects(0);

    expect(redirect.status).toBe(302);
    expect(redirect.headers["location"]).toBe("https://example.com/page?a=1&b=2");

    const stats = await request(app).get(`/${code}/stats`);
    expect(stats.body.hits).toBe(1);
  });

  it("counts two redirects as hits = 2", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/two" });
    const code = created.body.code as string;

    await request(app).get(`/${code}`).redirects(0);
    await request(app).get(`/${code}`).redirects(0);

    const stats = await request(app).get(`/${code}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body.hits).toBe(2);
  });

  it("returns 404 for an unknown code", async () => {
    const response = await request(app).get("/zzzzzz").redirects(0);
    expect(response.status).toBe(404);
    expect(typeof response.body.error).toBe("string");
  });

  it("does not create records when redirecting", async () => {
    await request(app).get("/zzzzzz").redirects(0);
    expect(store.has("zzzzzz")).toBe(false);
  });
});

describe("GET /:code/stats", () => {
  it("returns 200 with exactly code, url and hits without incrementing", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/stats-page" });
    const code = created.body.code as string;

    const stats = await request(app).get(`/${code}/stats`);

    expect(stats.status).toBe(200);
    expect(Object.keys(stats.body).sort()).toEqual(["code", "hits", "url"]);
    expect(stats.body).toEqual({ code, url: "https://example.com/stats-page", hits: 0 });

    const statsAgain = await request(app).get(`/${code}/stats`);
    expect(statsAgain.body.hits).toBe(0);
  });

  it("returns 404 for an unknown code", async () => {
    const response = await request(app).get("/zzzzzz/stats");
    expect(response.status).toBe(404);
    expect(typeof response.body.error).toBe("string");
  });
});

describe("state isolation between tests", () => {
  it("does not observe records created in other tests", async () => {
    const response = await request(app).get("/zzzzzz/stats");
    expect(response.status).toBe(404);
    expect(store.has("zzzzzz")).toBe(false);
  });
});

describe("port resolution", () => {
  it("defaults to 3000 when PORT is absent", () => {
    expect(parsePort(undefined)).toBe(3000);
  });

  it("uses the configured port when valid", () => {
    expect(parsePort("4000")).toBe(4000);
  });

  it("falls back to 3000 for an invalid PORT (never NaN)", () => {
    expect(parsePort("not-a-port")).toBe(3000);
    expect(parsePort("")).toBe(3000);
  });
});

describe("unit helpers", () => {
  it("validates HTTP(S) urls strictly, case-sensitive", () => {
    expect(isValidHttpUrl("http://example.com")).toBe(true);
    expect(isValidHttpUrl("https://example.com/path")).toBe(true);
    expect(isValidHttpUrl("HTTPS://example.com")).toBe(false);
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
    expect(isValidHttpUrl("example.com")).toBe(false);
    expect(isValidHttpUrl("")).toBe(false);
    expect(isValidHttpUrl(42)).toBe(false);
    expect(isValidHttpUrl(undefined)).toBe(false);
  });

  it("generates codes within the alphanumeric alphabet", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode(6)).toMatch(/^[A-Za-z0-9]{6}$/);
    }
  });
});