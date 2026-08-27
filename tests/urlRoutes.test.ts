import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { Express } from "express";
import { createApp } from "../src/app";

describe("URL shortener HTTP contract", () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
  });

  describe("POST /shorten", () => {
    it("returns 201 with code and shortUrl for a valid HTTPS URL", async () => {
      const res = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/page" });

      expect(res.status).toBe(201);
      expect(Object.keys(res.body).sort()).toEqual(["code", "shortUrl"]);
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
    });

    it("generates different codes for the same URL on distinct requests", async () => {
      const first = await request(app).post("/shorten").send({ url: "https://example.com/same" });
      const second = await request(app).post("/shorten").send({ url: "https://example.com/same" });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.code).not.toBe(second.body.code);
    });

    it("returns 400 when body is missing", async () => {
      const res = await request(app).post("/shorten").send();
      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe("string");
      expect(res.body.error.length).toBeGreaterThan(0);
    });

    it("returns 400 when url is missing", async () => {
      const res = await request(app).post("/shorten").send({});
      expect(res.status).toBe(400);
      expect(res.body.error.length).toBeGreaterThan(0);
    });

    it("returns 400 when url is an empty string", async () => {
      const res = await request(app).post("/shorten").send({ url: "" });
      expect(res.status).toBe(400);
      expect(res.body.error.length).toBeGreaterThan(0);
    });

    it("returns 400 for a non-http(s) scheme such as ftp://", async () => {
      const res = await request(app).post("/shorten").send({ url: "ftp://example.com/file" });
      expect(res.status).toBe(400);
      expect(res.body.error.length).toBeGreaterThan(0);
    });

    it("returns 400 when url is not a string", async () => {
      const res = await request(app).post("/shorten").send({ url: 12345 });
      expect(res.status).toBe(400);
      expect(res.body.error.length).toBeGreaterThan(0);
    });
  });

  describe("GET /:code", () => {
    it("redirects 302 to the original URL for an existing code", async () => {
      const created = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/target" });

      const res = await request(app)
        .get(`/${created.body.code}`)
        .redirects(0)
        .set("Accept", "application/json");

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("https://example.com/target");
    });

    it("returns 404 for an unknown code", async () => {
      const res = await request(app).get("/zzzzzz");
      expect(res.status).toBe(404);
      expect(res.body.error.length).toBeGreaterThan(0);
    });
  });

  describe("GET /:code/stats", () => {
    it("returns 200 with code, url and hits: 0 right after creation", async () => {
      const created = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/stats" });

      const res = await request(app).get(`/${created.body.code}/stats`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code: created.body.code,
        url: "https://example.com/stats",
        hits: 0,
      });
    });

    it("counts two redirects as hits: 2 and does not increment on stats queries", async () => {
      const created = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/counter" });

      await request(app).get(`/${created.body.code}`).redirects(0);
      await request(app).get(`/${created.body.code}`).redirects(0);

      const first = await request(app).get(`/${created.body.code}/stats`);
      expect(first.status).toBe(200);
      expect(first.body.hits).toBe(2);

      const second = await request(app).get(`/${created.body.code}/stats`);
      expect(second.body.hits).toBe(2);
    });

    it("returns 404 for an unknown code", async () => {
      const res = await request(app).get("/abcdef/stats");
      expect(res.status).toBe(404);
      expect(res.body.error.length).toBeGreaterThan(0);
    });

    it("does not treat the stats suffix as a redirect code", async () => {
      const created = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/order" });

      const res = await request(app).get(`/${created.body.code}/stats`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(created.body.code);
    });
  });
});