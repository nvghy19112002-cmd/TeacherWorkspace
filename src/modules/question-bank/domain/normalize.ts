export function normalizeQuestionSource(source: string): string {
  return source
    .replace(/%[^\n]*/g, ' ')
    .replace(/\\(?:d?frac)\s*\{/g, '\\frac{')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('vi');
}

export function stableHash(source: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0)
    .toString(16)
    .padStart(8, '0')}`;
}

export function questionHash(source: string): string {
  return stableHash(normalizeQuestionSource(source));
}

export function similarity(left: string, right: string): number {
  const tokens = (value: string) =>
    new Set(normalizeQuestionSource(value).split(/[^\p{L}\p{N}\\]+/u).filter(Boolean));
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size && !b.size) return 100;
  const shared = [...a].filter((token) => b.has(token)).length;
  return Math.round((shared / (a.size + b.size - shared)) * 100);
}
