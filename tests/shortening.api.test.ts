import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "../src/app";
import { ShorteningStore } from "../src/stores/shortening.store";

const TEST_PORT = 4100;
const SHORT_CODE_PATTERN = /^[A-Za-z0-9]{6}$/;

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp({ port: TEST_PORT, store: new ShorteningStore() });
});

describe("POST /shorten", () => {
  it("creates a shortening with 201, a six-char alphanumeric code and a shortUrl reflecting the port", async () => {
    const response = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" });

    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(SHORT_CODE_PATTERN);
    expect(response.body.shortUrl).toMatch(
      new RegExp(`^http://localhost:${TEST_PORT}/[A-Za-z0-9]{6}$`)
    );
  });

  it("also accepts http:// URLs", async () => {
    const response = await request(app)
      .post("/shorten")
      .send({ url: "http://example.com/plain-page" });

    expect(response.status).toBe(201);
    expect(response.body.code).toMatch(SHORT_CODE_PATTERN);
  });

  it("creates independent records when the same URL is submitted twice (no deduplication)", async () => {
    const first = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/duplicated" });
    const second = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/duplicated" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const firstStats = await request(app).get(`/${first.body.code}/stats`);
    const secondStats = await request(app).get(`/${second.body.code}/stats`);

    expect(firstStats.status).toBe(200);
    expect(secondStats.status).toBe(200);
    expect(firstStats.body).toEqual({
      code: first.body.code,
      url: "https://example.com/duplicated",
      hits: 0,
    });
    expect(secondStats.body).toEqual({
      code: second.body.code,
      url: "https://example.com/duplicated",
      hits: 0,
    });
  });

  it("rejects a JSON body without url with 400, JSON content type and a string error", async () => {
    const response = await request(app).post("/shorten").send({});

    expect(response.status).toBe(400);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(typeof response.body.error).toBe("string");
    expect(response.body.error.length).toBeGreaterThan(0);
  });

  it("rejects a request without any body with 400", async () => {
    const response = await request(app).post("/shorten");

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe("string");
  });

  it("rejects a non-string url with 400", async () => {
    const response = await request(app).post("/shorten").send({ url: 12345 });

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe("string");
  });

  it("rejects an empty url with 400", async () => {
    const response = await request(app).post("/shorten").send({ url: "" });

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe("string");
  });

  it.each(["ftp://example.com", "example.com"])(
    "rejects %s with 400 and an error",
    async (url) => {
      const response = await request(app).post("/shorten").send({ url });

      expect(response.status).toBe(400);
      expect(typeof response.body.error).toBe("string");
    }
  );
});

describe("GET /:code", () => {
  it("redirects with 302 to the original URL", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/target" });

    const response = await request(app).get(`/${created.body.code}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://example.com/target");
  });

  it("returns 404 with a JSON error for a missing code", async () => {
    const response = await request(app).get("/missing");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body.error).toBe("Shortening not found");
  });
});

describe("GET /:code/stats", () => {
  it("returns 404 with a JSON error for a missing code", async () => {
    const response = await request(app).get("/missing/stats");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body.error).toBe("Shortening not found");
  });

  it("returns exactly code, url and hits for a fresh record", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/fresh" });

    const response = await request(app).get(`/${created.body.code}/stats`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      code: created.body.code,
      url: "https://example.com/fresh",
      hits: 0,
    });
  });

  it("counts one hit per successful redirect and none for stats lookups", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/counted" });
    const code: string = created.body.code;

    const before = await request(app).get(`/${code}/stats`);
    expect(before.body.hits).toBe(0);

    for (let redirect = 0; redirect < 3; redirect += 1) {
      const response = await request(app).get(`/${code}`);
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe("https://example.com/counted");
    }

    const between = await request(app).get(`/${code}/stats`);
    expect(between.body.hits).toBe(3);

    const extra = await request(app).get(`/${code}`);
    expect(extra.status).toBe(302);

    const after = await request(app).get(`/${code}/stats`);
    expect(after.body.hits).toBe(4);
  });

  it("does not count missing-code requests as hits", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/untouched" });
    const code: string = created.body.code;

    const missingRedirect = await request(app).get("/missing");
    const missingStats = await request(app).get("/missing/stats");
    expect(missingRedirect.status).toBe(404);
    expect(missingStats.status).toBe(404);

    const stats = await request(app).get(`/${code}/stats`);
    expect(stats.body.hits).toBe(0);
  });
});