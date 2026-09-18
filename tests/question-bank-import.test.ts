import { describe, expect, it } from 'vitest';
import { parseExTest, parsedToQuestion } from '../src/modules/question-bank/domain/parser';
import {
  commandBlock,
  maskComments,
  parseChoices,
} from '../src/modules/question-bank/domain/latex';
import { uniqueImports } from '../src/modules/question-bank/domain/importReview';

const wrap = (body: string) => `\\begin{ex}${body}\\end{ex}`;

describe('Question bank import and LaTeX boundaries', () => {
  it('reads an ID comment while preserving original source and leaving curriculum unassigned', () => {
    const raw = wrap('%[0D1H1-2]\nCâu hỏi\\choice{A}{\\True B}{C}{D}');
    const parsed = parseExTest(raw)[0];
    expect(parsed.sourceId).toBe('0D1H1-2');
    const q = parsedToQuestion(parsed, 'de.tex');
    expect(q).toMatchObject({
      rawSource: raw,
      classificationCode: '0D1H1-2',
      level: 'H',
      answer: 'B',
      displayId: '',
      lessonNodeId: null,
    });
  });
  it('keeps a full source ID without allocating or reusing its sequence', () => {
    const q = parsedToQuestion(parseExTest(wrap('[0D1N1-1-007] Câu hỏi'))[0]);
    expect(q.classificationCode).toBe('0D1N1-1');
    expect(q.sequenceNumber).toBeNull();
    expect(q.warnings.join(' ')).toContain('0D1N1-1-007');
  });
  it('reads optional choiceTF layout, nested braces, comments and true markers', () => {
    const source = wrap(
      'Đúng sai?\\choiceTF[1t]\n% {bỏ qua}\n{\\True $\\frac{1}{2}$}{Sai}{\\True Đúng}{Sai}\\loigiai{Lời giải {lồng}}',
    );
    expect(parseChoices(source)).toHaveLength(4);
    expect(parseExTest(source)[0]).toMatchObject({
      answer: 'Đ – S – Đ – S',
      solution: 'Lời giải {lồng}',
      questionType: 'true_false',
    });
  });
  it('ignores commented environments and retains escaped percent signs', () => {
    const source =
      '% \\begin{ex}Bỏ qua\\end{ex}\n' + wrap('Giảm $20\\%$. % \\end{ex}\n\\shortans[oly]{42}');
    const rows = parseExTest(source);
    expect(rows).toHaveLength(1);
    expect(rows[0].answer).toBe('42');
    expect(rows[0].rawSource).toContain('20\\%');
    expect(maskComments('a\\%b%comment\nc')).toBe('a\\%b        \nc');
  });
  it('does not interpret a True marker in a comment as the answer', () => {
    const rows = parseExTest(wrap('\\choice{A %\\True\n}{B}{C}{D}'));
    expect(rows[0].answer).toBe('');
    expect(rows[0].warnings.join(' ')).toContain('đúng một');
  });
  it('rejects incomplete and nested ex blocks instead of silently dropping questions', () => {
    expect(() => parseExTest(wrap('Đủ') + '\\begin{ex}Thiếu')).toThrow('chưa đóng');
    expect(() => parseExTest(wrap(wrap('Lồng')))).toThrow('lồng nhau');
  });
  it('handles escaped braces and line breaks at closing braces', () => {
    expect(commandBlock(String.raw`\loigiai{Tập $\{1,2\}$ và $\heva{a\\}$}`, 'loigiai')).toBe(
      String.raw`Tập $\{1,2\}$ và $\heva{a\\}$`,
    );
  });
  it('skips identical source even in trash but retains different answers and letter case', () => {
    const make = (s: string) => parsedToQuestion(parseExTest(wrap(s))[0]);
    const q = make('$A$');
    const result = uniqueImports(
      [make('$A$'), make('$a$'), make('$a$'), make('$A$\\shortans{2}')],
      [{ ...q, deletedAt: new Date().toISOString() }],
    );
    expect(result.skipped).toBe(2);
    expect(result.questions).toHaveLength(2);
  });
  it('never changes the inputs during duplicate checking', () => {
    const q = parsedToQuestion(parseExTest(wrap('Câu'))[0]);
    const before = JSON.stringify(q);
    uniqueImports([q, q], []);
    expect(JSON.stringify(q)).toBe(before);
  });
});
