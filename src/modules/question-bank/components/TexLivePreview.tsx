import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { Modal } from '../../../components/Modal';
import { isDesktop } from '../../../database/driver';
import { errorText } from '../../../app/store';
import {
  DEFAULT_TEX_PREVIEW_SETTINGS,
  diagnoseTexLog,
  prepareTexPreview,
  prepareTexPreviewBatch,
  questionErrorLine,
  type BatchPreviewItem,
  type TexPreviewSettings,
  type TexSupportIssue,
} from '../domain/texPreview';

interface Result {
  success: boolean;
  pdf: number[];
  log: string;
}

export function TexLivePreview({
  source,
  items,
  onClose,
}: {
  source: string;
  items?: BatchPreviewItem[];
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<TexPreviewSettings>(DEFAULT_TEX_PREVIEW_SETTINGS);
  const [ordered, setOrdered] = useState<BatchPreviewItem[]>(items ?? []);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [log, setLog] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [errorItem, setErrorItem] = useState('');
  const [showSource, setShowSource] = useState(false);
  const [issues, setIssues] = useState<TexSupportIssue[]>([]);
  const [declarationDraft, setDeclarationDraft] = useState('');
  const cancelled = useRef(false);
  const autoStarted = useRef(false);
  const bytes = useRef<Uint8Array | null>(null);
  const url = useRef('');
  const highlighted = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let alive = true;
    if (isDesktop)
      void invoke<TexPreviewSettings>('tex_preview_settings')
        .then((value) => {
          if (alive) {
            setSettings(value);
            setReady(true);
          }
        })
        .catch((error) => {
          if (alive) setMessage(errorText(error));
        });
    return () => {
      alive = false;
      cancelled.current = true;
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  useEffect(() => {
    if (showSource) highlighted.current?.scrollIntoView({ block: 'center' });
  }, [showSource, errorLine]);
  const clearPdf = useCallback(() => {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = '';
    bytes.current = null;
    setPdfUrl('');
  }, []);
  function move(index: number, offset: number) {
    if (index + offset < 0 || index + offset >= ordered.length) return;
    clearPdf();
    setOrdered((previous) => {
      const next = [...previous];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
    setMessage('Đã đổi thứ tự. Bấm Biên dịch xem trước để cập nhật PDF.');
  }
  function change(patch: Partial<TexPreviewSettings>) {
    clearPdf();
    setLog('');
    setErrorLine(null);
    setErrorItem('');
    setIssues([]);
    setSettings((s) => ({ ...s, ...patch }));
  }
  async function browse(field: 'executable' | 'preamblePath' | 'projectDir') {
    try {
      const path = await open({
        multiple: false,
        directory: field === 'projectDir',
        filters:
          field === 'projectDir'
            ? undefined
            : [
                {
                  name: field === 'executable' ? 'Trình biên dịch' : 'Khai báo LaTeX',
                  extensions: field === 'executable' ? ['exe'] : ['tex'],
                },
              ],
      });
      if (typeof path === 'string') change({ [field]: path });
    } catch (error) {
      setMessage(errorText(error));
    }
  }
  const compile = useCallback(
    async (currentSettings: TexPreviewSettings = settings) => {
      cancelled.current = false;
      setBusy(true);
      clearPdf();
      setLog('');
      setErrorLine(null);
      setShowSource(false);
      setMessage('Đang chuẩn bị và biên dịch…');
      try {
        const setup = await invoke<string>('tex_preview_read_setup', { settings: currentSettings });
        if (cancelled.current) throw new Error('Đã hủy biên dịch.');
        const options = {
          integrated: currentSettings.mode !== 'project',
          additionalPreamble: currentSettings.additionalPreamble,
        };
        const batch = ordered.length ? prepareTexPreviewBatch(ordered, setup, options) : null;
        const prepared = batch ?? prepareTexPreview(source, setup, options);
        await invoke('tex_preview_save_settings', { settings: currentSettings });
        if (cancelled.current) throw new Error('Đã hủy biên dịch.');
        const result = await invoke<Result>('tex_preview_compile', {
          settings: currentSettings,
          document: prepared.document,
          question: prepared.question,
        });
        setLog(result.log);
        if (!result.success) {
          const diagnosed = diagnoseTexLog(result.log);
          setIssues(diagnosed);
          if (diagnosed.length)
            setDeclarationDraft(
              diagnosed
                .map((item) => item.suggestion)
                .filter((value, index, rows) => rows.indexOf(value) === index)
                .join('\n'),
            );
          const line = questionErrorLine(result.log, prepared.sourceLineOffset);
          if (batch && line) {
            const range = batch.ranges.find(
              (item) => line >= item.firstLine && line <= item.lastLine,
            );
            setErrorItem(
              range
                ? `Lỗi ở ${range.label}, dòng ${line - range.firstLine + 1}.`
                : 'Kiểm tra nhật ký biên dịch.',
            );
          } else {
            setErrorLine(line);
          }
          setMessage(
            diagnosed.length
              ? 'Phát hiện khai báo hoặc gói còn thiếu. Kiểm tra gợi ý bên dưới.'
              : 'Biên dịch chưa thành công. Xem nhật ký để biết file và dòng lỗi.',
          );
          return;
        }
        bytes.current = new Uint8Array(result.pdf);
        url.current = URL.createObjectURL(
          new Blob([new Uint8Array(result.pdf)], { type: 'application/pdf' }),
        );
        setPdfUrl(url.current);
        setMessage(
          `Đã biên dịch ${ordered.length || 1} câu theo thứ tự đã chọn. Có thể lưu PDF bên dưới.`,
        );
      } catch (error) {
        setMessage(errorText(error));
      } finally {
        setBusy(false);
      }
    },
    [clearPdf, ordered, settings, source],
  );
  useEffect(() => {
    if (ready && !autoStarted.current) {
      autoStarted.current = true;
      void compile();
    }
  }, [compile, ready]);
  async function saveDeclarationAndRetry() {
    const addition = declarationDraft.trim();
    if (!addition) return;
    const next = {
      ...settings,
      additionalPreamble: [settings.additionalPreamble.trim(), addition].filter(Boolean).join('\n'),
    };
    try {
      await invoke('tex_preview_save_settings', { settings: next });
      setSettings(next);
      setIssues([]);
      setDeclarationDraft('');
      setMessage('Đã lưu khai báo bổ sung. Bấm Biên dịch lại để kiểm tra.');
    } catch (error) {
      setMessage(errorText(error));
    }
  }
  async function savePdf() {
    if (!bytes.current) return;
    try {
      const path = await save({
        defaultPath: 'xem-truoc-cau-hoi.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (path) await writeFile(path, bytes.current);
    } catch (error) {
      setMessage(errorText(error));
    }
  }
  return (
    <Modal
      title={items?.length ? `Xem trước ${items.length} câu` : 'Xem trước bằng TeX Live'}
      subtitle="Tự dùng TeX Live và bộ khai báo tích hợp; giữ nguyên mã nguồn câu hỏi."
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <div className="modal-body qb-tex-live">
        {!isDesktop ? (
          <p>Chức năng này dùng trong ứng dụng Windows để truy cập TeX Live trên máy.</p>
        ) : (
          <>
            <details open={!pdfUrl && settings.mode !== 'integrated'}>
              <summary>Thiết lập nâng cao</summary>
              <label className="field">
                Trình biên dịch
                <select
                  disabled={busy}
                  value={settings.engine}
                  onChange={(e) => change({ engine: e.target.value, executable: '' })}
                >
                  <option value="pdflatex">pdfLaTeX</option>
                  <option value="xelatex">XeLaTeX</option>
                  <option value="lualatex">LuaLaTeX</option>
                </select>
              </label>
              <label className="field">
                Bộ khai báo
                <select
                  disabled={busy}
                  value={settings.mode}
                  onChange={(e) => change({ mode: e.target.value as TexPreviewSettings['mode'] })}
                >
                  <option value="integrated">Tích hợp trong ứng dụng</option>
                  <option value="hybrid">Tích hợp + main.tex của tôi</option>
                  <option value="project">Chỉ dùng main.tex của tôi</option>
                </select>
              </label>
              {(['executable', 'preamblePath', 'projectDir'] as const).map((field) => (
                <div className="qb-tex-path" key={field}>
                  <label className="field">
                    {field === 'executable'
                      ? 'File biên dịch (để trống để tự tìm)'
                      : field === 'preamblePath'
                        ? 'main.tex hoặc file khai báo (không bắt buộc)'
                        : 'Thư mục gốc project chứa setting và ảnh'}
                    <input
                      value={settings[field]}
                      disabled={busy}
                      onChange={(e) => change({ [field]: e.target.value })}
                    />
                  </label>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void browse(field)}
                  >
                    Chọn…
                  </button>
                </div>
              ))}
              <p className="muted">
                App tự tìm TeX Live. Chỉ chọn main.tex/project khi câu hỏi dùng macro, font hoặc ảnh
                riêng; phần trước begin document sẽ được dùng để xem trước.
              </p>
            </details>
            <p className="qb-tex-ready">
              Bộ khai báo:{' '}
              <strong>{settings.mode === 'integrated' ? 'Tích hợp' : settings.mode}</strong> ·
              Engine: <strong>{settings.engine}</strong>
            </p>
            <p role="status">{message}</p>
            {ordered.length ? (
              <details className="qb-batch-order">
                <summary>Thứ tự trong PDF ({ordered.length} câu)</summary>
                <ol>
                  {ordered.map((item, index) => (
                    <li key={item.id}>
                      {item.label}{' '}
                      <button
                        className="button small secondary"
                        disabled={busy || index === 0}
                        onClick={() => move(index, -1)}
                        aria-label={`Đưa ${item.label} lên`}
                      >
                        ↑
                      </button>
                      <button
                        className="button small secondary"
                        disabled={busy || index === ordered.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label={`Đưa ${item.label} xuống`}
                      >
                        ↓
                      </button>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
            {errorItem && <p role="alert">{errorItem}</p>}
            {issues.length > 0 && (
              <section className="qb-tex-diagnostics" role="alert">
                <h3>Cần bổ sung khai báo ({issues.length})</h3>
                {issues.map((issue) => (
                  <p key={`${issue.kind}:${issue.token}`}>{issue.message}</p>
                ))}
                <label className="field">
                  Khai báo bổ sung dùng cho các lần sau
                  <textarea
                    rows={6}
                    value={declarationDraft}
                    onChange={(event) => setDeclarationDraft(event.target.value)}
                  />
                </label>
                <button
                  className="button secondary"
                  disabled={!declarationDraft.trim()}
                  onClick={() => void saveDeclarationAndRetry()}
                >
                  Lưu khai báo bổ sung
                </button>
              </section>
            )}
            {errorLine && (
              <button className="button secondary" onClick={() => setShowSource(true)}>
                Xem dòng {errorLine} của câu hỏi
              </button>
            )}
            {showSource && (
              <pre className="qb-tex-error-source">
                {source.split('\n').map((line, index) => (
                  <span
                    key={index}
                    ref={index + 1 === errorLine ? highlighted : undefined}
                    className={index + 1 === errorLine ? 'error-line' : ''}
                  >
                    {index + 1}: {line}
                    {'\n'}
                  </span>
                ))}
              </pre>
            )}
            {pdfUrl && (
              <iframe className="qb-tex-pdf" title="PDF câu hỏi đã biên dịch" src={pdfUrl} />
            )}
            {log && (
              <details>
                <summary>Nhật ký biên dịch</summary>
                <pre className="qb-tex-log">{log}</pre>
              </details>
            )}
          </>
        )}
      </div>
      <div className="modal-footer">
        {busy ? (
          <button
            className="button secondary"
            onClick={() =>
              void ((cancelled.current = true), invoke('tex_preview_cancel')).catch((e) =>
                setMessage(errorText(e)),
              )
            }
          >
            Hủy biên dịch
          </button>
        ) : (
          <button className="button secondary" onClick={onClose}>
            Đóng
          </button>
        )}
        {pdfUrl && (
          <button className="button secondary" onClick={() => void savePdf()}>
            Lưu PDF
          </button>
        )}
        <button
          className="button primary"
          disabled={!isDesktop || !ready || busy}
          onClick={() => void compile()}
        >
          {log && !pdfUrl ? 'Biên dịch lại' : 'Biên dịch xem trước'}
        </button>
      </div>
    </Modal>
  );
}
