import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { InMemoryUrlStore } from "../src/store/in-memory-url-store.js";

const TEST_PORT = 4567;

describe("URL API", () => {
  let store: InMemoryUrlStore;

  beforeEach(() => {
    store = new InMemoryUrlStore();
  });

  describe("POST /shorten", () => {
    it("creates a short URL with valid input", async () => {
      const res = await request(createApp({ port: TEST_PORT, store }))
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(res.body.shortUrl).toBe(`http://localhost:${TEST_PORT}/${res.body.code}`);
    });

    it("creates two different short URLs", async () => {
      const app = createApp({ port: TEST_PORT, store });
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

    it("rejects missing url field", async () => {
      const res = await request(createApp({ port: TEST_PORT, store }))
        .post("/shorten")
        .send({})
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it("rejects non-string url", async () => {
      const res = await request(createApp({ port: TEST_PORT, store }))
        .post("/shorten")
        .send({ url: 123 })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it("rejects malformed URL", async () => {
      const res = await request(createApp({ port: TEST_PORT, store }))
        .post("/shorten")
        .send({ url: "not-a-url" })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it("rejects ftp:// URL", async () => {
      const res = await request(createApp({ port: TEST_PORT, store }))
        .post("/shorten")
        .send({ url: "ftp://example.com" })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it("rejects null body", async () => {
      const res = await request(createApp({ port: TEST_PORT, store }))
        .post("/shorten")
        .set("Content-Type", "application/json")
        .send("null")
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it("rejects array body", async () => {
      const res = await request(createApp({ port: TEST_PORT, store }))
        .post("/shorten")
        .send([1, 2, 3])
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it("rejects invalid JSON", async () => {
      const res = await request(createApp({ port: TEST_PORT, store }))
        .post("/shorten")
        .set("Content-Type", "application/json")
        .send("{ invalid json }")
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });

  describe("GET /:code", () => {
    it("redirects to the original URL", async () => {
      const app = createApp({ port: TEST_PORT, store });
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      const { code } = createRes.body as { code: string };

      const redirectRes = await request(app)
        .get(`/${code}`)
        .redirects(0)
        .expect(302);

      expect(redirectRes.headers.location).toBe("https://example.com");
    });

    it("returns 404 for non-existent code", async () => {
      const res = await request(createApp({ port: TEST_PORT, store }))
        .get("/nonexistent")
        .expect(404);

      expect(res.body.error).toBeDefined();
    });
  });

  describe("GET /:code/stats", () => {
    it("returns stats for existing code", async () => {
      const app = createApp({ port: TEST_PORT, store });
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      const { code } = createRes.body as { code: string };

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body.code).toBe(code);
      expect(statsRes.body.url).toBe("https://example.com");
      expect(statsRes.body.hits).toBe(0);
    });

    it("returns 404 for non-existent code", async () => {
      const res = await request(createApp({ port: TEST_PORT, store }))
        .get("/nonexistent/stats")
        .expect(404);

      expect(res.body.error).toBeDefined();
    });

    it("does not increment hits", async () => {
      const app = createApp({ port: TEST_PORT, store });
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      const { code } = createRes.body as { code: string };

      // Query stats twice
      await request(app).get(`/${code}/stats`).expect(200);
      const statsRes = await request(app).get(`/${code}/stats`).expect(200);

      expect(statsRes.body.hits).toBe(0);
    });

    it("is not captured by /:code route", async () => {
      const app = createApp({ port: TEST_PORT, store });
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      const { code } = createRes.body as { code: string };

      // GET /:code/stats should not be treated as GET /:code with code="..."
      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body.code).toBe(code);
      expect(statsRes.body.hits).toBe(0);
    });
  });

  describe("hits counting", () => {
    it("increments hits after redirects", async () => {
      const app = createApp({ port: TEST_PORT, store });
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      const { code } = createRes.body as { code: string };

      // Two redirects
      await request(app).get(`/${code}`).redirects(0).expect(302);
      await request(app).get(`/${code}`).redirects(0).expect(302);

      const statsRes = await request(app)
        .get(`/${code}/stats`)
        .expect(200);

      expect(statsRes.body.hits).toBe(2);
    });

    it("does not increment hits when querying stats", async () => {
      const app = createApp({ port: TEST_PORT, store });
      const createRes = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      const { code } = createRes.body as { code: string };

      // Query stats before any redirect
      const statsRes1 = await request(app).get(`/${code}/stats`).expect(200);
      expect(statsRes1.body.hits).toBe(0);

      // One redirect
      await request(app).get(`/${code}`).redirects(0).expect(302);

      // Stats should reflect exactly one hit
      const statsRes2 = await request(app).get(`/${code}/stats`).expect(200);
      expect(statsRes2.body.hits).toBe(1);
    });
  });

  describe("code collision retry", () => {
    it("retries when generated code already exists", async () => {
      // Pre-populate the store with a code
      store.save("https://existing.com", "ABCDEF");

      let callCount = 0;
      const codes = ["ABCDEF", "GHIJKL"];
      const mockGenerator = () => {
        const code = codes[callCount]!;
        callCount++;
        return code;
      };

      const app = createApp({ port: TEST_PORT, store, codeGenerator: mockGenerator });
      const res = await request(app)
        .post("/shorten")
        .send({ url: "https://example.com" })
        .expect(201);

      expect(res.body.code).toBe("GHIJKL");
    });
  });
});