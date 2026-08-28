const ALPHANUMERIC_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 1000;

export function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * ALPHANUMERIC_CHARS.length);
    code += ALPHANUMERIC_CHARS.charAt(index);
  }
  return code;
}

export function generateUniqueCode(
  hasFn: (code: string) => boolean,
  maxAttempts: number = MAX_ATTEMPTS,
): string {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateCode();
    if (!hasFn(code)) {
      return code;
    }
  }
  throw new Error("Failed to generate a unique code after maximum attempts");
}

export const CODE_LENGTH_VALUE = CODE_LENGTH;