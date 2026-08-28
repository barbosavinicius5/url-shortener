import { UrlStore } from "../store/url-store";

export const CODE_LENGTH = 6;
export const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export class InvalidUrlError extends Error {
  constructor(message: string = "Invalid URL") {
    super(message);
    this.name = "InvalidUrlError";
  }
}

export interface CreateUrlResult {
  code: string;
  url: string;
}

export interface UrlStats {
  code: string;
  url: string;
  hits: number;
}

export interface UrlService {
  createShortUrl(url: unknown): CreateUrlResult;
  redirect(code: string): string | undefined;
  getStats(code: string): UrlStats | undefined;
}

export class DefaultUrlService implements UrlService {
  constructor(private readonly store: UrlStore) {}

  private generateCode(): string {
    let result = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * CODE_ALPHABET.length);
      result += CODE_ALPHABET.charAt(randomIndex);
    }
    return result;
  }

  private validateUrl(url: unknown): string {
    if (typeof url !== "string" || url.trim() === "") {
      throw new InvalidUrlError("URL must be a non-empty string");
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new InvalidUrlError("URL is not a valid format");
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new InvalidUrlError("Only http and https protocols are supported");
    }

    return url;
  }

  createShortUrl(url: unknown): CreateUrlResult {
    const validatedUrl = this.validateUrl(url);

    let code: string;
    do {
      code = this.generateCode();
    } while (this.store.get(code) !== undefined);

    this.store.save({
      code,
      url: validatedUrl,
      hits: 0,
    });

    return {
      code,
      url: validatedUrl,
    };
  }

  redirect(code: string): string | undefined {
    const record = this.store.get(code);
    if (!record) {
      return undefined;
    }

    record.hits += 1;
    this.store.save(record);

    return record.url;
  }

  getStats(code: string): UrlStats | undefined {
    const record = this.store.get(code);
    if (!record) {
      return undefined;
    }

    return {
      code: record.code,
      url: record.url,
      hits: record.hits,
    };
  }
}