import { afterEach, expect, it, vi } from 'vitest';
import { emptyBankSnapshot } from '../src/modules/question-bank/domain/model';
import { parseExTest, parsedToQuestion } from '../src/modules/question-bank/domain/parser';

vi.mock('../src/app/store', () => ({
  errorText: (error: unknown) => (error instanceof Error ? error.message : String(error)),
  useWorkspace: { getState: () => ({ data: { settings: { moduleState: {} } } }) },
}));
vi.mock('../src/modules/ai-tools/services/state', () => ({
  readAiState: () => ({ model: 'test-model' }),
}));
vi.mock('../src/modules/ai-tools/domain/keyPool', () => ({
  readKeyPool: () => ({ activeId: 'chosen', automatic: false }),
  orderedKeys: () => [
    { id: 'first', label: 'First' },
    { id: 'chosen', label: 'Chosen' },
  ],
  saveKeyPool: vi.fn(),
}));
vi.mock('../src/modules/ai-tools/services/credentials', () => ({
  readKey: async (id: string) => `test-key-${id}`,
  redact: (text: string, key: string) => text.replaceAll(key, '[REDACTED]'),
}));
import { classifyQuestionOnline } from '../src/modules/question-bank/services/classificationProvider';
afterEach(() => vi.unstubAllGlobals());

it('uses the selected API key and leaves the question ID unchanged when AI fails', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 });
  vi.stubGlobal('fetch', fetch);
  const question = parsedToQuestion(parseExTest('\\begin{ex}Q\\end{ex}')[0]);
  const before = JSON.stringify(question);
  await expect(
    classifyQuestionOnline(emptyBankSnapshot(), question, new AbortController().signal),
  ).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key-chosen');
  expect(JSON.stringify(question)).toBe(before);
});

it('returns a suggestion without assigning its proposed code to the source question', async () => {
  const suggestion = {
    proposedClassificationCode: '',
    grade: '10',
    domain: 'D',
    chapterId: null,
    lessonId: null,
    formId: null,
    level: 'N',
    primaryLearningOutcomeId: null,
    secondaryLearningOutcomeIds: [],
    alignment: 'insufficient_data',
    confidence: 0.2,
    reasoningSummary: 'Cây chưa đầy đủ',
    evidence: [],
    independentAnswer: '',
    answerCheck: 'missing',
    dataCheck: 'insufficient',
    warnings: ['Thiếu dạng'],
    alternativeClassifications: [],
  };
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            candidates: [
              { finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(suggestion) }] } },
            ],
          }),
      }),
  );
  const question = parsedToQuestion(parseExTest('\\begin{ex}Q\\end{ex}')[0]);
  const result = await classifyQuestionOnline(
    emptyBankSnapshot(),
    question,
    new AbortController().signal,
  );
  expect(result.result).toEqual(suggestion);
  expect(result.keyId).toBe('chosen');
  expect(question.displayId).toBe('');
  expect(question.gradeNodeId).toBeNull();
});
