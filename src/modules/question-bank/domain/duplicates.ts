import type { Question } from './model';
import { similarity } from './normalize';

export interface DuplicateCandidate {
  left: Question;
  right: Question;
  score: number;
  method: 'hash' | 'similarity';
}

export function findDuplicateCandidates(questions: Question[], threshold = 82): DuplicateCandidate[] {
  const active = questions.filter((question) => !question.deletedAt);
  const output: DuplicateCandidate[] = [];
  const hashes = new Map<string, Question[]>();
  for (const question of active) {
    const group = hashes.get(question.contentHash) ?? [];
    for (const previous of group)
      output.push({ left: previous, right: question, score: 100, method: 'hash' });
    group.push(question);
    hashes.set(question.contentHash, group);
  }
  const exact = new Set(output.map((item) => [item.left.id, item.right.id].sort().join('/')));
  for (let left = 0; left < active.length; left += 1) {
    for (let right = left + 1; right < active.length; right += 1) {
      const key = [active[left].id, active[right].id].sort().join('/');
      if (exact.has(key)) continue;
      const score = similarity(active[left].rawSource, active[right].rawSource);
      if (score >= threshold)
        output.push({ left: active[left], right: active[right], score, method: 'similarity' });
    }
  }
  return output.sort((a, b) => b.score - a.score);
}
