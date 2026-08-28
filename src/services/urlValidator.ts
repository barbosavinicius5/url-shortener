export type UrlValidation =
  | { valid: true; url: string }
  | { valid: false; error: string };

const HTTP_PREFIX = 'http://';
const HTTPS_PREFIX = 'https://';

/**
 * Accepts only non-empty strings starting with the literal `http://` or
 * `https://` prefix (case-sensitive) that also parse as a syntactically valid
 * absolute URL. The original value is never normalized or altered.
 */
export function validateUrl(url: unknown): UrlValidation {
  if (typeof url !== 'string') {
    return { valid: false, error: 'url must be a string' };
  }
  if (url.length === 0) {
    return { valid: false, error: 'url must not be empty' };
  }
  if (!url.startsWith(HTTP_PREFIX) && !url.startsWith(HTTPS_PREFIX)) {
    return { valid: false, error: 'url must start with http:// or https://' };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'url must be a valid absolute URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'url must use the http or https protocol' };
  }

  return { valid: true, url };
}