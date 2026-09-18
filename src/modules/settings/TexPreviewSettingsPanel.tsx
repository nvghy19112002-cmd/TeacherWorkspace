import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { CheckCircle2, FileCode2, RefreshCw, TriangleAlert } from 'lucide-react';
import { errorText } from '../../app/store';
import { isDesktop } from '../../database/driver';
import {
  DEFAULT_TEX_PREVIEW_SETTINGS,
  type TexPreviewSettings,
} from '../question-bank/domain/texPreview';

interface DetectionResult {
  available: boolean;
  engine: string;
  executable: string;
  version: string;
}

export function TexPreviewSettingsPanel() {
  const [settings, setSettings] = useState<TexPreviewSettings>(DEFAULT_TEX_PREVIEW_SETTINGS);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;
    void invoke<TexPreviewSettings>('tex_preview_settings')
      .then((value) => {
        setSettings(value);
        return invoke<DetectionResult>('tex_preview_detect', { settings: value });
      })
      .then(setDetection)
      .catch((error) => setMessage(errorText(error)));
  }, []);

  async function detect(next = settings) {
    setBusy(true);
    try {
      setDetection(await invoke<DetectionResult>('tex_preview_detect', { settings: next }));
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await invoke('tex_preview_save_settings', { settings });
      setMessage('Đã lưu cấu hình xem trước LaTeX.');
      await detect(settings);
    } catch (error) {
      setMessage(errorText(error));
      setBusy(false);
    }
  }

  async function browse(field: 'executable' | 'preamblePath' | 'projectDir') {
    try {
      const value = await open({
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
      if (typeof value === 'string')
        setSettings((current) => ({
          ...current,
          [field]: value,
          ...(field === 'preamblePath' && !current.projectDir
            ? { projectDir: value.replace(/[\\/][^\\/]+$/, '') }
            : {}),
        }));
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  return (
    <section className="panel tex-system-settings">
      <h2>
        <FileCode2 size={20} /> TeX Live và xem trước câu hỏi
      </h2>
      {!isDesktop ? (
        <p>Cấu hình này khả dụng trong ứng dụng Windows.</p>
      ) : (
        <>
          <div className={`tex-detection ${detection?.available ? 'ok' : 'warning'}`}>
            {detection?.available ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}
            <div>
              <strong>
                {detection?.available
                  ? `Đã tìm thấy ${detection.engine}`
                  : 'Chưa tìm thấy trình biên dịch'}
              </strong>
              <small>{detection?.version || detection?.executable || 'Đang kiểm tra…'}</small>
            </div>
            <button className="icon-button" disabled={busy} onClick={() => void detect()}>
              <RefreshCw size={17} />
            </button>
          </div>
          <div className="settings-fields">
            <label className="field">
              Trình biên dịch ưu tiên
              <select
                value={settings.engine}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    engine: event.target.value,
                    executable: '',
                  }))
                }
              >
                <option value="pdflatex">pdfLaTeX</option>
                <option value="xelatex">XeLaTeX</option>
                <option value="lualatex">LuaLaTeX</option>
              </select>
            </label>
            <label className="field">
              Bộ khai báo
              <select
                value={settings.mode}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    mode: event.target.value as TexPreviewSettings['mode'],
                  }))
                }
              >
                <option value="integrated">Tích hợp trong ứng dụng · khuyên dùng</option>
                <option value="hybrid">Tích hợp + main.tex của tôi</option>
                <option value="project">Chỉ main.tex của tôi</option>
              </select>
              <small>
                Bộ tích hợp hỗ trợ ex_test, TikZ, PGFPlots, tkz-euclide, tkz-tab và các macro phổ
                biến. Gói chỉ được nạp khi TeX Live có sẵn.
              </small>
            </label>
            <div className="tex-settings-path">
              <label className="field">
                File trình biên dịch · để trống để tự tìm
                <input
                  value={settings.executable}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, executable: event.target.value }))
                  }
                />
              </label>
              <button className="button secondary" onClick={() => void browse('executable')}>
                Chọn…
              </button>
            </div>
            {settings.mode !== 'integrated' && (
              <>
                <div className="tex-settings-path">
                  <label className="field">
                    main.tex hoặc file khai báo
                    <input
                      value={settings.preamblePath}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          preamblePath: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button className="button secondary" onClick={() => void browse('preamblePath')}>
                    Chọn…
                  </button>
                </div>
                <div className="tex-settings-path">
                  <label className="field">
                    Thư mục project chứa ảnh và setting
                    <input
                      value={settings.projectDir}
                      onChange={(event) =>
                        setSettings((current) => ({ ...current, projectDir: event.target.value }))
                      }
                    />
                  </label>
                  <button className="button secondary" onClick={() => void browse('projectDir')}>
                    Chọn…
                  </button>
                </div>
              </>
            )}
            <label className="field">
              Khai báo bổ sung
              <textarea
                rows={8}
                spellCheck={false}
                placeholder={'Ví dụ: \\usepackage{...}\n\\newcommand{\\lenhrieng}[1]{...}'}
                value={settings.additionalPreamble}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    additionalPreamble: event.target.value,
                  }))
                }
              />
              <small>
                Không nhập documentclass hoặc begin/end document. Nội dung này chỉ dùng khi xem
                trước, không sửa mã câu hỏi.
              </small>
            </label>
          </div>
          {message && <p role="status">{message}</p>}
          <button className="button primary" disabled={busy} onClick={() => void save()}>
            Lưu và kiểm tra TeX Live
          </button>
        </>
      )}
    </section>
  );
}
