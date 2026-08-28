import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { InMemoryUrlStore } from "../src/url-store";

const PORT = 3000;

function makeApp(port = PORT) {
  const store = new InMemoryUrlStore();
  const app = createApp({ port, store });
  return { app, store };
}

describe("URL Shortener API", () => {
  describe("POST /shorten", () => {
    it("should create a shortened URL for a valid HTTPS URL", async () => {
      const { app } = makeApp();
      const res = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/path" })
        .expect(201);

      expect(res.body).toHaveProperty("code");
      expect(res.body).toHaveProperty("shortUrl");
      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:${PORT}/${res.body.code}`);
    });

    it("should accept valid HTTP URLs", async () => {
      const { app } = makeApp();
      const res = await request(app)
        .post("/shorten")
        .send({ url: "http://example.com" })
        .expect(201);

      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:${PORT}/${res.body.code}`);
    });

    it("should generate different codes for the same URL", async () => {
      const { app } = makeApp();
      const res1 = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      const res2 = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      expect(res1.body.code).not.toBe(res2.body.code);
    });

    it("should generate unique codes for different URLs", async () => {
      const { app } = makeApp();
      const res1 = await request(app)
        .post("/shorten")
        .send({ url: "https://site-a.com" })
        .expect(201);

      const res2 = await request(app)
        .post("/shorten")
        .send({ url: "https://site-b.com" })
        .expect(201);

      expect(res1.body.code).not.toBe(res2.body.code);
    });

    it("should return 400 when url field is missing", async () => {
      const { app } = makeApp();
      const res = await request(app)
        .post("/shorten")
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty("error");
      expect(typeof res.body.error).toBe("string");
    });

    it("should return 400 when url is an empty string", async () => {
      const { app } = makeApp();
      const res = await request(app)
        .post("/shorten")
        .send({ url: "" })
        .expect(400);

      expect(res.body).toHaveProperty("error");
      expect(typeof res.body.error).toBe("string");
    });

    it("should return 400 when url is only whitespace", async () => {
      const { app } = makeApp();
      const res = await request(app)
        .post("/shorten")
        .send({ url: "   " })
        .expect(400);

      expect(res.body).toHaveProperty("error");
      expect(typeof res.body.error).toBe("string");
    });

    it("should return 400 when url does not start with http:// or https://", async () => {
      const { app } = makeApp();
      const res = await request(app)
        .post("/shorten")
        .send({ url: "ftp://files.example.com" })
        .expect(400);

      expect(res.body).toHaveProperty("error");
      expect(typeof res.body.error).toBe("string");
    });

    it("should return 400 for a relative URL", async () => {
      const { app } = makeApp();
      const res = await request(app)
        .post("/shorten")
        .send({ url: "/relative/path" })
        .expect(400);

      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 when url is not a string", async () => {
      const { app } = makeApp();
      const res = await request(app)
        .post("/shorten")
        .send({ url: 12345 })
        .expect(400);

      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 when body is not an object", async () => {
      const { app } = makeApp();
      const res = await request(app)
        .post("/shorten")
        .send("not-an-object")
        .expect(400);

      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /:code", () => {
    it("should redirect to the original URL with 302 status", async () => {
      const { app } = makeApp();

      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/target" })
        .expect(201);

      const code = createRes.body.code;

      const redirectRes = await request(app)
        .get(`/${code}`)
        .expect(302);

      expect(redirectRes.headers.location).toBe("https://example.com/target");
    });

    it("should increment hits on each successful redirect", async () => {
      const { app } = makeApp();

      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/count" })
        .expect(201);

      const code = createRes.body.code;

      // Initially hits should be 0
      const stats0 = await request(app).get(`/${code}/stats`).expect(200);
      expect(stats0.body.hits).toBe(0);

      // First redirect
      await request(app).get(`/${code}`).expect(302);
      const stats1 = await request(app).get(`/${code}/stats`).expect(200);
      expect(stats1.body.hits).toBe(1);

      // Second redirect
      await request(app).get(`/${code}`).expect(302);
      const stats2 = await request(app).get(`/${code}/stats`).expect(200);
      expect(stats2.body.hits).toBe(2);
    });

    it("should return 404 for a non-existent code", async () => {
      const { app } = makeApp();
      const res = await request(app).get("/nonexistent").expect(404);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /:code/stats", () => {
    it("should return code, url, and hits for an existing code", async () => {
      const { app } = makeApp();

      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/stats-test" })
        .expect(201);

      const code = createRes.body.code;

      const statsRes = await request(app).get(`/${code}/stats`).expect(200);

      expect(statsRes.body).toEqual({
        code,
        url: "https://example.com/stats-test",
        hits: 0,
      });
    });

    it("should reflect correct hits after redirects", async () => {
      const { app } = makeApp();

      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/hits" })
        .expect(201);

      const code = createRes.body.code;

      // Do 3 redirects
      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);
      await request(app).get(`/${code}`).expect(302);

      const statsRes = await request(app).get(`/${code}/stats`).expect(200);
      expect(statsRes.body.hits).toBe(3);
    });

    it("should return 404 for a non-existent code", async () => {
      const { app } = makeApp();
      const res = await request(app).get("/nonexistent/stats").expect(404);
      expect(res.body).toHaveProperty("error");
    });

    it("should not increment hits when reading stats", async () => {
      const { app } = makeApp();

      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com/no-increment" })
        .expect(201);

      const code = createRes.body.code;

      // Read stats multiple times
      await request(app).get(`/${code}/stats`).expect(200);
      await request(app).get(`/${code}/stats`).expect(200);
      await request(app).get(`/${code}/stats`).expect(200);

      // Hits should still be 0
      const statsRes = await request(app).get(`/${code}/stats`).expect(200);
      expect(statsRes.body.hits).toBe(0);
    });
  });

  describe("Port configuration", () => {
    it("should use the configured port in shortUrl", async () => {
      const customPort = 4310;
      const { app } = makeApp(customPort);

      const res = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      expect(res.body.shortUrl).toBe(`http://localhost:${customPort}/${res.body.code}`);
    });
  });

  describe("Isolation", () => {
    it("should have isolated state between apps", async () => {
      const { app: app1 } = makeApp();
      const { app: app2 } = makeApp();

      const res1 = await request(app1)
        .post("/shorten")
        .send({ url: "https://isolation-a.com" })
        .expect(201);

      // code from app1 should not exist in app2
      await request(app2).get(`/${res1.body.code}`).expect(404);
    });
  });
});