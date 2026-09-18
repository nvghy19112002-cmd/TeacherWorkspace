/** Mask comments without changing offsets into the original LaTeX. */
export function maskComments(source: string): string {
  return source.replace(/\\[\s\S]|%[^\r\n]*/g, (token) =>
    token.startsWith('%') ? ' '.repeat(token.length) : token,
  );
}

function escaped(source: string, index: number): boolean {
  let count = 0;
  while (index > 0 && source[--index] === '\\') count += 1;
  return count % 2 === 1;
}

export function readGroup(source: string, start: number): { value: string; end: number } | null {
  if (source[start] !== '{') return null;
  let depth = 1;
  for (let i = start + 1; i < source.length; i += 1) {
    if (escaped(source, i)) continue;
    if (source[i] === '{') depth += 1;
    if (source[i] === '}' && --depth === 0)
      return { value: source.slice(start + 1, i), end: i + 1 };
  }
  return null;
}

export function commandBlock(source: string, command: string): string {
  const clean = maskComments(source);
  const match = new RegExp(`\\\\${command}\\b(?:\\s*\\[[^\\]]*\\])?\\s*\\{`).exec(clean);
  if (!match) return '';
  return readGroup(clean, match.index + match[0].length - 1)?.value.trim() ?? '';
}

export function parseChoices(source: string): Array<{ value: string; correct: boolean }> {
  const clean = maskComments(source);
  const match = /\\choice(?:TF)?\b(?:\s*\[[^\]]*\])?/.exec(clean);
  if (!match) return [];
  let cursor = match.index + match[0].length;
  const groups: Array<{ value: string; correct: boolean }> = [];
  while (groups.length < 4) {
    while (cursor < clean.length && /\s/.test(clean[cursor])) cursor += 1;
    const group = readGroup(clean, cursor);
    if (!group) break;
    groups.push({
      value: group.value.replace(/\\True\b/g, '').trim(),
      correct: /\\True\b/.test(group.value),
    });
    cursor = group.end;
  }
  return groups;
}
