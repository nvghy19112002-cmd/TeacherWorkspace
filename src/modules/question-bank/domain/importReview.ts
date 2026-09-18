import type { Question } from './model';

/** Only identical raw LaTeX is skipped; similar questions remain reviewable. */
export function uniqueImports(incoming: Question[], existing: Question[]) {
  const seen = new Set(existing.map((question) => question.rawSource.trim()));
  const questions: Question[] = [];
  let skipped = 0;
  for (const question of incoming) {
    const key = question.rawSource.trim();
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    questions.push(question);
  }
  return { questions, skipped };
}
