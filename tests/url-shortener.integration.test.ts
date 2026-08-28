import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../src/app";
import { InMemoryUrlStore } from "../src/store/in-memory-url.store";
import { UrlShortenerService } from "../src/services/url-shortener.service";

function makeApp(port = 3000) {
  return createApp({ port });
}

describe("POST /shorten", () => {
  let app: express.Express;

  beforeEach(() => {
    app = makeApp();
  });

  it("creates a short URL with valid HTTP URL", async () => {
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(res.body.shortUrl).toBe("http://localhost:3000/" + res.body.code);
  });

  it("uses configured port in shortUrl", async () => {
    const customApp = makeApp(4567);
    const res = await request(customApp)
      .post("/shorten")
      .send({ url: "https://example.com/page" });

    expect(res.status).toBe(201);
    expect(res.body.shortUrl).toBe("http://localhost:4567/" + res.body.code);
  });

  it("returns 400 when url is missing", async () => {
    const res = await request(app).post("/shorten").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf("string");
  });

  it("returns 400 when url is not a string", async () => {
    const res = await request(app).post("/shorten").send({ url: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf("string");
  });

  it("returns 400 when url has invalid protocol", async () => {
    const res = await request(app)
      .post("/shorten")
      .send({ url: "ftp://example.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf("string");
  });

  it("returns 400 when url has no protocol", async () => {
    const res = await request(app)
      .post("/shorten")
      .send({ url: "example.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf("string");
  });

  it("generates different codes for the same URL", async () => {
    const res1 = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/same" });
    const res2 = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/same" });

    expect(res1.body.code).not.toBe(res2.body.code);
    expect(res1.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(res2.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
  });
});

describe("GET /:code", () => {
  let app: express.Express;

  beforeEach(() => {
    app = makeApp();
  });

  it("redirects to the original URL with 302", async () => {
    const createRes = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/target" });

    const code = createRes.body.code;
    const res = await request(app).get(`/${code}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://example.com/target");
  });

  it("returns 404 for nonexistent code", async () => {
    const res = await request(app).get("/missing");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTypeOf("string");
  });
});

describe("GET /:code/stats", () => {
  let app: express.Express;

  beforeEach(() => {
    app = makeApp();
  });

  it("returns stats with hits after redirects", async () => {
    const createRes = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/stats" });
    const code = createRes.body.code;

    // Access the redirect twice
    await request(app).get(`/${code}`);
    await request(app).get(`/${code}`);

    const statsRes = await request(app).get(`/${code}/stats`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.code).toBe(code);
    expect(statsRes.body.url).toBe("https://example.com/stats");
    expect(statsRes.body.hits).toBe(2);
  });

  it("does not increment hits when querying stats", async () => {
    const createRes = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/noincrement" });
    const code = createRes.body.code;

    // Query stats multiple times without redirect
    await request(app).get(`/${code}/stats`);
    await request(app).get(`/${code}/stats`);

    const statsRes = await request(app).get(`/${code}/stats`);
    expect(statsRes.body.hits).toBe(0);
  });

  it("returns 404 for nonexistent code", async () => {
    const res = await request(app).get("/missing/stats");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTypeOf("string");
  });
});