import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";
import { UrlStore } from "../src/store/urlStore";

const CODE_PATTERN = /^[A-Za-z0-9]{6}$/;

describe("URL shortening API (HTTP integration)", () => {
  let store: UrlStore;
  let app: Express;

  beforeEach(() => {
    store = new UrlStore();
    app = createApp({ store, port: 3000 });
  });

  it("creates a short URL with a 6-char alphanumeric code and shortUrl", async () => {
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(CODE_PATTERN);
    expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
  });

  it("redirects an existing code with 302 and the exact original Location", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" });
    const code = created.body.code;

    const res = await request(app).get(`/${code}`).redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://example.com/page");
  });

  it("returns 404 for a missing code", async () => {
    const res = await request(app).get("/missing");
    expect(res.status).toBe(404);
  });

  it("returns 400 with error when url is missing", async () => {
    const res = await request(app).post("/shorten").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 with error when url is not a string", async () => {
    const res = await request(app).post("/shorten").send({ url: 123 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 with error when url has an unsupported protocol", async () => {
    const res = await request(app).post("/shorten").send({ url: "ftp://example.com" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns distinct, well-formed codes for repeated valid requests", async () => {
    const a = await request(app).post("/shorten").send({ url: "https://example.com/a" });
    const b = await request(app).post("/shorten").send({ url: "https://example.com/a" });

    expect(a.body.code).toMatch(CODE_PATTERN);
    expect(b.body.code).toMatch(CODE_PATTERN);
    expect(a.body.code).not.toBe(b.body.code);
  });

  it("counts hits on redirect and stats does not increment itself", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" });
    const code = created.body.code;

    const before = await request(app).get(`/${code}/stats`);
    expect(before.status).toBe(200);
    expect(before.body.hits).toBe(0);

    await request(app).get(`/${code}`).redirects(0);
    await request(app).get(`/${code}`).redirects(0);

    const after = await request(app).get(`/${code}/stats`);
    expect(after.status).toBe(200);
    expect(after.body.code).toBe(code);
    expect(after.body.url).toBe("https://example.com/page");
    expect(after.body.hits).toBe(2);
  });

  it("returns 404 for missing code stats", async () => {
    const res = await request(app).get("/missing/stats");
    expect(res.status).toBe(404);
  });

  it("respects an injected port in shortUrl", async () => {
    const portedApp = createApp({ store: new UrlStore(), port: 4310 });
    const res = await request(portedApp)
      .post("/shorten")
      .send({ url: "https://example.com/x" });

    expect(res.status).toBe(201);
    expect(res.body.shortUrl).toBe(`http://localhost:4310/${res.body.code}`);
  });

  it("responds 400 JSON for a malformed JSON body", async () => {
    const res = await request(app)
      .post("/shorten")
      .set("Content-Type", "application/json")
      .send("{ not valid json");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});