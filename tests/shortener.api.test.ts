import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("URL shortener API", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("creates a short URL and redirects to the original", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" })
      .expect(201);

    expect(created.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(created.body.shortUrl).toBe(`http://localhost:3000/${created.body.code}`);

    const redirect = await request(app)
      .get(`/${created.body.code}`)
      .redirects(0)
      .expect(302);

    expect(redirect.headers.location).toBe("https://example.com/page");
  });

  it("creates a distinct code for each submission of the same URL", async () => {
    const first = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" })
      .expect(201);

    const second = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com/page" })
      .expect(201);

    expect(first.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(second.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(second.body.code).not.toBe(first.body.code);
  });

  it("generates unique codes across many active links", async () => {
    const codes = new Set<string>();

    for (let i = 0; i < 20; i += 1) {
      const res = await request(app)
        .post("/shorten")
        .send({ url: `https://example.com/${i}` })
        .expect(201);

      codes.add(res.body.code as string);
    }

    expect(codes.size).toBe(20);
  });

  it.each<[string, Record<string, unknown>]>([
    ["missing url", {}],
    ["non-string url", { url: 123 }],
    ["null url", { url: null }],
    ["empty string url", { url: "" }],
    ["url without scheme", { url: "example.com/page" }],
    ["url with ftp scheme", { url: "ftp://example.com" }],
  ])("rejects invalid input (%s)", async (_label, payload) => {
    const res = await request(app).post("/shorten").send(payload).expect(400);

    expect(typeof res.body.error).toBe("string");
    expect((res.body.error as string).length).toBeGreaterThan(0);
  });

  it("returns 404 JSON for a missing code on redirect", async () => {
    const res = await request(app).get("/missing").expect(404);

    expect(res.body.error).toBe("Short URL not found");
    expect(JSON.stringify(res.body)).not.toContain("stack");
  });

  it("returns 404 JSON for a missing code on stats", async () => {
    const res = await request(app).get("/missing/stats").expect(404);

    expect(res.body.error).toBe("Short URL not found");
    expect(JSON.stringify(res.body)).not.toContain("stack");
  });

  it("tracks hits without counting stats queries", async () => {
    const created = await request(app)
      .post("/shorten")
      .send({ url: "https://example.com" })
      .expect(201);
    const code = created.body.code as string;

    const initial = await request(app).get(`/${code}/stats`).expect(200);
    expect(initial.body).toEqual({ code, url: "https://example.com", hits: 0 });

    await request(app).get(`/${code}`).redirects(0).expect(302);
    await request(app).get(`/${code}`).redirects(0).expect(302);

    const middle = await request(app).get(`/${code}/stats`).expect(200);
    expect(middle.body).toEqual({ code, url: "https://example.com", hits: 2 });

    const final = await request(app).get(`/${code}/stats`).expect(200);
    expect(final.body).toEqual({ code, url: "https://example.com", hits: 2 });
  });

  it("uses the configured port when building shortUrl", async () => {
    const customApp = createApp({ port: 8080 });
    const res = await request(customApp)
      .post("/shorten")
      .send({ url: "https://example.com" })
      .expect(201);

    expect(res.body.shortUrl).toBe(`http://localhost:8080/${res.body.code}`);
  });
});