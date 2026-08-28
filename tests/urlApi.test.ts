import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const TEST_PORT = 4100;

describe("URL Shortener API", () => {
  it("POST /shorten — creates a short URL for valid input (201)", async () => {
    const app = createApp({ port: TEST_PORT });
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" })
      .expect(201);

    expect(res.body).toHaveProperty("code");
    expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(res.body.shortUrl).toBe(
      `http://localhost:${TEST_PORT}/${res.body.code}`,
    );

    // hits should be 0 right after creation
    const statsRes = await request(app)
      .get(`/${res.body.code}/stats`)
      .expect(200);
    expect(statsRes.body.hits).toBe(0);
  });

  it("GET /:code — redirects to the original URL (302) and increments hits", async () => {
    const app = createApp({ port: TEST_PORT });
    const createRes = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/redirect-test" })
      .expect(201);
    const code = createRes.body.code as string;

    const redirectRes = await request(app)
      .get(`/${code}`)
      .redirects(0)
      .expect(302);
    expect(redirectRes.headers["location"]).toBe(
      "https://example.com/redirect-test",
    );

    // hits should be 1 after one redirect
    const statsRes = await request(app)
      .get(`/${code}/stats`)
      .expect(200);
    expect(statsRes.body.hits).toBe(1);

    // second redirect
    await request(app).get(`/${code}`).redirects(0).expect(302);

    const statsRes2 = await request(app)
      .get(`/${code}/stats`)
      .expect(200);
    expect(statsRes2.body.hits).toBe(2);
  });

  it("GET /:code/stats — does not increment hits", async () => {
    const app = createApp({ port: TEST_PORT });
    const createRes = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/stats-test" })
      .expect(201);
    const code = createRes.body.code as string;

    // stats before any redirect
    const statsBefore = await request(app)
      .get(`/${code}/stats`)
      .expect(200);
    expect(statsBefore.body.hits).toBe(0);

    // redirect once
    await request(app).get(`/${code}`).redirects(0).expect(302);

    // stats after redirect — hits = 1
    const statsAfter = await request(app)
      .get(`/${code}/stats`)
      .expect(200);
    expect(statsAfter.body.hits).toBe(1);

    // stats again — still 1 (stats doesn't increment)
    const statsAgain = await request(app)
      .get(`/${code}/stats`)
      .expect(200);
    expect(statsAgain.body.hits).toBe(1);
  });

  it("GET /:code — returns 404 for non-existent code", async () => {
    const app = createApp({ port: TEST_PORT });
    const res = await request(app).get("/nonexist").expect(404);
    expect(res.body).toHaveProperty("error");
    expect(typeof res.body.error).toBe("string");
  });

  it("GET /:code/stats — returns 404 for non-existent code", async () => {
    const app = createApp({ port: TEST_PORT });
    const res = await request(app).get("/nonexist/stats").expect(404);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /shorten — returns 400 when url is missing", async () => {
    const app = createApp({ port: TEST_PORT });
    const res = await request(app)
      .post("/shorten")
      .send({})
      .expect(400);
    expect(res.body).toHaveProperty("error");
    expect(typeof res.body.error).toBe("string");
  });

  it("POST /shorten — returns 400 when body is absent", async () => {
    const app = createApp({ port: TEST_PORT });
    const res = await request(app)
      .post("/shorten")
      .send("")
      .expect(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /shorten — returns 400 for non-http protocol (ftp://)", async () => {
    const app = createApp({ port: TEST_PORT });
    const res = await request(app)
      .post("/shorten")
      .send({ url: "ftp://example.com/file" })
      .expect(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /shorten — returns 400 for malformed URL", async () => {
    const app = createApp({ port: TEST_PORT });
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://" })
      .expect(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /shorten — returns 400 for invalid JSON payload", async () => {
    const app = createApp({ port: TEST_PORT });
    const res = await request(app)
      .post("/shorten")
      .set("Content-Type", "application/json")
      .send("{invalid json}")
      .expect(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /shorten — same URL creates distinct codes (no deduplication)", async () => {
    const app = createApp({ port: TEST_PORT });
    const res1 = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/duplicate" })
      .expect(201);
    const res2 = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/duplicate" })
      .expect(201);

    expect(res1.body.code).not.toBe(res2.body.code);

    // both records exist independently
    const stats1 = await request(app)
      .get(`/${res1.body.code}/stats`)
      .expect(200);
    const stats2 = await request(app)
      .get(`/${res2.body.code}/stats`)
      .expect(200);
    expect(stats1.body.url).toBe("https://example.com/duplicate");
    expect(stats2.body.url).toBe("https://example.com/duplicate");
  });

  it("POST /shorten — multiple creations produce unique codes", async () => {
    const app = createApp({ port: TEST_PORT });
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post("/shorten")
        .send({ url: `https://example.com/${i}` })
        .expect(201);
      codes.push(res.body.code as string);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("shortUrl uses the configured port", async () => {
    const customPort = 5123;
    const app = createApp({ port: customPort });
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/port-test" })
      .expect(201);
    expect(res.body.shortUrl).toBe(
      `http://localhost:${customPort}/${res.body.code}`,
    );
  });

  it("shortUrl uses default port 3000 when not configured", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/default-port" })
      .expect(201);
    expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
  });
});