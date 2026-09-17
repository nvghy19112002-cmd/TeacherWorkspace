import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Image, Printer } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { useWorkspace, errorText } from '../../../app/store';
import { useUi } from '../../../app/ui';
import { useToasts } from '../../../components/feedback';
import { weekRange } from '../../../core/time';
import { generateOccurrences } from '../domain/recurrence';
import {
  DEFAULT_EXPORT,
  EXPORT_PRESETS,
  renderScheduleImages,
  canvasPng,
  type ExportOptions,
  type ExportPage,
} from '../services/exportImage';
import { saveFile } from '../../../services/files';
const TOGGLES: {
  key: keyof Pick<
    ExportOptions,
    'showTitle' | 'showDates' | 'showTimes' | 'showLocation' | 'showNotes' | 'showTotal'
  >;
  label: string;
}[] = [
  { key: 'showTitle', label: 'Tiêu đề' },
  { key: 'showDates', label: 'Ngày tháng' },
  { key: 'showTimes', label: 'Giờ' },
  { key: 'showLocation', label: 'Địa điểm' },
  { key: 'showNotes', label: 'Ghi chú' },
  { key: 'showTotal', label: 'Tổng số ca / giờ' },
];
export function ExportDialog() {
  const data = useWorkspace((s) => s.data);
  const date = useUi((s) => s.focusDate);
  const close = () => useUi.getState().setExport(false);
  const push = useToasts((s) => s.push);
  const workspace = data.workspaces.find((w) => w.id === data.settings.activeWorkspaceId);
  const [options, setOptions] = useState<ExportOptions>({
    ...DEFAULT_EXPORT,
    title: workspace?.name ?? 'Thời khóa biểu',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const preview = useRef<HTMLDivElement>(null);
  const pages = useRef<ExportPage[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const range = useMemo(() => weekRange(date), [date]);
  const events = useMemo(
    () => (workspace ? generateOccurrences(data, workspace.id, range) : []),
    [data, workspace, range],
  );
  useEffect(() => {
    // Debounce expensive 300 dpi rendering while typing a title.
    const id = setTimeout(() => {
      try {
        pages.current = renderScheduleImages({
          start: range.start,
          events,
          items: data.workItems,
          settings: data.settings,
          options,
        });
        setPageCount(pages.current.length);
        const canvas = pages.current[0].canvas;
        canvas.setAttribute('aria-label', 'Ảnh thời khóa biểu xem trước');
        preview.current?.replaceChildren(canvas);
        setError('');
      } catch (e) {
        setError(errorText(e));
      }
    }, 180);
    return () => clearTimeout(id);
  }, [range, events, data.workItems, data.settings, options]);
  const patch = (value: Partial<ExportOptions>) => setOptions((o) => ({ ...o, ...value }));
  const save = async () => {
    setBusy(true);
    try {
      const rendered = renderScheduleImages({
        start: range.start,
        events,
        items: data.workItems,
        settings: data.settings,
        options,
      });
      let saved = 0;
      for (let i = 0; i < rendered.length; i++) {
        const name = `TeacherWorkspace-${range.start}-${options.preset}${i ? `-chi-tiet-${i}` : ''}.png`;
        if (!(await saveFile(name, await canvasPng(rendered[i].canvas), 'image/png'))) break;
        saved++;
      }
      if (saved) push(`Đã xuất ${saved}/${rendered.length} ảnh PNG.`);
      else push('Đã hủy xuất ảnh.', 'info');
    } catch (e) {
      push(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const preset = EXPORT_PRESETS[options.preset];
  return (
    <Modal
      title="Xuất thời khóa biểu"
      subtitle="Ảnh PNG được vẽ riêng ở đúng kích thước, gắn độ phân giải in 300 dpi."
      onClose={close}
      wide
    >
      <div className="export-layout">
        <div className="export-controls">
          <label className="field">
            Tiêu đề
            <input
              maxLength={150}
              value={options.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <label className="field">
            Kích thước
            <select
              value={options.preset}
              onChange={(e) => patch({ preset: e.target.value as ExportOptions['preset'] })}
            >
              {Object.entries(EXPORT_PRESETS).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.label} · {p.width} × {p.height}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Phong cách
            <select
              value={options.style}
              onChange={(e) => patch({ style: e.target.value as ExportOptions['style'] })}
            >
              <option value="clean">Clean</option>
              <option value="minimal">Minimal</option>
              <option value="dark">Dark</option>
              <option value="print">Print</option>
            </select>
          </label>
          <label className="field">
            Mục đích
            <select
              value={options.medium}
              onChange={(e) => patch({ medium: e.target.value as ExportOptions['medium'] })}
            >
              <option value="screen">Màn hình</option>
              <option value="colorPrint">In màu · nền trắng</option>
              <option value="mono">In trắng đen · nét và mã ca</option>
            </select>
          </label>
          <div className="field">
            <span>Nội dung hiển thị</span>
            <div className="export-toggles">
              {TOGGLES.map((t) => (
                <label key={t.key} className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={options[t.key]}
                    onChange={(e) => patch({ [t.key]: e.target.checked })}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="export-preview-area">
          <div className="export-preview-label">
            <Image size={15} />
            Xem trước{' '}
            <span>
              {preset.width} × {preset.height}
            </span>
          </div>
          <div className="export-preview" ref={preview} />
          <p>
            <Printer size={15} />
            {pageCount > 1
              ? `${pageCount - 1} ảnh chi tiết bổ sung giữ đầy đủ nội dung của các ca quá ngắn hoặc bị chồng.`
              : 'Kích thước ảnh không phụ thuộc màn hình hoặc độ thu phóng.'}
          </p>
        </div>
      </div>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      <div className="modal-footer">
        <span>{events.length} ca · Toàn bộ tuần đang xem</span>
        <button className="button secondary" onClick={close}>
          Đóng
        </button>
        <button className="button primary" disabled={busy || !!error} onClick={() => void save()}>
          <Download size={17} />
          {busy ? 'Đang xuất…' : `Xuất PNG${pageCount > 1 ? ` (${pageCount} ảnh)` : ''}`}
        </button>
      </div>
    </Modal>
  );
}
