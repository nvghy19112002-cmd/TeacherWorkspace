import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkLatex, applyFix, fixFractions } from '../src/modules/ai-tools/domain/latexRules';
import { BUILTINS, renderTemplate, validateTemplate } from '../src/modules/ai-tools/domain/prompts';
import {
  addHistory,
  aiStateSchema,
  emptyAiState,
  modelNameSchema,
  validateSource,
  type HistoryEntry,
  type Report,
} from '../src/modules/ai-tools/domain/model';
import {
  geminiProvider,
  httpError,
  parseAiResponse,
} from '../src/modules/ai-tools/services/aiProvider';
import { readKey, storeKey, redact } from '../src/modules/ai-tools/services/credentials';
import { readAiState } from '../src/modules/ai-tools/services/state';
import { parseBackup, serializeBackup } from '../src/services/backup';
import { emptySnapshot } from '../src/modules/schedule/domain/model';
const result: Report = {
  summary: 'Cần đối chiếu đáp án.',
  issues: [],
  uncertainty: ['Chưa biên dịch.'],
  correctedLatex: null,
};
const response = (report = result) => ({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(report) }] } }],
});
const entry = (id: string): HistoryEntry => ({
  id,
  createdAt: '2026-09-08T00:00:00.000Z',
  title: 'Báo cáo',
  mode: 'exam_review',
  provider: 'gemini',
  model: 'test-model',
  inputSummary: '20 ký tự',
  result,
});
afterEach(() => vi.unstubAllGlobals());
describe('LaTeX diagnostics and conservative fixes', () => {
  it('preserves a comment after a linebreak command', () => {
    const source = String.raw`text \\% do not edit \frac{1}{2}`;
    expect(fixFractions(source)).toBe(source);
  });
  it('allows code after an escaped percent but masks literal command names', () => {
    const source = String.raw`50\% $\frac{1}{2}$ \\frac`;
    expect(fixFractions(source)).toBe(String.raw`50\% $\dfrac{1}{2}$ \\frac`);
  });
  it('does not edit an unfinished verbatim environment', () => {
    const source = String.raw`\begin{verbatim}\frac{1}{2}`;
    expect(fixFractions(source)).toBe(source);
  });
  it('preserves valid nested ex_test', () => {
    expect(
      checkLatex(
        String.raw`\begin{ex} $x$ \choice{\True $1$}{$2$}{$3$}{$4$}\loigiai{Đúng.}\end{ex}`,
      ),
    ).toEqual([]);
  });
  it('detects mismatched and unclosed environments', () => {
    const issues = checkLatex('\\begin{ex}\n\\begin{tikzpicture}\n\\end{ex}');
    expect(issues.some((i) => i.severity === 'P0' && i.line === 3)).toBe(true);
    expect(issues.some((i) => i.message.includes('tikzpicture'))).toBe(true);
  });
  it('reports missing solution but does not demand choices for an essay', () => {
    const issues = checkLatex(String.raw`\begin{ex}Giải phương trình.\end{ex}`);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('loigiai');
  });
  it('does not apply single-choice rules to true/false', () => {
    expect(
      checkLatex(String.raw`\begin{ex}\choiceTF{\True a}{\True b}{c}{d}\loigiai{}\end{ex}`),
    ).toEqual([]);
  });
  it('flags ambiguous answer count', () => {
    expect(
      checkLatex(String.raw`\begin{ex}\choice{a}{b}{c}{d}\loigiai{}\end{ex}`)[0].message,
    ).toContain('0');
  });
  it('ignores comments and verbatim fixes', () => {
    const source = '% \\frac{1}{2}\n\\begin{verbatim}\\frac{2}{3}\\end{verbatim}\n$\\frac{3}{4}$';
    expect(fixFractions(source)).toBe(source.replace('$\\frac', '$\\dfrac'));
  });
  it('keeps source offsets after masked comments', () => {
    const issue = checkLatex('% comment\n$\\frac{1}{2}$')[0];
    expect(issue.line).toBe(2);
    expect(issue.start).toBe(11);
  });
  it('rejects a stale quick fix', () => {
    const issue = checkLatex('\\frac{1}{2}')[0];
    expect(() => applyFix('changed source', issue)).toThrow();
  });
  it('is idempotent and never changes decimal literals', () => {
    const source = '$\\frac{0.5}{2}$';
    expect(fixFractions(fixFractions(source))).toBe('$\\dfrac{0.5}{2}$');
  });
  it('checks braces while allowing escaped braces', () => {
    expect(checkLatex(String.raw`$\{x\}$`)).toEqual([]);
    expect(checkLatex('{abc').some((i) => i.severity === 'P0')).toBe(true);
  });
  it('does not claim external images are absent', () => {
    expect(checkLatex(String.raw`\includegraphics{chart.png}`)[0].suggestion).toContain(
      'không thể kết luận',
    );
  });
});
describe('AI schema, templates and bounded local history', () => {
  it('renders known variables once, never expands content inside source', () => {
    expect(renderTemplate('{{source}}', { source: '{{unknown}}' })).toBe('{{unknown}}');
    expect(() => renderTemplate('{{unknown}}', {})).toThrow();
  });
  it('requires source in templates and validates every built-in', () => {
    expect(() => validateTemplate('no input')).toThrow();
    BUILTINS.forEach((p) => expect(() => validateTemplate(p.userTemplate)).not.toThrow());
  });
  it('validates source size and model URL path', () => {
    expect(() => validateSource(' ')).toThrow();
    expect(() => validateSource('a'.repeat(60001))).toThrow();
    expect(() => modelNameSchema.parse('../evil?key=x')).toThrow();
  });
  it('does not overwrite unreadable module state', () => {
    expect(() => readAiState('{')).toThrow();
    expect(() => readAiState('{"version":2}')).toThrow();
    expect(readAiState()).toEqual(emptyAiState());
  });
  it('caps history to 20 most recent reports', () => {
    let state = emptyAiState();
    for (let i = 0; i < 25; i++) state = addHistory(state, entry(String(i)));
    expect(state.history).toHaveLength(20);
    expect(state.history[0].id).toBe('24');
  });
  it('rejects credential properties in module state', () => {
    expect(() => aiStateSchema.parse({ ...emptyAiState(), apiKey: 'secret' })).toThrow();
  });
  it('does not include the separately stored key in backup/history or overwrite it on import', async () => {
    await storeKey('fake-key-test-only');
    const data = emptySnapshot();
    data.settings.moduleState = { aiTools: JSON.stringify(addHistory(emptyAiState(), entry('1'))) };
    const text = serializeBackup(data);
    expect(text).not.toContain('fake-key-test-only');
    expect(parseBackup(text)).toEqual(data);
    expect(await readKey()).toBe('fake-key-test-only');
    await storeKey('');
  });
  it('round trips older backups without an AI state', () => {
    expect(parseBackup(serializeBackup(emptySnapshot()))).toEqual(emptySnapshot());
  });
});
describe('Gemini provider boundaries', () => {
  it('parses a structured report', () => expect(parseAiResponse(response())).toEqual(result));
  it('rejects truncated, blocked and malformed output', () => {
    expect(() => parseAiResponse({ candidates: [{ finishReason: 'MAX_TOKENS' }] })).toThrow();
    expect(() => parseAiResponse({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow();
    expect(() =>
      parseAiResponse({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'not json' }] } }],
      }),
    ).toThrow();
  });
  it('normalizes HTTP errors without reflecting provider bodies', () => {
    expect(httpError(429).message).toContain('hạn mức');
    expect(httpError(403).message).toContain('quyền');
  });
  it('sends key in header only and removes echoed key from results', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(response({ ...result, summary: 'fake-key-test-only' }))),
      );
    vi.stubGlobal('fetch', fetcher);
    const report = await geminiProvider.generate({
      model: 'test-model',
      key: 'fake-key-test-only',
      system: 'test',
      input: 'source',
      signal: new AbortController().signal,
    });
    expect(report.summary).toBe('[REDACTED]');
    expect(fetcher.mock.calls[0][0]).not.toContain('fake-key');
  });
  it('does not call the network without credentials', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(geminiProvider.testConnection('', new AbortController().signal)).rejects.toThrow(
      'API key',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('normalizes network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('secret endpoint')));
    await expect(
      geminiProvider.testConnection('fake-key-test-only', new AbortController().signal),
    ).rejects.toThrow('Kiểm tra mạng');
  });
  it('handles cancellation without revealing raw errors', async () => {
    const abort = new AbortController();
    abort.abort();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('raw')));
    await expect(geminiProvider.testConnection('fake-key-test-only', abort.signal)).rejects.toThrow(
      'hủy',
    );
  });
  it('redacts all occurrences of a credential', () =>
    expect(redact('x SECRET SECRET', 'SECRET')).toBe('x [REDACTED] [REDACTED]'));
});
