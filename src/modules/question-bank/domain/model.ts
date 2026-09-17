import { z } from 'zod';

const id = z.string().min(1).max(100);
const timestamp = z.string().datetime();
const nullableId = id.nullable();

export const curriculumKindSchema = z.enum(['grade', 'domain', 'chapter', 'lesson', 'form']);
export const curriculumNodeSchema = z.object({
  id,
  parentId: nullableId,
  kind: curriculumKindSchema,
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(4000),
  sortOrder: z.number().int().min(0),
  archived: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type CurriculumNode = z.infer<typeof curriculumNodeSchema>;

export const learningOutcomeSchema = z.object({
  id,
  nodeId: id,
  code: z.string().trim().min(1).max(80),
  content: z.string().trim().min(1).max(8000),
  source: z.string().trim().min(1).max(500),
  active: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type LearningOutcome = z.infer<typeof learningOutcomeSchema>;

export const questionTypeSchema = z.enum([
  'multiple_choice',
  'true_false',
  'short_answer',
  'essay',
  'multi_part',
]);
export const questionLevelSchema = z.enum(['N', 'H', 'V', 'C']);
export const questionStatusSchema = z.enum([
  'draft',
  'review',
  'approved',
  'needs_fix',
  'archived',
]);
export const questionSchema = z.object({
  id,
  displayId: z.string().max(100),
  classificationCode: z.string().max(80),
  sequenceNumber: z.number().int().positive().nullable(),
  rawSource: z.string().min(1).max(500000),
  normalizedSource: z.string().max(500000),
  contentHash: z.string().min(1).max(100),
  questionType: questionTypeSchema,
  answer: z.string().max(100000),
  solution: z.string().max(300000),
  level: questionLevelSchema,
  gradeNodeId: nullableId,
  domainNodeId: nullableId,
  chapterNodeId: nullableId,
  lessonNodeId: nullableId,
  formNodeId: nullableId,
  primaryOutcomeId: nullableId,
  secondaryOutcomeIds: z.array(id).max(100),
  tags: z.array(z.string().trim().min(1).max(80)).max(100),
  source: z.string().max(1000),
  status: questionStatusSchema,
  confidence: z.number().int().min(0).max(100).nullable(),
  reasoning: z.string().max(20000),
  warnings: z.array(z.string().max(2000)).max(100),
  hasImage: z.boolean(),
  usageCount: z.number().int().min(0),
  idLocked: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp.nullable(),
});
export type Question = z.infer<typeof questionSchema>;

export const questionRevisionSchema = z.object({
  id,
  questionId: id,
  snapshot: z.string().max(1000000),
  reason: z.string().max(500),
  createdAt: timestamp,
});
export type QuestionRevision = z.infer<typeof questionRevisionSchema>;

export const classificationRunSchema = z.object({
  id,
  questionId: id,
  provider: z.string().max(50),
  model: z.string().max(100),
  resultJson: z.string().max(300000),
  accepted: z.boolean(),
  createdAt: timestamp,
});
export type ClassificationRun = z.infer<typeof classificationRunSchema>;

export const examSchema = z.object({
  id,
  title: z.string().trim().min(1).max(200),
  gradeNodeId: nullableId,
  durationMinutes: z.number().int().min(1).max(1440),
  examDate: z.string().nullable(),
  status: z.enum(['draft', 'finalized', 'archived']),
  seed: z.string().max(100),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type Exam = z.infer<typeof examSchema>;

export const examItemSchema = z.object({
  id,
  examId: id,
  sectionId: nullableId,
  questionId: id,
  questionSnapshot: z.string().max(1000000),
  sortOrder: z.number().int().min(0),
  points: z.number().int().min(0).max(10000),
  locked: z.boolean(),
});
export type ExamItem = z.infer<typeof examItemSchema>;

export const bankSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    curriculumNodes: z.array(curriculumNodeSchema).max(10000),
    learningOutcomes: z.array(learningOutcomeSchema).max(30000),
    questions: z.array(questionSchema).max(100000),
    revisions: z.array(questionRevisionSchema).max(300000),
    classificationRuns: z.array(classificationRunSchema).max(300000),
    exams: z.array(examSchema).max(20000),
    examItems: z.array(examItemSchema).max(500000),
  })
  .superRefine((value, ctx) => {
    const unique = <T extends { id: string }>(rows: T[], label: string) => {
      if (new Set(rows.map((row) => row.id)).size !== rows.length)
        ctx.addIssue({ code: 'custom', message: `${label} có ID bị trùng.` });
    };
    unique(value.curriculumNodes, 'Cây chương trình');
    unique(value.learningOutcomes, 'Yêu cầu cần đạt');
    unique(value.questions, 'Câu hỏi');
    unique(value.revisions, 'Lịch sử câu hỏi');
    unique(value.classificationRuns, 'Lịch sử AI');
    unique(value.exams, 'Đề thi');
    unique(value.examItems, 'Câu trong đề');
    const nodes = new Set(value.curriculumNodes.map((row) => row.id));
    const outcomes = new Set(value.learningOutcomes.map((row) => row.id));
    const questions = new Set(value.questions.map((row) => row.id));
    const exams = new Set(value.exams.map((row) => row.id));
    if (value.curriculumNodes.some((row) => row.parentId && !nodes.has(row.parentId)))
      ctx.addIssue({ code: 'custom', message: 'Cây chương trình có nút cha không tồn tại.' });
    if (value.learningOutcomes.some((row) => !nodes.has(row.nodeId)))
      ctx.addIssue({ code: 'custom', message: 'Yêu cầu cần đạt trỏ tới bài không tồn tại.' });
    if (value.questions.some((row) => row.primaryOutcomeId && !outcomes.has(row.primaryOutcomeId)))
      ctx.addIssue({ code: 'custom', message: 'Câu hỏi trỏ tới yêu cầu cần đạt không tồn tại.' });
    if (value.examItems.some((row) => !questions.has(row.questionId) || !exams.has(row.examId)))
      ctx.addIssue({ code: 'custom', message: 'Đề thi có liên kết không hợp lệ.' });
    const ids = value.questions.map((row) => row.displayId).filter(Boolean);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'Mã hiển thị câu hỏi bị trùng.' });
  });
export type BankSnapshot = z.infer<typeof bankSnapshotSchema>;

export const emptyBankSnapshot = (): BankSnapshot => ({
  schemaVersion: 1,
  curriculumNodes: [],
  learningOutcomes: [],
  questions: [],
  revisions: [],
  classificationRuns: [],
  exams: [],
  examItems: [],
});

export const QUESTION_TYPE_LABELS: Record<Question['questionType'], string> = {
  multiple_choice: 'Nhiều lựa chọn',
  true_false: 'Đúng – sai',
  short_answer: 'Trả lời ngắn',
  essay: 'Tự luận',
  multi_part: 'Câu nhiều ý',
};
export const LEVEL_LABELS: Record<Question['level'], string> = {
  N: 'Nhận biết',
  H: 'Thông hiểu',
  V: 'Vận dụng',
  C: 'Vận dụng cao',
};
export const STATUS_LABELS: Record<Question['status'], string> = {
  draft: 'Nháp',
  review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  needs_fix: 'Cần sửa',
  archived: 'Lưu trữ',
};
