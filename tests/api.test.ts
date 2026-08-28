import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { AppConfig } from "../src/config/environment";

function createTestApp(port: number) {
  const config: AppConfig = { port, baseUrl: `http://localhost:${port}` };
  const app = createApp({ config });
  return { app, config };
}

describe("URL Shortener API", () => {
  let app: ReturnType<typeof createTestApp>["app"];
  let config: AppConfig;

  beforeEach(() => {
    const result = createTestApp(3000);
    app = result.app;
    config = result.config;
  });

  describe("POST /shorten", () => {
    it("creates a short URL and returns 201 with code and shortUrl", async () => {
      const res = await request(app)
        .post("/shorten")
        .send({ url: "https://exemplo.com/pagina" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("code");
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body).toHaveProperty("shortUrl");
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
    });

    it("generates distinct codes for two creations of the same URL", async () => {
      const res1 = await request(app)
        .post("/shorten")
        .send({ url: "https://exemplo.com/pagina" });

      const res2 = await request(app)
        .post("/shorten")
        .send({ url: "https://exemplo.com/pagina" });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.code).not.toBe(res2.body.code);
    });

    it("returns 400 when url is missing", async () => {
      const res = await request(app).post("/shorten").send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(typeof res.body.error).toBe("string");
    });

    it("returns 400 when url does not start with http:// or https://", async () => {
      const res = await request(app)
        .post("/shorten")
        .send({ url: "ftp://exemplo.com" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(typeof res.body.error).toBe("string");
    });

    it("uses the configured port in shortUrl (port 4000)", async () => {
      const { app: app4000 } = createTestApp(4000);
      const res = await request(app4000)
        .post("/shorten")
        .send({ url: "https://exemplo.com/test" });

      expect(res.status).toBe(201);
      expect(res.body.shortUrl).toBe(`http://localhost:4000/${res.body.code}`);
    });
  });

  describe("GET /:code", () => {
    it("redirects with 302 and correct Location for an existing code", async () => {
      const res1 = await request(app)
        .post("/shorten")
        .send({ url: "https://exemplo.com/dest" });

      const code = res1.body.code;

      const res2 = await request(app)
        .get(`/${code}`)
        .redirects(0);

      expect(res2.status).toBe(302);
      expect(res2.headers.location).toBe("https://exemplo.com/dest");
    });

    it("returns 404 for a missing code", async () => {
      const res = await request(app).get("/missing").redirects(0);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    it("increments hits exactly once per redirect", async () => {
      const res1 = await request(app)
        .post("/shorten")
        .send({ url: "https://exemplo.com/dest2" });

      const code = res1.body.code;

      await request(app).get(`/${code}`).redirects(0);
      await request(app).get(`/${code}`).redirects(0);

      const statsRes = await request(app).get(`/${code}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.hits).toBe(2);
    });
  });

  describe("GET /:code/stats", () => {
    it("returns stats with hits 0 initially", async () => {
      const res1 = await request(app)
        .post("/shorten")
        .send({ url: "https://exemplo.com/stats0" });

      const code = res1.body.code;

      const statsRes = await request(app).get(`/${code}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.code).toBe(code);
      expect(statsRes.body.url).toBe("https://exemplo.com/stats0");
      expect(statsRes.body.hits).toBe(0);
    });

    it("does not increment hits when checking stats between redirects", async () => {
      const res1 = await request(app)
        .post("/shorten")
        .send({ url: "https://exemplo.com/stats-between" });

      const code = res1.body.code;

      // One redirect
      await request(app).get(`/${code}`).redirects(0);

      // Check stats — should be 1
      const statsRes1 = await request(app).get(`/${code}/stats`);
      expect(statsRes1.body.hits).toBe(1);

      // Check stats again — should still be 1 (stats don't increment)
      const statsRes2 = await request(app).get(`/${code}/stats`);
      expect(statsRes2.body.hits).toBe(1);
    });

    it("returns 404 for missing code stats", async () => {
      const res = await request(app).get("/missing/stats");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });
  });
});