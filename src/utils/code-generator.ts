export const CODE_LENGTH = 6;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export type CodeGenerator = () => string;

export function generateRandomCode(length: number = CODE_LENGTH): string {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    const charIndex = Math.floor(Math.random() * ALPHABET.length);
    code += ALPHABET[charIndex];
  }
  return code;
}