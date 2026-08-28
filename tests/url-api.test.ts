import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Server } from "http";
import { createApp } from "../src/app";
import { InMemoryUrlStore } from "../src/store/url-store";
import { parsePort, getConfig, DEFAULT_PORT } from "../src/config";

describe("URL Shortener API", () => {
  let server: Server;
  let baseUrl: string;
  let port: number;
  let store: InMemoryUrlStore;

  beforeEach(async () => {
    store = new InMemoryUrlStore();

    // Get an available ephemeral port
    const tempServer = new Server();
    await new Promise<void>((resolve) => tempServer.listen(0, resolve));
    const address = tempServer.address();
    port = typeof address === "object" && address !== null ? address.port : 3000;
    await new Promise<void>((resolve) => tempServer.close(() => resolve()));

    const app = createApp({ store, port });
    await new Promise<void>((resolve) => {
      server = app.listen(port, () => {
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  describe("POST /shorten", () => {
    it("should shorten a valid URL with 201 status, 6-char alphanumeric code, and correct shortUrl", async () => {
      const response = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/path" }),
      });

      expect(response.status).toBe(201);
      const data = (await response.json()) as { code: string; shortUrl: string };
      expect(data).toHaveProperty("code");
      expect(data).toHaveProperty("shortUrl");
      expect(data.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(data.shortUrl).toBe(`http://localhost:${port}/${data.code}`);
    });

    it("should return 400 with error property when url is missing", async () => {
      const response = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(typeof data.error).toBe("string");
      expect(data.error.length).toBeGreaterThan(0);
    });

    it("should return 400 when url is not a string", async () => {
      const response = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: 12345 }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(typeof data.error).toBe("string");
    });

    it("should return 400 when url is an invalid URL format or lacks scheme", async () => {
      const response = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "invalid-url-without-scheme" }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(typeof data.error).toBe("string");
    });

    it("should return 400 when url scheme is not http or https (e.g. ftp, javascript)", async () => {
      const ftpResponse = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "ftp://example.com/file" }),
      });
      expect(ftpResponse.status).toBe(400);
      const ftpData = (await ftpResponse.json()) as { error: string };
      expect(typeof ftpData.error).toBe("string");

      const jsResponse = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "javascript:alert(1)" }),
      });
      expect(jsResponse.status).toBe(400);
      const jsData = (await jsResponse.json()) as { error: string };
      expect(typeof jsData.error).toBe("string");
    });

    it("should return 400 when body is malformed JSON", async () => {
      const response = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ malformed json",
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(typeof data.error).toBe("string");
    });

    it("should allow creating multiple short URLs for the same target with unique codes", async () => {
      const targetUrl = "https://example.com/duplicate-test";

      const res1 = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data1 = (await res1.json()) as { code: string };

      const res2 = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data2 = (await res2.json()) as { code: string };

      expect(data1.code).not.toBe(data2.code);
      expect(data1.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(data2.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it("should generate unique codes for multiple sequential creations", async () => {
      const codes = new Set<string>();
      const count = 50;

      for (let i = 0; i < count; i++) {
        const res = await fetch(`${baseUrl}/shorten`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: `https://example.com/page/${i}` }),
        });
        expect(res.status).toBe(201);
        const data = (await res.json()) as { code: string };
        expect(data.code).toMatch(/^[A-Za-z0-9]{6}$/);
        codes.add(data.code);
      }

      expect(codes.size).toBe(count);
    });
  });

  describe("GET /:code (Redirect)", () => {
    it("should return 302 and redirect to target URL for existing code", async () => {
      const targetUrl = "https://example.com/destination-page";

      const createRes = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const { code } = (await createRes.json()) as { code: string };

      const redirectRes = await fetch(`${baseUrl}/${code}`, {
        redirect: "manual",
      });

      expect(redirectRes.status).toBe(302);
      expect(redirectRes.headers.get("location")).toBe(targetUrl);
    });

    it("should return 404 for non-existent code", async () => {
      const response = await fetch(`${baseUrl}/nonExistentCode`, {
        redirect: "manual",
      });

      expect(response.status).toBe(404);
      const data = (await response.json()) as { error: string };
      expect(typeof data.error).toBe("string");
    });

    it("should increment hits counter on each successful redirect", async () => {
      const targetUrl = "https://example.com/hits-counter-test";

      const createRes = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const { code } = (await createRes.json()) as { code: string };

      // Initial stats before any redirect
      const initialStatsRes = await fetch(`${baseUrl}/${code}/stats`);
      const initialStats = (await initialStatsRes.json()) as { hits: number };
      expect(initialStats.hits).toBe(0);

      // 3 redirects
      await fetch(`${baseUrl}/${code}`, { redirect: "manual" });
      await fetch(`${baseUrl}/${code}`, { redirect: "manual" });
      await fetch(`${baseUrl}/${code}`, { redirect: "manual" });

      const finalStatsRes = await fetch(`${baseUrl}/${code}/stats`);
      const finalStats = (await finalStatsRes.json()) as { hits: number; url: string; code: string };
      expect(finalStats.hits).toBe(3);
      expect(finalStats.code).toBe(code);
      expect(finalStats.url).toBe(targetUrl);
    });
  });

  describe("GET /:code/stats", () => {
    it("should return 200 with code, url, and hits for existing code", async () => {
      const targetUrl = "https://example.com/stats-test";

      const createRes = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const { code } = (await createRes.json()) as { code: string };

      const statsRes = await fetch(`${baseUrl}/${code}/stats`);
      expect(statsRes.status).toBe(200);

      const stats = (await statsRes.json()) as { code: string; url: string; hits: number };
      expect(stats.code).toBe(code);
      expect(stats.url).toBe(targetUrl);
      expect(stats.hits).toBe(0);
    });

    it("should not increment hits counter when querying stats repeatedly", async () => {
      const targetUrl = "https://example.com/read-only-stats";

      const createRes = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const { code } = (await createRes.json()) as { code: string };

      await fetch(`${baseUrl}/${code}`, { redirect: "manual" });

      const statsRes1 = await fetch(`${baseUrl}/${code}/stats`);
      const stats1 = (await statsRes1.json()) as { hits: number };
      expect(stats1.hits).toBe(1);

      const statsRes2 = await fetch(`${baseUrl}/${code}/stats`);
      const stats2 = (await statsRes2.json()) as { hits: number };
      expect(stats2.hits).toBe(1);

      const statsRes3 = await fetch(`${baseUrl}/${code}/stats`);
      const stats3 = (await statsRes3.json()) as { hits: number };
      expect(stats3.hits).toBe(1);
    });

    it("should return 404 for non-existent code stats", async () => {
      const response = await fetch(`${baseUrl}/nonExistentCode/stats`);
      expect(response.status).toBe(404);
      const data = (await response.json()) as { error: string };
      expect(typeof data.error).toBe("string");
    });

    it("should correctly resolve route order so /:code/stats is never treated as redirect", async () => {
      const targetUrl = "https://example.com/route-order";

      const createRes = await fetch(`${baseUrl}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const { code } = (await createRes.json()) as { code: string };

      const statsRes = await fetch(`${baseUrl}/${code}/stats`, { redirect: "manual" });
      expect(statsRes.status).toBe(200);
      const statsData = (await statsRes.json()) as { code: string; url: string; hits: number };
      expect(statsData.code).toBe(code);
    });
  });

  describe("Configuration and Port Handling", () => {
    it("should parse valid numeric string PORT correctly", () => {
      expect(parsePort("8080")).toBe(8080);
      expect(parsePort(4000)).toBe(4000);
      expect(parsePort("1")).toBe(1);
      expect(parsePort("65535")).toBe(65535);
    });

    it("should default to 3000 when PORT is missing, negative, zero, or non-numeric", () => {
      expect(parsePort(undefined)).toBe(3000);
      expect(parsePort("")).toBe(3000);
      expect(parsePort("abc")).toBe(3000);
      expect(parsePort("-10")).toBe(3000);
      expect(parsePort("0")).toBe(3000);
      expect(parsePort("70000")).toBe(3000);
      expect(DEFAULT_PORT).toBe(3000);
    });

    it("should read port from environment object in getConfig", () => {
      expect(getConfig({ PORT: "5000" }).port).toBe(5000);
      expect(getConfig({}).port).toBe(3000);
    });

    it("should format shortUrl with default port 3000 when created without port option", async () => {
      const defaultStore = new InMemoryUrlStore();
      const defaultApp = createApp({ store: defaultStore });

      const tempServer = new Server();
      await new Promise<void>((resolve) => tempServer.listen(0, resolve));
      const tempAddress = tempServer.address();
      const listenPort = typeof tempAddress === "object" && tempAddress !== null ? tempAddress.port : 3001;
      await new Promise<void>((resolve) => tempServer.close(() => resolve()));

      let defaultServer: Server;
      await new Promise<void>((resolve) => {
        defaultServer = defaultApp.listen(listenPort, () => resolve());
      });

      try {
        const response = await fetch(`http://localhost:${listenPort}/shorten`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "https://example.com/default-port" }),
        });

        expect(response.status).toBe(201);
        const data = (await response.json()) as { code: string; shortUrl: string };
        expect(data.shortUrl).toBe(`http://localhost:3000/${data.code}`);
      } finally {
        await new Promise<void>((resolve, reject) => {
          defaultServer.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    });

    it("should format shortUrl using custom port passed to app factory", async () => {
      const customStore = new InMemoryUrlStore();
      const customPort = 8888;
      const customApp = createApp({ store: customStore, port: customPort });

      const tempServer = new Server();
      await new Promise<void>((resolve) => tempServer.listen(0, resolve));
      const tempAddress = tempServer.address();
      const listenPort = typeof tempAddress === "object" && tempAddress !== null ? tempAddress.port : 8889;
      await new Promise<void>((resolve) => tempServer.close(() => resolve()));

      let customServer: Server;
      await new Promise<void>((resolve) => {
        customServer = customApp.listen(listenPort, () => resolve());
      });

      try {
        const response = await fetch(`http://localhost:${listenPort}/shorten`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "https://example.com/custom-port" }),
        });

        expect(response.status).toBe(201);
        const data = (await response.json()) as { code: string; shortUrl: string };
        expect(data.shortUrl).toBe(`http://localhost:${customPort}/${data.code}`);
      } finally {
        await new Promise<void>((resolve, reject) => {
          customServer.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    });
  });
});