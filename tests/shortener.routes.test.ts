import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { InMemoryShorteningStore } from "../src/stores/shortening.store.js";

describe("Shortener API routes", () => {
  describe("POST /shorten", () => {
    it("returns 201 with code (6 alphanumeric chars) and shortUrl on valid HTTPS URL", async () => {
      const app = createApp();
      const res = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/page" });

      expect(res.status).toBe(201);
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(
        `http://localhost:3000/${res.body.code}`,
      );
    });

    it("returns 201 with shortUrl using injected port (8080)", async () => {
      const app = createApp({ port: 8080 });
      const res = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/another" });

      expect(res.status).toBe(201);
      expect(res.body.shortUrl).toBe(
        `http://localhost:8080/${res.body.code}`,
      );
    });

    it("returns 400 when url is missing", async () => {
      const app = createApp();
      const res = await request(app).post("/shorten").send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 400 when url is not a string", async () => {
      const app = createApp();
      const res = await request(app)
        .post("/shorten")
        .send({ url: 12345 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 400 when url does not start with http:// or https://", async () => {
      const app = createApp();
      const res = await request(app)
        .post("/shorten")
        .send({ url: "ftp://example.com" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("does not create a usable record for invalid input", async () => {
      const app = createApp();
      const invalidRes = await request(app)
        .post("/shorten")
        .send({ url: "not-a-url" });

      expect(invalidRes.status).toBe(400);

      // The invalid input should not create a usable code
      const redirectRes = await request(app)
        .get("/not-a-url")
        .redirects(0);

      expect(redirectRes.status).toBe(404);
    });

    it("returns 400 for malformed JSON body", async () => {
      const app = createApp();
      const res = await request(app)
        .post("/shorten")
        .set("Content-Type", "application/json")
        .send("{ invalid json");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("creates distinct codes for the same URL", async () => {
      const app = createApp();
      const res1 = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/duplicate" });
      const res2 = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/duplicate" });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res2.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res1.body.code).not.toBe(res2.body.code);

      // Both codes should be accessible
      const redirect1 = await request(app)
        .get(`/${res1.body.code}`)
        .redirects(0);
      expect(redirect1.status).toBe(302);

      const redirect2 = await request(app)
        .get(`/${res2.body.code}`)
        .redirects(0);
      expect(redirect2.status).toBe(302);
    });
  });

  describe("GET /:code", () => {
    it("redirects 302 to the original URL", async () => {
      const app = createApp();
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/redirect-test" });

      const code = createRes.body.code;
      const res = await request(app).get(`/${code}`).redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("https://example.com/redirect-test");
    });

    it("returns 404 for a non-existent code", async () => {
      const app = createApp();
      const res = await request(app).get("/nonexist").redirects(0);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /:code/stats", () => {
    it("returns 200 with code, url, and hits for an existing code", async () => {
      const app = createApp();
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/stats-test" });

      const code = createRes.body.code;
      const statsRes = await request(app).get(`/${code}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.code).toBe(code);
      expect(statsRes.body.url).toBe("https://example.com/stats-test");
      expect(statsRes.body.hits).toBe(0);
    });

    it("returns 404 for a non-existent code", async () => {
      const app = createApp();
      const res = await request(app).get("/nonexist/stats");

      expect(res.status).toBe(404);
    });

    it("does not increment hits when stats is consulted", async () => {
      const app = createApp();
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/no-increment" });

      const code = createRes.body.code;

      // Consult stats multiple times
      for (let i = 0; i < 3; i++) {
        const statsRes = await request(app).get(`/${code}/stats`);
        expect(statsRes.body.hits).toBe(0);
      }
    });

    it("reports hits: 2 after two successful redirects", async () => {
      const app = createApp();
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/hits-count" });

      const code = createRes.body.code;

      // Two successful redirects
      await request(app).get(`/${code}`).redirects(0);
      await request(app).get(`/${code}`).redirects(0);

      const statsRes = await request(app).get(`/${code}/stats`);
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.code).toBe(code);
      expect(statsRes.body.url).toBe("https://example.com/hits-count");
      expect(statsRes.body.hits).toBe(2);
    });

    it("is not treated as a redirect for code 'abc123' (route ordering)", async () => {
      const app = createApp();
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/route-ordering" });

      const code = createRes.body.code;
      // The stats endpoint should return stats JSON, not a redirect
      const statsRes = await request(app).get(`/${code}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body).toHaveProperty("hits");
      expect(statsRes.body).toHaveProperty("code");
      expect(statsRes.body).toHaveProperty("url");
    });
  });

  describe("Store isolation between tests", () => {
    it("does not leak state from previous test (fresh app per test)", async () => {
      const app = createApp();
      const res = await request(app).get("/somecode/stats");
      expect(res.status).toBe(404);
    });
  });
});