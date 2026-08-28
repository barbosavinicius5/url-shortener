import { describe, it, expect } from "vitest";
import { getPort, createServerConfig } from "../src/config.js";

describe("getPort", () => {
  it("returns 3000 when PORT is undefined", () => {
    expect(getPort({})).toBe(3000);
  });

  it("returns 3000 when PORT is empty string", () => {
    expect(getPort({ PORT: "" })).toBe(3000);
  });

  it("returns the configured PORT when valid", () => {
    expect(getPort({ PORT: "4567" })).toBe(4567);
  });

  it("throws for non-numeric PORT", () => {
    expect(() => getPort({ PORT: "abc" })).toThrow("Invalid PORT");
  });

  it("throws for PORT with non-integer value", () => {
    expect(() => getPort({ PORT: "3000.5" })).toThrow("Invalid PORT");
  });

  it("throws for PORT with trailing characters", () => {
    expect(() => getPort({ PORT: "3000abc" })).toThrow("Invalid PORT");
  });

  it("throws for PORT out of range (0)", () => {
    expect(() => getPort({ PORT: "0" })).toThrow("Invalid PORT");
  });

  it("throws for PORT out of range (65536)", () => {
    expect(() => getPort({ PORT: "65536" })).toThrow("Invalid PORT");
  });
});

describe("createServerConfig", () => {
  it("returns default config when no PORT is set", () => {
    const config = createServerConfig({});
    expect(config.port).toBe(3000);
    expect(config.baseUrl).toBe("http://localhost:3000");
  });

  it("returns config based on PORT", () => {
    const config = createServerConfig({ PORT: "8080" });
    expect(config.port).toBe(8080);
    expect(config.baseUrl).toBe("http://localhost:8080");
  });
});