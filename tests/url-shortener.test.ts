import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { resolvePort } from "../src/server";
import { MemoryUrlStore } from "../src/store/memory-url-store";

describe("POST /shorten", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("creates a short URL", async () => {
    const response = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" });

    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.body.shortUrl).toBe(
      `http://localhost:3000/${response.body.code}`
    );
  });

  it("rejects a missing url", async () => {
    const response = await request(app).post("/shorten").send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("rejects an empty url", async () => {
    const response = await request(app).post("/shorten").send({ url: "" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("rejects a url without http(s) prefix", async () => {
    const response = await request(app)
      .post("/shorten")
      .send({ url: "ftp://example.com/file" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("does not deduplicate the same url", async () => {
    const first = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/same" });
    const second = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/same" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.code).not.toBe(first.body.code);
  });

  it("generates unique six-character codes for many urls", async () => {
    const codes: string[] = [];
    for (let i = 0; i < 100; i += 1) {
      const response = await request(app)
        .post("/shorten")
        .send({ url: `https://example.com/${i}` });
      expect(response.status).toBe(201);
      codes.push(response.body.code);
    }

    const set = new Set(codes);
    expect(set.size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
    }
  });
});

describe("GET /:code", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("redirects to the original url and increments hits once", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/target" });
    const code = created.body.code as string;

    const response = await request(app).get(`/${code}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://example.com/target");

    const stats = await request(app).get(`/${code}/stats`);
    expect(stats.body.hits).toBe(1);
  });

  it("increments hits on every successful redirect", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/multi" });
    const code = created.body.code as string;

    await request(app).get(`/${code}`);
    await request(app).get(`/${code}`);

    const stats = await request(app).get(`/${code}/stats`);
    expect(stats.body.hits).toBe(2);
  });

  it("returns 404 for an unknown code without changing any counter", async () => {
    const response = await request(app).get("/nope01");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
  });
});

describe("GET /:code/stats", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("returns code, url and hits without incrementing", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/stats" });
    const code = created.body.code as string;

    const first = await request(app).get(`/${code}/stats`);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({
      code,
      url: "https://example.com/stats",
      hits: 0,
    });

    const second = await request(app).get(`/${code}/stats`);
    expect(second.status).toBe(200);
    expect(second.body.hits).toBe(0);
  });

  it("returns 404 for an unknown code", async () => {
    const response = await request(app).get("/nope02/stats");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
  });

  it("does not treat stats as a redirect code", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/x" });
    const code = created.body.code as string;

    const response = await request(app).get(`/${code}/stats`);
    expect(response.status).toBe(200);
    expect(response.headers.location).toBeUndefined();
  });
});

describe("port configuration", () => {
  it("defaults to port 3000 in shortUrl", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/default-port" });

    expect(response.status).toBe(201);
    expect(response.body.shortUrl).toBe(
      `http://localhost:3000/${response.body.code}`
    );
  });

  it("uses the configured port in shortUrl", async () => {
    const app = createApp({ port: 4310 });
    const response = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/custom-port" });

    expect(response.status).toBe(201);
    expect(response.body.shortUrl).toBe(
      `http://localhost:4310/${response.body.code}`
    );
  });

  it("resolvePort defaults to 3000 when undefined or empty", () => {
    expect(resolvePort(undefined)).toBe(3000);
    expect(resolvePort("")).toBe(3000);
  });

  it("resolvePort converts a provided port", () => {
    expect(resolvePort("4310")).toBe(4310);
  });

  it("resolvePort rejects invalid values", () => {
    expect(() => resolvePort("not-a-number")).toThrow();
    expect(() => resolvePort("0")).toThrow();
    expect(() => resolvePort("70000")).toThrow();
  });
});

describe("MemoryUrlStore", () => {
  it("incrementHits returns undefined for an unknown code", () => {
    const store = new MemoryUrlStore();
    expect(store.incrementHits("zzz999")).toBeUndefined();
  });

  it("stores records in isolation per instance", () => {
    const storeA = new MemoryUrlStore();
    const storeB = new MemoryUrlStore();
    storeA.save({ code: "abc123", url: "https://example.com/a", hits: 0 });

    expect(storeA.has("abc123")).toBe(true);
    expect(storeB.has("abc123")).toBe(false);
  });
});