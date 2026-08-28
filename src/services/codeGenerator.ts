import { randomInt } from 'node:crypto';

export const CODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const CODE_LENGTH = 6;

export type CodeGenerator = () => string;

/**
 * Generates a random code with exactly CODE_LENGTH alphanumeric characters.
 */
export function generateCode(): string {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length));
  }
  return code;
}