import { z } from 'zod';
import { errorText, useWorkspace } from '../../../app/store';
import { readAiState } from '../../ai-tools/services/state';
import { orderedKeys, readKeyPool, saveKeyPool } from '../../ai-tools/domain/keyPool';
import { readKey, redact } from '../../ai-tools/services/credentials';
import { httpError } from '../../ai-tools/services/aiProvider';
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  classificationResultSchema,
  type ClassificationResult,
} from '../domain/classification';
import type { BankSnapshot, Question } from '../domain/model';

const envelopeSchema = z.object({
  candidates: z
    .array(
      z.object({
        finishReason: z.string().optional(),
        content: z
          .object({
            parts: z.array(
              z.object({ text: z.string().optional(), thought: z.boolean().optional() }),
            ),
          })
          .optional(),
      }),
    )
    .optional(),
});

async function callGemini(
  model: string,
  key: string,
  input: string,
  signal: AbortSignal,
): Promise<ClassificationResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: CLASSIFICATION_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: input }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(classificationResultSchema),
        },
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
    },
  );
  if (!response.ok) throw httpError(response.status);
  const raw = await response.text();
  if (raw.length > 2_000_000) throw new Error('Phản hồi AI quá lớn. Hãy thử lại với một câu.');
  const text = redact(raw, key);
  const envelope = envelopeSchema.parse(JSON.parse(text) as unknown);
  const candidate = envelope.candidates?.[0];
  if (!candidate || candidate.finishReason !== 'STOP')
    throw new Error('AI chưa hoàn tất phân loại.');
  const payload =
    candidate.content?.parts
      .filter((part) => !part.thought)
      .map((part) => part.text ?? '')
      .join('') ?? '';
  return classificationResultSchema.parse(JSON.parse(payload) as unknown);
}

function promptInput(snapshot: BankSnapshot, question: Question): string {
  const nodes = snapshot.curriculumNodes
    .filter((node) => !node.archived)
    .map(({ id, parentId, kind, code, name, description }) => ({
      id,
      parentId,
      kind,
      code,
      name,
      description,
    }));
  const outcomes = snapshot.learningOutcomes
    .filter((outcome) => outcome.active)
    .map(({ id, nodeId, code, content, source }) => ({ id, nodeId, code, content, source }));
  return JSON.stringify({
    curriculum: { nodes, learningOutcomes: outcomes },
    question: {
      rawSource: question.rawSource,
      type: question.questionType,
      answer: question.answer,
      solution: question.solution,
    },
    levelRules: {
      N: 'Nhận diện, nhắc lại, thay trực tiếp',
      H: 'Giải thích, biểu diễn, biến đổi hoặc kết nối đơn giản',
      V: 'Lựa chọn và phối hợp kiến thức để giải quyết tình huống',
      C: 'Tình huống mới, nhiều lớp suy luận hoặc yếu tố ẩn',
    },
  });
}

export async function classifyQuestionOnline(
  snapshot: BankSnapshot,
  question: Question,
  signal: AbortSignal,
): Promise<{ result: ClassificationResult; model: string; keyId: string }> {
  const settings = useWorkspace.getState().data.settings;
  const model = readAiState(settings.moduleState?.aiTools).model;
  if (!model) throw new Error('Chưa chọn model Gemini trong Cài đặt → API key.');
  const pool = readKeyPool(settings.moduleState?.aiKeyPool);
  const ordered = orderedKeys(pool);
  const preferred = ordered.find((key) => key.id === pool.activeId) ?? ordered[0];
  const keys = preferred ? [preferred, ...ordered.filter((key) => key.id !== preferred.id)] : [];
  if (!keys.length) throw new Error('Chưa có API key đang bật.');
  let lastError: unknown;
  for (let index = 0; index < keys.length; index += 1) {
    const meta = keys[index];
    try {
      const key = await readKey(meta.id);
      if (!key) throw new Error(`${meta.label}: không đọc được credential.`);
      const result = await callGemini(model, key, promptInput(snapshot, question), signal);
      return { result, model, keyId: meta.id };
    } catch (error) {
      lastError = error;
      const message = errorText(error).toLocaleLowerCase('vi');
      const quota = message.includes('hạn mức') || message.includes('quá nhiều');
      if (!quota || !pool.automatic || index === keys.length - 1) throw error;
      await saveKeyPool((current) => ({
        ...current,
        keys: current.keys.map((item) =>
          item.id === meta.id
            ? { ...item, status: 'quota', lastCheckedAt: new Date().toISOString() }
            : item,
        ),
      }));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Không có API key khả dụng.');
}
