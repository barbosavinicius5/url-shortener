/** Alphabet used for short codes: A-Z, a-z and 0-9. */
export const CODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Fixed length of every generated short code. */
export const CODE_LENGTH = 6;

/** Random source returning integers in the range [0, maxExclusive). */
export type RandomInt = (maxExclusive: number) => number;

function defaultRandomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

/** Generates a short code with exactly {@link CODE_LENGTH} alphanumeric characters. */
export function generateCode(randomInt: RandomInt = defaultRandomInt): string {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}