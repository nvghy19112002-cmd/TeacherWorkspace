import { z } from 'zod';

export const alignmentSchema = z.enum([
  'direct',
  'partial',
  'integrated',
  'off_target',
  'out_of_scope',
  'insufficient_data',
]);
export const classificationResultSchema = z.object({
  proposedClassificationCode: z.string().max(100),
  grade: z.string().max(20),
  domain: z.string().max(100),
  chapterId: z.string().max(100).nullable(),
  lessonId: z.string().max(100).nullable(),
  formId: z.string().max(100).nullable(),
  level: z.enum(['N', 'H', 'V', 'C']),
  primaryLearningOutcomeId: z.string().max(100).nullable(),
  secondaryLearningOutcomeIds: z.array(z.string().max(100)).max(20),
  alignment: alignmentSchema,
  confidence: z.number().min(0).max(1),
  reasoningSummary: z.string().max(10000),
  evidence: z.array(z.string().max(2000)).max(30),
  independentAnswer: z.string().max(20000),
  answerCheck: z.enum(['correct', 'incorrect', 'uncertain', 'missing']),
  dataCheck: z.enum(['valid', 'ambiguous', 'insufficient', 'contradictory']),
  warnings: z.array(z.string().max(2000)).max(50),
  alternativeClassifications: z
    .array(
      z.object({
        classificationCode: z.string().max(100),
        reason: z.string().max(2000),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(3),
});
export type ClassificationResult = z.infer<typeof classificationResultSchema>;

export const CLASSIFICATION_SYSTEM_PROMPT = `Bạn là chuyên gia thẩm định câu hỏi Toán theo Chương trình GDPT 2018 của Bộ GD&ĐT Việt Nam. Hãy đọc toàn bộ câu hỏi, đáp án, lời giải và ngữ cảnh cây chương trình được cung cấp; tự giải độc lập trước khi phân loại. Yêu cầu cần đạt là chuẩn gốc, SGK Kết nối tri thức chỉ dùng để ánh xạ chương/bài. Không phân loại mức độ chỉ bằng từ khóa. Chỉ dùng ID nút và YCCD có trong ngữ cảnh. Nếu thiếu dữ liệu hoặc không khớp, phải trả insufficient_data/out_of_scope và giảm confidence. Không tạo yêu cầu cần đạt hoặc mã phân môn mới.`;
