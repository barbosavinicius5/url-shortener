import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

describe("URL Routes (HTTP contract)", () => {
  describe("POST /shorten", () => {
    it("creates a short URL with 201 status", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
    });

    it("responds with only code and shortUrl keys", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      const keys = Object.keys(res.body);
      expect(keys).toHaveLength(2);
      expect(keys).toContain("code");
      expect(keys).toContain("shortUrl");
    });

    it("responds with 400 when url is missing", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .post("/shorten")
        .send({})
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });

    it("responds with 400 when url is empty", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .post("/shorten")
        .send({ url: "" })
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });

    it("responds with 400 when url is whitespace only", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .post("/shorten")
        .send({ url: "   " })
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });

    it("responds with 400 when url does not start with http:// or https://", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .post("/shorten")
        .send({ url: "ftp://example.com" })
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });

    it("responds with 400 when url is a number", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .post("/shorten")
        .send({ url: 123 })
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });

    it("responds with 400 when url is null", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .post("/shorten")
        .send({ url: null })
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });

    it("responds with 400 for malformed JSON", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .post("/shorten")
        .set("Content-Type", "application/json")
        .send("{ invalid json }")
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /:code", () => {
    it("redirects to the original URL with 302", async () => {
      const app = createApp({ port: 3000 });
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" });

      const code = createRes.body.code as string;
      const res = await request(app)
        .get(`/${code}`)
        .redirects(0)
        .expect(302);

      expect(res.headers.location).toBe("https://example.com");
    });

    it("responds with 404 for non-existent code", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .get("/nonexist")
        .redirects(0)
        .expect(404);
      expect(res.body).toHaveProperty("error");
    });

    it("increments hits exactly once per redirect", async () => {
      const app = createApp({ port: 3000 });
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" });

      const code = createRes.body.code as string;

      await request(app).get(`/${code}`).redirects(0).expect(302);
      await request(app).get(`/${code}`).redirects(0).expect(302);

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body.hits).toBe(2);
    });

    it("does not increment hits on stats queries", async () => {
      const app = createApp({ port: 3000 });
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" });

      const code = createRes.body.code as string;

      await request(app).get(`/${code}/stats`).expect(200);
      await request(app).get(`/${code}/stats`).expect(200);
      await request(app).get(`/${code}/stats`).expect(200);

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body.hits).toBe(0);
    });
  });

  describe("GET /:code/stats", () => {
    it("returns stats with 200 for existing code", async () => {
      const app = createApp({ port: 3000 });
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" });

      const code = createRes.body.code as string;
      const res = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(res.body.code).toBe(code);
      expect(res.body.url).toBe("https://example.com");
      expect(res.body.hits).toBe(0);
    });

    it("returns exactly code, url, and hits keys", async () => {
      const app = createApp({ port: 3000 });
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" });

      const code = createRes.body.code as string;
      const res = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      const keys = Object.keys(res.body).sort();
      expect(keys).toEqual(["code", "hits", "url"]);
    });

    it("responds with 404 for non-existent code", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .get("/nonexist/stats")
        .expect(404);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("PORT configuration", () => {
    it("uses port 3000 by default in shortUrl", async () => {
      const app = createApp({ port: 3000 });
      const res = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      expect(res.body.shortUrl).toContain(":3000/");
    });

    it("uses configured port in shortUrl", async () => {
      const app = createApp({ port: 8080 });
      const res = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      expect(res.body.shortUrl).toContain(":8080/");
    });
  });
});