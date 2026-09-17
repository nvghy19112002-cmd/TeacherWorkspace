import { z } from 'zod';

export const KINDS = {
  latex_repair: 'Sửa LaTeX',
  exam_review: 'Phản biện đề',
  solution_verify: 'Kiểm tra lời giải',
  ex_test: 'Chuẩn hóa ex_test',
} as const;
export const kindSchema = z.enum(['latex_repair', 'exam_review', 'solution_verify', 'ex_test']);
export type PromptKind = z.infer<typeof kindSchema>;
export const promptSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(100),
  kind: kindSchema,
  systemPrompt: z.string().trim().min(1).max(8000),
  userTemplate: z.string().trim().min(1).max(8000),
  updatedAt: z.string().datetime(),
});
export type Prompt = z.infer<typeof promptSchema>;
export const issueSchema = z.object({
  severity: z.enum(['P0', 'P1', 'P2']),
  line: z.number().int().min(1).nullable(),
  message: z.string().max(2000),
  suggestion: z.string().max(4000),
});
export const reportSchema = z.object({
  summary: z.string().max(8000),
  issues: z.array(issueSchema).max(150),
  uncertainty: z.array(z.string().max(2000)).max(40),
  correctedLatex: z.string().max(60000).nullable(),
});
export type Report = z.infer<typeof reportSchema>;
export const historySchema = z.object({
  id: z.string().max(100),
  createdAt: z.string().datetime(),
  title: z.string().max(120),
  mode: kindSchema,
  provider: z.literal('gemini'),
  model: z.string().max(100),
  inputSummary: z.string().max(200),
  result: reportSchema,
});
export type HistoryEntry = z.infer<typeof historySchema>;
export const modelNameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/, 'Tên model không hợp lệ.');
export const aiStateSchema = z
  .object({
    version: z.literal(1),
    model: z.union([z.literal(''), modelNameSchema]),
    prompts: z.array(promptSchema).max(30),
    history: z.array(historySchema).max(20),
  })
  .strict();
export type AiState = z.infer<typeof aiStateSchema>;
export const emptyAiState = (): AiState => ({ version: 1, model: '', prompts: [], history: [] });
export const MAX_SOURCE = 60000;
export function validateSource(source: string): void {
  if (!source.trim()) throw new Error('Hãy nhập nội dung LaTeX.');
  if (source.length > MAX_SOURCE)
    throw new Error('Tài liệu vượt quá 60.000 ký tự. Hãy chia theo nhóm câu.');
}
export function addHistory(state: AiState, entry: HistoryEntry): AiState {
  const history = [historySchema.parse(entry), ...state.history].slice(0, 20);
  while (JSON.stringify({ ...state, history }).length > 180000 && history.length > 1) history.pop();
  const next = aiStateSchema.parse({ ...state, history });
  if (JSON.stringify(next).length > 190000)
    throw new Error('Kết quả quá lớn để lưu lịch sử. Hãy xuất báo cáo trước.');
  return next;
}
