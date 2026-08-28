import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { UrlShortenerService } from "../src/services/urlShortenerService";
import { InMemoryUrlStore } from "../src/storage/inMemoryUrlStore";
import type { Express } from "express";

const ORIGINAL_PORT = process.env.PORT;

function createTestApp(port?: number): Express {
  const store = new InMemoryUrlStore();
  const service = new UrlShortenerService(store);
  return createApp(service, port);
}

describe("POST /shorten", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  it("should create a short URL with valid input", async () => {
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" })
      .expect(201);

    expect(res.body).toHaveProperty("code");
    expect(res.body).toHaveProperty("shortUrl");
    expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
  });

  it("should return 400 when url is missing", async () => {
    const res = await request(app)
      .post("/shorten")
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 when url is not a string", async () => {
    const res = await request(app)
      .post("/shorten")
      .send({ url: 12345 })
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 for invalid URL schemes", async () => {
    const res = await request(app)
      .post("/shorten")
      .send({ url: "ftp://example.com/file" })
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 for empty URL string", async () => {
    const res = await request(app)
      .post("/shorten")
      .send({ url: "" })
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("should create distinct codes for the same URL", async () => {
    const url = "https://example.com/duplicate";
    const res1 = await request(app)
      .post("/shorten")
      .send({ url })
      .expect(201);

    const res2 = await request(app)
      .post("/shorten")
      .send({ url })
      .expect(201);

    expect(res1.body.code).not.toBe(res2.body.code);
  });
});

describe("GET /:code", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  it("should redirect to the original URL", async () => {
    const url = "https://example.com/target";

    const createRes = await request(app)
      .post("/shorten")
      .send({ url })
      .expect(201);

    const code = createRes.body.code;

    const redirectRes = await request(app)
      .get(`/${code}`)
      .redirects(0)
      .expect(302);

    expect(redirectRes.headers["location"]).toBe(url);
  });

  it("should return 404 for non-existent code", async () => {
    const res = await request(app)
      .get("/nonexistent")
      .expect(404);

    expect(res.body).toHaveProperty("error");
    expect(res.headers["content-type"]).toMatch(/json/);
  });
});

describe("GET /:code/stats", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  it("should return stats with zero hits before any redirect", async () => {
    const url = "https://example.com/fresh";

    const createRes = await request(app)
      .post("/shorten")
      .send({ url })
      .expect(201);

    const code = createRes.body.code;

    const statsRes = await request(app)
      .get(`/${code}/stats`)
      .expect(200);

    expect(statsRes.body).toEqual({
      code,
      url,
      hits: 0,
    });
  });

  it("should track hits correctly after redirects", async () => {
    const url = "https://example.com/tracked";

    const createRes = await request(app)
      .post("/shorten")
      .send({ url })
      .expect(201);

    const code = createRes.body.code;

    // First redirect
    await request(app).get(`/${code}`).expect(302);

    // Second redirect
    await request(app).get(`/${code}`).expect(302);

    const statsRes = await request(app)
      .get(`/${code}/stats`)
      .expect(200);

    expect(statsRes.body).toEqual({
      code,
      url,
      hits: 2,
    });
  });

  it("should not increment hits on stats access", async () => {
    const url = "https://example.com/stats-stable";

    const createRes = await request(app)
      .post("/shorten")
      .send({ url })
      .expect(201);

    const code = createRes.body.code;

    // Check stats multiple times
    await request(app).get(`/${code}/stats`).expect(200);
    await request(app).get(`/${code}/stats`).expect(200);
    await request(app).get(`/${code}/stats`).expect(200);

    const statsRes = await request(app)
      .get(`/${code}/stats`)
      .expect(200);

    expect(statsRes.body.hits).toBe(0);
  });

  it("should return 404 for stats of non-existent code", async () => {
    const res = await request(app)
      .get("/nonexistent/stats")
      .expect(404);

    expect(res.body).toHaveProperty("error");
  });
});

describe("PORT configuration", () => {
  afterEach(() => {
    process.env.PORT = ORIGINAL_PORT;
  });

  it("should use PORT env variable in shortUrl", async () => {
    process.env.PORT = "8080";
    const app = createTestApp(8080);

    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/custom-port" })
      .expect(201);

    expect(res.body.shortUrl).toMatch(/^http:\/\/localhost:8080\/[A-Za-z0-9]{6}$/);
  });

  it("should default to port 3000 when PORT is not set", async () => {
    process.env.PORT = "";
    const app = createTestApp();

    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/default-port" })
      .expect(201);

    expect(res.body.shortUrl).toMatch(/^http:\/\/localhost:3000\/[A-Za-z0-9]{6}$/);
  });
});

describe("JSON parsing errors", () => {
  it("should return 400 for malformed JSON", async () => {
    const app = createTestApp();

    const res = await request(app)
      .post("/shorten")
      .set("Content-Type", "application/json")
      .send('{"url": "https://example.com" broken}')
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });
});