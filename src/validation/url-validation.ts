const HTTP_URL_PREFIX = /^https?:\/\//;
export const ALPHANUMERIC_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Validates that the input is a non-empty string starting exactly with
 * `http://` or `https://` (case-sensitive, no trimming).
 */
export function isValidHttpUrl(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && HTTP_URL_PREFIX.test(value);
}

/** Pure generator of a random alphanumeric code of the given length. */
export function generateCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * ALPHANUMERIC_CHARACTERS.length);
    const character: string = ALPHANUMERIC_CHARACTERS[index] ?? "";
    code += character;
  }
  return code;
}