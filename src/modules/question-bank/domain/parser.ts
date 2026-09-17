import { questionHash, normalizeQuestionSource } from './normalize';
import type { Question } from './model';

export interface ParsedQuestion {
  rawSource: string;
  questionType: Question['questionType'];
  answer: string;
  solution: string;
  hasImage: boolean;
  warnings: string[];
}

function block(source: string, command: string): string {
  const marker = new RegExp(`\\\\${command}(?:\\[[^\\]]*\\])?\\s*\\{`, 'g');
  const match = marker.exec(source);
  const start = match?.index ?? -1;
  if (start < 0) return '';
  let depth = 0;
  const contentStart = start + (match?.[0].length ?? 0);
  for (let index = contentStart; index < source.length; index += 1) {
    if (source[index] === '{' && source[index - 1] !== '\\') depth += 1;
    if (source[index] === '}' && source[index - 1] !== '\\') {
      if (depth === 0) return source.slice(contentStart, index).trim();
      depth -= 1;
    }
  }
  return '';
}

export function detectQuestionType(source: string): Question['questionType'] {
  if (/\\choiceTF\b/.test(source)) return 'true_false';
  if (/\\choice\b/.test(source)) return 'multiple_choice';
  if (/\\shortans(?:\[[^\]]*\])?\s*\{/.test(source)) return 'short_answer';
  if (/\\begin\{enumerate\}|\\begin\{itemize\}/.test(source)) return 'multi_part';
  return 'essay';
}

export function parseExTest(source: string): ParsedQuestion[] {
  const matches = [...source.matchAll(/\\begin\{ex\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{ex\}/g)];
  const chunks = matches.length ? matches.map((match) => match[0]) : source.trim() ? [source] : [];
  return chunks.map((rawSource) => {
    const answer = block(rawSource, 'shortans');
    const solution = block(rawSource, 'loigiai');
    const warnings: string[] = [];
    if (!/\\end\{ex\}/.test(rawSource) && /\\begin\{ex\}/.test(rawSource))
      warnings.push('Môi trường ex chưa đóng.');
    if (!answer && !solution && !/\\True\b/.test(rawSource))
      warnings.push('Chưa nhận diện được đáp án hoặc lời giải.');
    return {
      rawSource,
      questionType: detectQuestionType(rawSource),
      answer,
      solution,
      hasImage: /\\includegraphics|\\begin\{tikzpicture\}|\\begin\{axis\}/.test(rawSource),
      warnings,
    };
  });
}

export function parsedToQuestion(value: ParsedQuestion, source = ''): Question {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    displayId: '',
    classificationCode: '',
    sequenceNumber: null,
    rawSource: value.rawSource,
    normalizedSource: normalizeQuestionSource(value.rawSource),
    contentHash: questionHash(value.rawSource),
    questionType: value.questionType,
    answer: value.answer,
    solution: value.solution,
    level: 'N',
    gradeNodeId: null,
    domainNodeId: null,
    chapterNodeId: null,
    lessonNodeId: null,
    formNodeId: null,
    primaryOutcomeId: null,
    secondaryOutcomeIds: [],
    tags: [],
    source,
    status: 'draft',
    confidence: null,
    reasoning: '',
    warnings: value.warnings,
    hasImage: value.hasImage,
    usageCount: 0,
    idLocked: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}
