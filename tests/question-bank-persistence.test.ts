import { describe, expect, it } from 'vitest';
import { diffBank } from '../src/modules/question-bank/database/codec';
import { bankSnapshotSchema, emptyBankSnapshot } from '../src/modules/question-bank/domain/model';
import { parsedToQuestion, parseExTest } from '../src/modules/question-bank/domain/parser';

describe('incremental question bank saving', () => {
  it('sends only the changed question and keeps unrelated records intact', () => {
    const first = parsedToQuestion(parseExTest(String.raw`\begin{ex}First\end{ex}`)[0]);
    const second = parsedToQuestion(parseExTest(String.raw`\begin{ex}Second\end{ex}`)[0]);
    const before = bankSnapshotSchema.parse({ ...emptyBankSnapshot(), questions: [first, second] });
    const proposed = {
      ...before,
      questions: [before.questions[0], { ...before.questions[1], source: 'Updated source' }],
    };
    const validated = bankSnapshotSchema.parse(proposed);
    const changes = diffBank(before, validated, proposed);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ table: 'questions', id: second.id });
    expect(changes[0].row?.source).toBe('Updated source');
    expect(diffBank(validated, validated)).toEqual([]);
  });
});
