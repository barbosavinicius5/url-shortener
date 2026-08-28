import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

import { createApp } from "../src/app";
import { getConfig } from "../src/config";
import { UrlShortenerService } from "../src/services/url-shortener.service";
import { InMemoryUrlStore } from "../src/store/in-memory-url-store";

const DEFAULT_CONFIG = { port: 3000 };

function buildApp(): Express {
  return createApp(new InMemoryUrlStore(), DEFAULT_CONFIG);
}

describe("url shortener HTTP API", () => {
  let app: Express;

  beforeEach(() => {
    app = buildApp();
  });

  describe("POST /shorten", () => {
    it("creates a short code for a valid https url", async () => {
      const response = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/some/long/path" })
        .expect(201);

      expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(response.body.shortUrl).toBe(`http://localhost:3000/${response.body.code}`);
      expect(response.body.hits).toBe(0);
    });

    it("creates a short code for a valid http url", async () => {
      const response = await request(app)
        .post("/shorten")
        .send({ url: "http://example.com" })
        .expect(201);

      expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it("responds 400 when url is missing", async () => {
      const response = await request(app).post("/shorten").send({}).expect(400);

      expect(typeof response.body.error).toBe("string");
      expect(response.body.error.length).toBeGreaterThan(0);
    });

    it("responds 400 when url is not a string", async () => {
      const response = await request(app)
        .post("/shorten")
        .send({ url: 12345 })
        .expect(400);

      expect(response.body.error).toBeTruthy();
    });

    it("responds 400 when url is an empty string", async () => {
      const response = await request(app).post("/shorten").send({ url: "" }).expect(400);

      expect(response.body.error).toBeTruthy();
    });

    it("responds 400 when url uses an unsupported protocol", async () => {
      const response = await request(app)
        .post("/shorten")
        .send({ url: "ftp://example.com/file" })
        .expect(400);

      expect(response.body.error).toBeTruthy();
    });

    it("responds 400 when the body is a JSON value that is not an object", async () => {
      const response = await request(app)
        .post("/shorten")
        .set("Content-Type", "application/json")
        .send('"just a string"')
        .expect(400);

      expect(response.body.error).toBeTruthy();
    });

    it("responds 400 for a malformed JSON body", async () => {
      const response = await request(app)
        .post("/shorten")
        .set("Content-Type", "application/json")
        .send("{ not valid json")
        .expect(400);

      expect(response.body.error).toBeTruthy();
    });

    it("creates distinct codes when the same url is shortened twice", async () => {
      const first = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/duplicated" })
        .expect(201);
      const second = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/duplicated" })
        .expect(201);

      expect(second.body.code).not.toBe(first.body.code);
    });
  });

  describe("GET /:code", () => {
    it("redirects to the original url with 302", async () => {
      const created = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/target" })
        .expect(201);

      const response = await request(app).get(`/${created.body.code}`).redirects(0).expect(302);

      expect(response.headers.location).toBe("https://example.com/target");
    });

    it("responds 404 for an unknown code without redirecting", async () => {
      const response = await request(app).get("/unknown").redirects(0).expect(404);

      expect(response.body.error).toBeTruthy();
      expect(response.headers.location).toBeUndefined();
    });

    it("increments hits by one per successful redirect", async () => {
      const created = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/hits" })
        .expect(201);
      const code = created.body.code as string;

      await request(app).get(`/${code}`).redirects(0).expect(302);
      await request(app).get(`/${code}`).redirects(0).expect(302);

      const stats = await request(app).get(`/${code}/stats`).expect(200);
      expect(stats.body.hits).toBe(2);
    });
  });

  describe("GET /:code/stats", () => {
    it("returns code, url and hits for an existing code", async () => {
      const created = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/stats" })
        .expect(201);
      const code = created.body.code as string;

      const stats = await request(app).get(`/${code}/stats`).expect(200);

      expect(stats.body).toEqual({
        code,
        url: "https://example.com/stats",
        hits: 0,
      });
    });

    it("does not increment hits when reading stats", async () => {
      const created = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/no-increment" })
        .expect(201);
      const code = created.body.code as string;

      const first = await request(app).get(`/${code}/stats`).expect(200);
      const second = await request(app).get(`/${code}/stats`).expect(200);

      expect(first.body.hits).toBe(0);
      expect(second.body.hits).toBe(0);
    });

    it("responds 404 for an unknown code", async () => {
      const response = await request(app).get("/unknown/stats").expect(404);

      expect(response.body.error).toBeTruthy();
    });
  });

  describe("unregistered routes", () => {
    it("responds 404 JSON for paths without a registered route", async () => {
      const response = await request(app).get("/some/nested/path").expect(404);

      expect(response.body.error).toBeTruthy();
    });
  });
});

describe("port configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses port 3000 when PORT is not set", async () => {
    vi.stubEnv("PORT", undefined);

    const app = createApp(new InMemoryUrlStore(), getConfig());
    const response = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/default-port" })
      .expect(201);

    expect(response.body.shortUrl).toBe(`http://localhost:3000/${response.body.code}`);
  });

  it("uses the PORT value from the environment", async () => {
    vi.stubEnv("PORT", "4000");

    const app = createApp(new InMemoryUrlStore(), getConfig());
    const response = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/custom-port" })
      .expect(201);

    expect(response.body.shortUrl).toBe(`http://localhost:4000/${response.body.code}`);
  });

  it("falls back to port 3000 when PORT is not a valid port number", async () => {
    vi.stubEnv("PORT", "not-a-number");

    const app = createApp(new InMemoryUrlStore(), getConfig());
    const response = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/invalid-port" })
      .expect(201);

    expect(response.body.shortUrl).toBe(`http://localhost:3000/${response.body.code}`);
  });
});

describe("UrlShortenerService code collisions", () => {
  it("discards a colliding code and preserves the existing record", () => {
    const generatedCodes = ["aaaaaa", "aaaaaa", "bbbbbb"];
    let nextCodeIndex = 0;
    const service = new UrlShortenerService(
      new InMemoryUrlStore(),
      { port: 3000 },
      () => generatedCodes[nextCodeIndex++],
    );

    const first = service.createShortUrl({ url: "https://example.com/first" });
    const second = service.createShortUrl({ url: "https://example.com/second" });

    expect(first.code).toBe("aaaaaa");
    expect(second.code).toBe("bbbbbb");
    expect(service.getStats("aaaaaa")).toEqual({
      code: "aaaaaa",
      url: "https://example.com/first",
      hits: 0,
    });
  });
});