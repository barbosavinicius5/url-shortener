export function isValidUrl(value: unknown): value is string {
  return typeof value === 'string' && /^(http|https):\/\//i.test(value);
}