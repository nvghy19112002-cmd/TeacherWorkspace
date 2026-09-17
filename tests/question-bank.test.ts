import { describe, expect, it } from 'vitest';
import { parseExTest, parsedToQuestion } from '../src/modules/question-bank/domain/parser';
import { buildClassificationCode, nextQuestionId } from '../src/modules/question-bank/domain/ids';
import { findDuplicateCandidates } from '../src/modules/question-bank/domain/duplicates';
import {
  chooseByMatrix,
  createExam,
  examToLatex,
  seededShuffle,
} from '../src/modules/question-bank/domain/exams';
import {
  emptyBankSnapshot,
  bankSnapshotSchema,
  type CurriculumNode,
  type Question,
} from '../src/modules/question-bank/domain/model';
import { createKnttMath1011Curriculum } from '../src/modules/question-bank/domain/knttMath1011';

const now = '2026-09-12T00:00:00.000Z';
const nodes: CurriculumNode[] = [
  ['g', null, 'grade', '0'],
  ['d', 'g', 'domain', 'D'],
  ['c', 'd', 'chapter', '1'],
  ['l', 'c', 'lesson', '1'],
  ['f', 'l', 'form', '2'],
].map(([id, parentId, kind, code], sortOrder) => ({
  id: id!,
  parentId,
  kind: kind as CurriculumNode['kind'],
  code: code!,
  name: id!,
  description: '',
  sortOrder,
  archived: false,
  createdAt: now,
  updatedAt: now,
}));

function question(
  source: string,
  level: Question['level'] = 'N',
  status: Question['status'] = 'approved',
) {
  return { ...parsedToQuestion(parseExTest(source)[0]), level, status };
}

describe('Question Bank V1.4', () => {
  it('parses multiple ex_test environments and optional shortans argument', () => {
    const rows = parseExTest(
      '\\begin{ex}A\\shortans[oly]{42}\\end{ex}\n\\begin{ex}B\\loigiai{OK}\\end{ex}',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].answer).toBe('42');
    expect(rows[1].solution).toBe('OK');
  });
  it('normalizes dfrac and frac as exact duplicates', () => {
    const a = question('\\begin{ex}$\\dfrac{1}{2}$\\end{ex}');
    const b = question('\\begin{ex}$\\frac{1}{2}$\\end{ex}');
    expect(findDuplicateCandidates([a, b])[0]).toMatchObject({ score: 100, method: 'hash' });
  });
  it('builds the agreed classification code', () => {
    expect(
      buildClassificationCode(nodes, {
        gradeNodeId: 'g',
        domainNodeId: 'd',
        chapterNodeId: 'c',
        lessonNodeId: 'l',
        formNodeId: 'f',
        level: 'H',
      }),
    ).toBe('0D1H1-2');
  });
  it('ships the KNTT grade 10–11 hierarchy without pre-empting teacher-approved forms', () => {
    const curriculumNodes = createKnttMath1011Curriculum(now);
    expect(() =>
      bankSnapshotSchema.parse({ ...emptyBankSnapshot(), curriculumNodes }),
    ).not.toThrow();
    expect(
      curriculumNodes.filter((node) => node.kind === 'grade').map((node) => node.name),
    ).toEqual(['Lớp 10', 'Lớp 11']);
    expect(curriculumNodes.some((node) => node.name === 'Bài 1. Mệnh đề')).toBe(true);
    expect(curriculumNodes.some((node) => node.name === 'Bài 33. Đạo hàm cấp hai')).toBe(true);
    expect(curriculumNodes.some((node) => node.kind === 'form')).toBe(false);
  });
  it('never reuses a deleted question sequence', () => {
    const old = {
      ...question('A'),
      classificationCode: '0D1N1-2',
      sequenceNumber: 7,
      displayId: '0D1N1-2-007',
      deletedAt: now,
    };
    expect(nextQuestionId([old], '0D1N1-2')).toEqual({
      sequenceNumber: 8,
      displayId: '0D1N1-2-008',
    });
  });
  it('uses a deterministic shuffle for each seed', () => {
    expect(seededShuffle([1, 2, 3, 4, 5], 'abc')).toEqual(seededShuffle([1, 2, 3, 4, 5], 'abc'));
  });
  it('reports shortages instead of silently weakening the matrix', () => {
    const result = chooseByMatrix([question('A', 'N')], { N: 2, H: 1, V: 0, C: 0 }, 'x');
    expect(result.shortages).toEqual({ N: 1, H: 1 });
  });
  it('exports question and answer from immutable exam snapshot', () => {
    const original = { ...question('\\begin{ex}Gốc\\end{ex}'), answer: 'A' };
    const made = createExam('Kiểm tra', 45, [original], 'x');
    const edited = { ...original, rawSource: '\\begin{ex}Đã sửa\\end{ex}', answer: 'B' };
    const snapshot = {
      ...emptyBankSnapshot(),
      questions: [edited],
      exams: [made.exam],
      examItems: made.items,
    };
    const latex = examToLatex(snapshot, made.exam);
    expect(latex).toContain('Gốc');
    expect(latex).toContain('% 1. A');
    expect(latex).not.toContain('Đã sửa');
  });
  it('marks questions used in an exam through the caller without changing source objects', () => {
    const q = question('A');
    createExam('Đề', 45, [q], 'seed');
    expect(q.idLocked).toBe(false);
    expect(q.usageCount).toBe(0);
  });
});
