import { describe, expect, it } from 'vitest';
import { inspectId6, sourceIdCandidates } from '../src/modules/question-bank/domain/id6Taxonomy';
import { parseExTest, parsedToQuestion } from '../src/modules/question-bank/domain/parser';
import { prepareTexPreviewBatch } from '../src/modules/question-bank/domain/texPreview';

describe('ID6 import and batch preview', () => {
  it('checks the complete path, level and leaf against the supplied taxonomy', () => {
    expect(inspectId6('0C1N1-1').state).toBe('valid');
    expect(inspectId6('0C1N1-1-001').classificationCode).toBe('0C1N1-1');
    expect(inspectId6('0C1B1-1').state).toBe('invalid');
    expect(inspectId6('0C1N1-999').state).toBe('invalid');
  });
  it('keeps ambiguous source IDs unchanged and warns rather than assigning one', () => {
    const source = String.raw`\begin{ex}%[0C1N1-1]
%[0C1H1-1]
Question \choice{A}{B}{C}{D}
\end{ex}`;
    expect(sourceIdCandidates(source)).toEqual(['0C1N1-1', '0C1H1-1']);
    const parsed = parseExTest(source)[0];
    const question = parsedToQuestion(parsed);
    expect(question.rawSource).toBe(source);
    expect(question.classificationCode).toBe('');
    expect(question.warnings.join(' ')).toContain('nhiều ID');
  });
  it('makes one PDF input in the order selected and retains original TikZ code', () => {
    const a = String.raw`\begin{ex}A \begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}\end{ex}`;
    const b = String.raw`\begin{ex}B\end{ex}`;
    const batch = prepareTexPreviewBatch(
      [
        { id: 'b', label: 'B', source: b },
        { id: 'a', label: 'A', source: a },
      ],
      '',
      { integrated: true },
    );
    expect(batch.ranges.map((range) => range.id)).toEqual(['b', 'a']);
    expect(batch.question).toContain(`${b}\n\\clearpage\n${a}`);
    expect(batch.document).toContain('\\input{question.tex}');
    expect(() => prepareTexPreviewBatch([], '', { integrated: true })).toThrow();
  });
});
