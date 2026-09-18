import { commandBlock, maskComments, parseChoices } from './latex';
import { parseClassificationCode, splitDisplayId } from './ids';
import { questionHash, normalizeQuestionSource } from './normalize';
import type { Question } from './model';

export interface ParsedQuestion {
  rawSource: string;
  sourceId?: string;
  questionType: Question['questionType'];
  answer: string;
  solution: string;
  hasImage: boolean;
  warnings: string[];
}

export function detectQuestionType(source: string): Question['questionType'] {
  if (/\\choiceTF\b/.test(source)) return 'true_false';
  if (/\\choice\b/.test(source)) return 'multiple_choice';
  if (/\\shortans(?:\[[^\]]*\])?\s*\{/.test(source)) return 'short_answer';
  if (/\\begin\{enumerate\}|\\begin\{itemize\}/.test(source)) return 'multi_part';
  return 'essay';
}

export function parseExTest(source: string): ParsedQuestion[] {
  const masked = maskComments(source);
  const matches = [...masked.matchAll(/\\begin\{ex\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{ex\}/g)];
  if ((masked.match(/\\begin\{ex\}/g) ?? []).length !== matches.length)
    throw new Error(
      'Có môi trường ex chưa đóng hoặc lồng nhau. Hãy sửa file trước khi nhập để tránh bỏ sót câu.',
    );
  const chunks = matches.length
    ? matches.map((match) => source.slice(match.index, match.index + match[0].length))
    : source.trim()
      ? [source]
      : [];
  return chunks.map((rawSource) => {
    const clean = maskComments(rawSource);
    const questionType = detectQuestionType(clean);
    const choices = parseChoices(clean);
    const answer =
      commandBlock(clean, 'shortans') ||
      (questionType === 'true_false'
        ? choices.map((choice) => (choice.correct ? 'Đ' : 'S')).join(' – ')
        : choices
            .flatMap((choice, index) => (choice.correct ? [String.fromCharCode(65 + index)] : []))
            .join(', '));
    const solution = commandBlock(clean, 'loigiai');
    const header = rawSource.split(/\\choice|\\shortans|\\loigiai/)[0];
    const ids = [...header.matchAll(/\[([0-9A-Z]+[A-Z]\d+[NHVC]\d+-\d+(?:-\d{3,})?)\]/g)].map(
      (match) => match[1],
    );
    const sourceId = ids.find((id) => parseClassificationCode(id) || splitDisplayId(id));
    const warnings: string[] = [];
    if (!/\\end\{ex\}/.test(rawSource) && /\\begin\{ex\}/.test(rawSource))
      warnings.push('Môi trường ex chưa đóng.');
    if (
      (questionType === 'multiple_choice' || questionType === 'true_false') &&
      choices.length !== 4
    )
      warnings.push('Chưa đọc đủ 4 phương án; cần kiểm tra mã LaTeX.');
    if (
      questionType === 'multiple_choice' &&
      choices.filter((choice) => choice.correct).length !== 1
    )
      warnings.push('Câu trắc nghiệm cần đúng một phương án được đánh dấu \\True.');
    if (!answer && !solution && !/\\True\b/.test(rawSource))
      warnings.push('Chưa nhận diện được đáp án hoặc lời giải.');
    return {
      rawSource,
      sourceId,
      questionType,
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
    classificationCode: value.sourceId
      ? (splitDisplayId(value.sourceId)?.classificationCode ?? value.sourceId)
      : '',
    sequenceNumber: null,
    rawSource: value.rawSource,
    normalizedSource: normalizeQuestionSource(value.rawSource),
    contentHash: questionHash(value.rawSource),
    questionType: value.questionType,
    answer: value.answer,
    solution: value.solution,
    level:
      parseClassificationCode(
        value.sourceId
          ? (splitDisplayId(value.sourceId)?.classificationCode ?? value.sourceId)
          : '',
      )?.level ?? 'N',
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
    warnings: [
      ...value.warnings,
      ...(value.sourceId
        ? [`ID trong file nguồn: ${value.sourceId}. Chưa đối chiếu cây chương trình.`]
        : []),
    ],
    hasImage: value.hasImage,
    usageCount: 0,
    idLocked: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}
