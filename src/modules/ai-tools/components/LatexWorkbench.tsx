import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, Undo2, Upload, WandSparkles, Square } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { useToasts } from '../../../components/feedback';
import { errorText } from '../../../app/store';
import { saveFile } from '../../../services/files';
import { checkLatex, applyFix, fixFractions } from '../domain/latexRules';
import { addHistory, MAX_SOURCE, validateSource, type AiState } from '../domain/model';
import { BUILTINS, renderTemplate, validateTemplate } from '../domain/prompts';
import { geminiProvider } from '../services/aiProvider';
import { readPreferredKey, redact } from '../services/credentials';
import { saveAiState } from '../services/state';
import { useAiSession } from '../session';
import { ReportView } from './ReportView';
export function LatexWorkbench({ state, review }: { state: AiState; review: boolean }) {
  const session = useAiSession();
  const { source, report, reviewedSource, setSource } = session;
  const issues = useMemo(() => checkLatex(source), [source]);
  const [confirm, setConfirm] = useState<'send' | 'apply' | 'clear' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const toast = useToasts((s) => s.push);
  const prompts = [...BUILTINS, ...state.prompts];
  const prompt = prompts.find((p) => p.id === session.promptId) ?? BUILTINS[0];
  useEffect(() => () => controller.current?.abort(), []);
  async function action(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }
  function goLine(line: number) {
    const position = source
      .split('\n')
      .slice(0, line - 1)
      .reduce((n, s) => n + s.length + 1, 0);
    editor.current?.focus();
    editor.current?.setSelectionRange(
      position,
      source.indexOf('\n', position) < 0 ? source.length : source.indexOf('\n', position),
    );
    if (editor.current) editor.current.scrollTop = Math.max(0, (line - 4) * 22);
  }
  async function generate() {
    setConfirm(null);
    setBusy(true);
    setError('');
    controller.current = new AbortController();
    const signal = controller.current.signal;
    try {
      validateSource(source);
      validateTemplate(prompt.userTemplate);
      const { key } = await readPreferredKey();
      const input = renderTemplate(prompt.userTemplate, {
        source,
        grade: session.grade,
        chapter: session.chapter,
        target: session.target,
        rules: session.rules,
      });
      const result = await geminiProvider.generate({
        model: state.model,
        key,
        system: prompt.systemPrompt,
        input,
        signal,
      });
      if (signal.aborted) return;
      useAiSession.setState({ report: result, reviewedSource: source });
      try {
        await saveAiState((s) =>
          addHistory(s, {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            title: `${prompt.name} • Lớp ${session.grade}`.slice(0, 120),
            mode: prompt.kind,
            provider: 'gemini',
            model: state.model,
            inputSummary: redact(`${source.length} ký tự • Chương ${session.chapter}`, key).slice(
              0,
              200,
            ),
            result,
          }),
        );
        toast('Đã nhận và lưu báo cáo.');
      } catch {
        setError(
          'Đã nhận kết quả nhưng chưa lưu được lịch sử. Hãy xuất báo cáo trước khi đóng ứng dụng.',
        );
      }
    } catch (e) {
      if (!signal.aborted) setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="ai-toolbar">
        <button className="button" disabled={busy} onClick={() => upload.current?.click()}>
          <Upload size={16} />
          Mở .tex
        </button>
        <input
          hidden
          ref={upload}
          type="file"
          accept=".tex,text/plain"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            void action(async () => {
              if (file.size > 240000 || !file.name.toLowerCase().endsWith('.tex'))
                throw new Error('Chọn tệp .tex dưới 240 KB.');
              const text = await file.text();
              validateSource(text);
              setSource(text);
            });
          }}
        />
        <button
          className="icon-button"
          title="Sao chép LaTeX"
          aria-label="Sao chép LaTeX"
          disabled={!source}
          onClick={() =>
            void action(async () => {
              await navigator.clipboard.writeText(source);
              toast('Đã sao chép.');
            })
          }
        >
          <Copy size={17} />
        </button>
        <button
          className="icon-button"
          title="Xuất LaTeX"
          aria-label="Xuất LaTeX"
          disabled={!source}
          onClick={() =>
            void action(() =>
              saveFile('document.tex', new TextEncoder().encode(source), 'application/x-tex'),
            )
          }
        >
          <Download size={17} />
        </button>
        <button
          className="icon-button"
          title="Hoàn tác thay đổi gần nhất"
          aria-label="Hoàn tác thay đổi gần nhất"
          disabled={busy || session.previous === null}
          onClick={session.undo}
        >
          <Undo2 size={17} />
        </button>
        <button className="button" disabled={busy || !source} onClick={() => setConfirm('clear')}>
          Xóa nội dung
        </button>
        <span>{source.length.toLocaleString('vi-VN')} / 60.000 ký tự</span>
      </div>
      {review && (
        <div className="ai-review-config">
          <label>
            Prompt
            <select
              value={prompt.id}
              disabled={busy}
              onChange={(e) => useAiSession.setState({ promptId: e.target.value })}
            >
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lớp
            <select
              value={session.grade}
              disabled={busy}
              onChange={(e) => useAiSession.setState({ grade: e.target.value })}
            >
              {['10', '11', '12'].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label>
            Chương
            <input
              value={session.chapter}
              disabled={busy}
              maxLength={200}
              onChange={(e) => useAiSession.setState({ chapter: e.target.value })}
            />
          </label>
          <label>
            Mục tiêu và độ khó
            <input
              value={session.target}
              disabled={busy}
              maxLength={500}
              onChange={(e) => useAiSession.setState({ target: e.target.value })}
            />
          </label>
          <label className="ai-full">
            Quy tắc riêng
            <textarea
              rows={2}
              value={session.rules}
              disabled={busy}
              maxLength={4000}
              onChange={(e) => useAiSession.setState({ rules: e.target.value })}
            />
          </label>
        </div>
      )}
      <div className="ai-columns">
        <div className="ai-editor">
          <label htmlFor="latex-source">Tài liệu LaTeX</label>
          <textarea
            id="latex-source"
            ref={editor}
            value={source}
            spellCheck={false}
            maxLength={MAX_SOURCE}
            disabled={busy}
            onChange={(e) => setSource(e.target.value)}
            placeholder="\\begin{ex}…\\end{ex}"
          />
          <div className="ai-toolbar">
            <button
              className="button"
              disabled={busy || !issues.some((i) => i.replacement)}
              onClick={() => setSource(fixFractions(source))}
            >
              <WandSparkles size={16} />
              Đổi frac sang dfrac
            </button>
            {review && (
              <button
                className="button primary"
                disabled={busy || !source.trim() || !state.model}
                onClick={() => setConfirm('send')}
              >
                Phản biện bằng AI
              </button>
            )}
            {review && (
              <button
                className="button"
                disabled={busy || !source.trim()}
                onClick={() =>
                  void action(async () => {
                    validateTemplate(prompt.userTemplate);
                    const text = `${prompt.systemPrompt}\n\n${renderTemplate(prompt.userTemplate, { source, grade: session.grade, chapter: session.chapter, target: session.target, rules: session.rules })}`;
                    await navigator.clipboard.writeText(text);
                    toast('Đã sao chép prompt và tài liệu.');
                  })
                }
              >
                <Copy size={16} />
                Sao chép prompt đầy đủ
              </button>
            )}
            {busy && (
              <button
                className="button"
                onClick={() => {
                  controller.current?.abort();
                  setError('Đã hủy yêu cầu.');
                }}
              >
                <Square size={16} />
                Hủy
              </button>
            )}
          </div>
          {review && !state.model && <p>Chọn model trong tab Provider trước khi chạy AI.</p>}
        </div>
        <div className="ai-results" aria-live="polite">
          <h3>Kiểm tra offline • {issues.length} mục</h3>
          {!source ? (
            <p>Chưa có tài liệu.</p>
          ) : !issues.length ? (
            <p>
              Chưa phát hiện vấn đề theo các quy tắc hiện có. Chưa biên dịch hoặc xác minh toán học.
            </p>
          ) : (
            issues.map((issue) => (
              <article className="ai-issue" key={issue.id}>
                <span className={`ai-severity ${issue.severity}`}>{issue.severity}</span>
                <button className="button" onClick={() => goLine(issue.line!)}>
                  Dòng {issue.line}
                </button>
                <strong>{issue.message}</strong>
                <p>{issue.suggestion}</p>
                {issue.replacement && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => setSource(applyFix(source, issue))}
                  >
                    Áp dụng
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      </div>
      {busy && <p role="status">Đang chờ AI phản biện…</p>}
      {error && (
        <p className="ai-error" role="alert">
          {error}
        </p>
      )}
      {report && (
        <>
          <div className="ai-toolbar">
            <h2>Báo cáo AI</h2>
            <button
              className="button"
              onClick={() =>
                void action(() =>
                  saveFile(
                    'ai-report.json',
                    new TextEncoder().encode(JSON.stringify(report, null, 2)),
                    'application/json',
                  ),
                )
              }
            >
              <Download size={16} />
              Xuất báo cáo
            </button>
            {report.correctedLatex && (
              <button
                className="button"
                disabled={busy || source !== reviewedSource}
                onClick={() => setConfirm('apply')}
              >
                Xem bản sửa
              </button>
            )}
          </div>
          {source !== reviewedSource && (
            <p className="ai-error">
              Tài liệu đã thay đổi. Báo cáo thuộc bản trước; không áp dụng bản sửa cũ.
            </p>
          )}
          <ReportView report={report} onLine={source === reviewedSource ? goLine : undefined} />
        </>
      )}
      {confirm === 'send' && (
        <Modal title="Gửi tài liệu tới Gemini?" onClose={() => setConfirm(null)}>
          <p>
            Sẽ gửi toàn bộ {source.length.toLocaleString('vi-VN')} ký tự, quy tắc riêng và prompt
            đến Google. Model: {state.model}. Có thể phát sinh phí API. Hãy loại bỏ thông tin cá
            nhân không cần thiết trước khi gửi.
          </p>
          <button className="button" onClick={() => setConfirm(null)}>
            Quay lại
          </button>
          <button className="button primary" onClick={() => void generate()}>
            Xác nhận gửi
          </button>
        </Modal>
      )}
      {confirm === 'clear' && (
        <Modal title="Xóa nội dung đang soạn?" onClose={() => setConfirm(null)}>
          <button className="button" onClick={() => setConfirm(null)}>
            Giữ lại
          </button>
          <button
            className="button danger"
            onClick={() => {
              setSource('');
              setConfirm(null);
            }}
          >
            Xóa
          </button>
        </Modal>
      )}
      {confirm === 'apply' && report?.correctedLatex && (
        <Modal wide title="Duyệt bản sửa của AI" onClose={() => setConfirm(null)}>
          <div className="ai-columns">
            <div>
              <h3>Bản gốc</h3>
              <pre>{source}</pre>
            </div>
            <div>
              <h3>Đề xuất AI</h3>
              <pre>{report.correctedLatex}</pre>
            </div>
          </div>
          <button className="button" onClick={() => setConfirm(null)}>
            Không áp dụng
          </button>
          <button
            className="button primary"
            disabled={source !== reviewedSource}
            onClick={() => {
              setSource(report.correctedLatex!);
              setConfirm(null);
            }}
          >
            Thay thế nội dung
          </button>
        </Modal>
      )}
    </section>
  );
}
