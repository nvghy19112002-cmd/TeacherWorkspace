import type { CurriculumNode, Question, QuestionLevel } from './types';

export interface ClassificationParts {
  grade: string;
  domain: string;
  chapter: string;
  level: 'N' | 'H' | 'V' | 'C';
  lesson: string;
  form: string;
}

export function parseClassificationCode(value: string): ClassificationParts | null {
  const match = value.trim().match(/^([0-9A-Z]+)([A-Z])(\d+)([NHVC])(\d+)-(\d+)$/);
  if (!match) return null;
  return {
    grade: match[1],
    domain: match[2],
    chapter: match[3],
    level: match[4] as ClassificationParts['level'],
    lesson: match[5],
    form: match[6],
  };
}

export function buildClassificationCode(
  nodes: CurriculumNode[],
  selection: {
    gradeNodeId: string | null;
    domainNodeId: string | null;
    chapterNodeId: string | null;
    lessonNodeId: string | null;
    formNodeId: string | null;
    level: QuestionLevel;
  },
): string {
  const code = (id: string | null) => nodes.find((node) => node.id === id)?.code ?? '';
  const grade = code(selection.gradeNodeId);
  const domain = code(selection.domainNodeId);
  const chapter = code(selection.chapterNodeId);
  const lesson = code(selection.lessonNodeId);
  const form = code(selection.formNodeId);
  if (!grade || !domain || !chapter || !lesson || !form) return '';
  return `${grade}${domain}${chapter}${selection.level}${lesson}-${form}`;
}

export function nextQuestionId(questions: Question[], classificationCode: string): {
  displayId: string;
  sequenceNumber: number;
} {
  if (!parseClassificationCode(classificationCode))
    throw new Error('Mã phân loại chưa đúng cấu trúc hoặc chưa đủ cây chương trình.');
  const sequenceNumber =
    Math.max(
      0,
      ...questions
        .filter((question) => question.classificationCode === classificationCode)
        .map((question) => question.sequenceNumber ?? 0),
    ) + 1;
  return {
    sequenceNumber,
    displayId: `${classificationCode}-${String(sequenceNumber).padStart(3, '0')}`,
  };
}

export function splitDisplayId(value: string): { classificationCode: string; sequence: number } | null {
  const match = value.trim().match(/^(.*)-(\d{3,})$/);
  if (!match || !parseClassificationCode(match[1])) return null;
  return { classificationCode: match[1], sequence: Number(match[2]) };
}
