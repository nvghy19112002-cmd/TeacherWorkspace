import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { Modal } from '../../../components/Modal';
import { isDesktop } from '../../../database/driver';
import { errorText } from '../../../app/store';
import { prepareTexPreview, questionErrorLine } from '../domain/texPreview';

interface Settings {
  engine: string;
  executable: string;
  preamblePath: string;
  projectDir: string;
}
interface Result {
  success: boolean;
  pdf: number[];
  log: string;
}
const initial: Settings = { engine: 'pdflatex', executable: '', preamblePath: '', projectDir: '' };

export function TexLivePreview({ source, onClose }: { source: string; onClose: () => void }) {
  const [settings, setSettings] = useState(initial);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [log, setLog] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [showSource, setShowSource] = useState(false);
  const cancelled = useRef(false);
  const bytes = useRef<Uint8Array | null>(null);
  const url = useRef('');
  const highlighted = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let alive = true;
    if (isDesktop)
      void invoke<Settings>('tex_preview_settings')
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
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  useEffect(() => {
    if (showSource) highlighted.current?.scrollIntoView({ block: 'center' });
  }, [showSource, errorLine]);
  function clearPdf() {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = '';
    bytes.current = null;
    setPdfUrl('');
  }
  function change(patch: Partial<Settings>) {
    clearPdf();
    setLog('');
    setErrorLine(null);
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
  async function compile() {
    cancelled.current = false;
    setBusy(true);
    clearPdf();
    setLog('');
    setErrorLine(null);
    setShowSource(false);
    setMessage('Đang chuẩn bị và biên dịch…');
    try {
      const setup = await invoke<string>('tex_preview_read_setup', { settings });
      if (cancelled.current) throw new Error('Đã hủy biên dịch.');
      const prepared = prepareTexPreview(source, setup);
      await invoke('tex_preview_save_settings', { settings });
      if (cancelled.current) throw new Error('Đã hủy biên dịch.');
      const result = await invoke<Result>('tex_preview_compile', {
        settings,
        document: prepared.document,
        question: prepared.question,
      });
      setLog(result.log);
      if (!result.success) {
        setErrorLine(questionErrorLine(result.log, prepared.sourceLineOffset));
        setMessage('Biên dịch chưa thành công. Xem nhật ký để biết file và dòng lỗi.');
        return;
      }
      bytes.current = new Uint8Array(result.pdf);
      url.current = URL.createObjectURL(
        new Blob([new Uint8Array(result.pdf)], { type: 'application/pdf' }),
      );
      setPdfUrl(url.current);
      setMessage(
        'Đã biên dịch 2 lượt. Nếu khung PDF không hiển thị trên máy này, dùng Lưu PDF để mở bằng trình đọc PDF.',
      );
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
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
      title="Xem trước bằng TeX Live"
      subtitle="Biên dịch câu đang chọn với bộ khai báo trên máy; giữ nguyên mã nguồn."
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
            <details open={!pdfUrl}>
              <summary>Thiết lập TeX Live và bộ khai báo</summary>
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
              {(['executable', 'preamblePath', 'projectDir'] as const).map((field) => (
                <div className="qb-tex-path" key={field}>
                  <label className="field">
                    {field === 'executable'
                      ? 'File biên dịch (để trống để tự tìm)'
                      : field === 'preamblePath'
                        ? 'main.tex hoặc file khai báo'
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
                Nếu chọn main.tex, chỉ dùng phần trước begin document. Bộ khai báo quyết định cách
                hiện lời giải, font và bố cục như khi anh biên dịch ngoài app. Thư mục project phải
                đúng nơi các đường dẫn ảnh bắt đầu.
              </p>
            </details>
            <p role="status">{message}</p>
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
          Biên dịch xem trước
        </button>
      </div>
    </Modal>
  );
}
