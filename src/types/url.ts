export type ShortUrlRecord = {
  code: string;
  url: string;
  hits: number;
};

export type CreateShortUrlResult = {
  code: string;
  shortUrl: string;
};

export type UrlStats = {
  code: string;
  url: string;
  hits: number;
};

/**
 * Typed domain error thrown by the service when the input URL is invalid.
 * Routes convert it into a 400 response without leaking internals.
 */
export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUrlError';
    Object.setPrototypeOf(this, InvalidUrlError.prototype);
  }
}