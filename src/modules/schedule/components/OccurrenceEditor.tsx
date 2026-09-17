import { useState, type FormEvent } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Ban,
  Coffee,
  RotateCcw,
  Trash2,
  CopyPlus,
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { useMutation } from '../../../components/feedback';
import { useWorkspace, errorText } from '../../../app/store';
import { useUi, type OccurrenceRequest } from '../../../app/ui';
import { prettyDate, validDate, duration, today } from '../../../core/time';
import { STATUS, type OccurrenceStatus } from '../domain/model';
import {
  createMakeup,
  editOccurrence,
  markStatus,
  removeOccurrence,
  type EditScope,
} from '../domain/commands';
const SCOPES: { value: EditScope; label: string; description: string }[] = [
  { value: 'one', label: 'Chỉ ca này', description: 'Lưu ngoại lệ, giữ nguyên quy luật lặp.' },
  {
    value: 'future',
    label: 'Từ ca này trở đi',
    description: 'Áp dụng cho tất cả các thứ trong chuỗi kể từ ca gốc.',
  },
  {
    value: 'weekdayFuture',
    label: 'Tất cả thứ này từ nay',
    description: 'Chỉ đổi thứ của ca gốc từ ngày này; các thứ khác giữ lịch cũ.',
  },
  {
    value: 'all',
    label: 'Toàn bộ lịch',
    description: 'Áp dụng cho cả chuỗi, bao gồm quá khứ. Giữ ngoại lệ đã đặt riêng.',
  },
];
export function OccurrenceEditor({ request }: { request: OccurrenceRequest }) {
  const o = request.occurrence;
  const data = useWorkspace((s) => s.data);
  const busy = useWorkspace((s) => s.busy);
  const close = useUi((s) => s.closeOccurrence);
  const mutate = useMutation();
  const item = data.workItems.find((w) => w.id === o.workItemId);
  const rule = data.rules.find((r) => r.id === o.ruleId);
  const [mode, setMode] = useState(request.mode ?? 'edit');
  const [scope, setScope] = useState<EditScope>('one');
  const [edit, setEdit] = useState(
    request.edit ?? { date: o.date, startTime: o.startTime, endTime: o.endTime },
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const recurring = rule?.recurrenceType === 'weekly' && !o.isMakeup;
  const setStatus = async (status: OccurrenceStatus) => {
    if (
      await mutate(
        (s) => markStatus(s, o, status),
        `Đã đánh dấu: ${STATUS[status].label.toLowerCase()}.`,
      )
    )
      close();
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (
        mode !== 'delete' &&
        (!validDate(edit.date) || duration(edit.startTime, edit.endTime) <= 0)
      )
        throw new Error('Kiểm tra ngày và giờ; ca phải kết thúc sau giờ bắt đầu.');
      const ok = await mutate(
        (s) =>
          mode === 'makeup'
            ? createMakeup(s, o, edit, note)
            : mode === 'delete'
              ? removeOccurrence(s, o, scope === 'weekdayFuture' ? 'future' : scope)
              : editOccurrence(s, o, edit, scope),
        mode === 'makeup'
          ? 'Đã thêm ca dạy bù.'
          : mode === 'delete'
            ? 'Đã xóa ca theo phạm vi đã chọn.'
            : 'Đã cập nhật lịch.',
      );
      if (ok) {
        if (mode !== 'delete') useUi.getState().setDate(edit.date);
        close();
      }
    } catch (e) {
      setError(errorText(e));
    }
  };
  return (
    <Modal
      title={
        mode === 'makeup'
          ? 'Thêm ca dạy bù'
          : mode === 'delete'
            ? 'Xóa lịch'
            : (item?.title ?? 'Chi tiết ca')
      }
      subtitle={`${prettyDate(o.date)} · ${o.startTime} – ${o.endTime} · ${STATUS[o.status].label}`}
      onClose={close}
    >
      <form onSubmit={(e) => void submit(e)}>
        <div className="modal-body">
          {mode === 'edit' && (
            <>
              <div className="occurrence-meta">
                <CalendarClock size={20} />
                <div>
                  <strong>{item?.title}</strong>
                  <span>
                    {item?.location || 'Chưa có địa điểm'}
                    {o.date !== o.originalDate ? ` · Chuyển từ ${prettyDate(o.originalDate)}` : ''}
                  </span>
                </div>
              </div>
              <div className="status-actions">
                <button
                  type="button"
                  className="button secondary small"
                  disabled={busy}
                  onClick={() => void setStatus('completed')}
                >
                  <CheckCircle2 size={15} />
                  Đã dạy
                </button>
                <button
                  type="button"
                  className="button secondary small"
                  disabled={busy}
                  onClick={() => void setStatus('cancelled')}
                >
                  <Ban size={15} />
                  Hủy ca
                </button>
                <button
                  type="button"
                  className="button secondary small"
                  disabled={busy}
                  onClick={() => void setStatus('skipped')}
                >
                  <Coffee size={15} />
                  Nghỉ
                </button>
                <button
                  type="button"
                  className="button ghost small"
                  disabled={busy}
                  onClick={() =>
                    void setStatus(
                      o.isMakeup
                        ? 'makeup'
                        : o.date !== o.originalDate
                          ? 'rescheduled'
                          : 'upcoming',
                    )
                  }
                >
                  <RotateCcw size={14} />
                  Chưa hoàn tất
                </button>
              </div>
            </>
          )}
          {mode !== 'delete' ? (
            <div className="form-grid">
              <label className="field span-2">
                Ngày thực hiện
                <input
                  type="date"
                  min="1900-01-01"
                  max="2100-12-31"
                  required
                  value={edit.date}
                  onChange={(e) => setEdit({ ...edit, date: e.target.value })}
                />
              </label>
              <label className="field">
                Bắt đầu
                <input
                  type="time"
                  required
                  step={60}
                  value={edit.startTime}
                  onChange={(e) => setEdit({ ...edit, startTime: e.target.value })}
                />
              </label>
              <label className="field">
                Kết thúc
                <input
                  type="time"
                  required
                  step={60}
                  value={edit.endTime}
                  onChange={(e) => setEdit({ ...edit, endTime: e.target.value })}
                />
              </label>
              {mode === 'makeup' && (
                <label className="field span-2">
                  Ghi chú dạy bù
                  <textarea
                    maxLength={2000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nội dung hoặc lý do dạy bù"
                  />
                </label>
              )}
            </div>
          ) : (
            <p className="warning-copy">
              Ca đã xóa sẽ không còn xuất hiện trong lịch và thống kê. Hãy chọn “Hủy ca” nếu anh
              muốn giữ lại số liệu hủy.
            </p>
          )}
          {recurring && mode !== 'makeup' && (
            <fieldset className="scope-fieldset">
              <legend>Phạm vi thay đổi</legend>
              {SCOPES.filter((s) => mode !== 'delete' || s.value !== 'weekdayFuture').map((s) => (
                <label
                  key={s.value}
                  className={`scope-option ${scope === s.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={s.value}
                    checked={scope === s.value}
                    onChange={() => setScope(s.value)}
                  />
                  <span>
                    <strong>{s.label}</strong>
                    <small>{s.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {mode === 'makeup' && (
            <div className="form-summary">
              Ca gốc được giữ nguyên. Nếu nghỉ ca gốc, hãy đánh dấu “Nghỉ” riêng.
            </div>
          )}
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {mode === 'edit' && (
            <div className="footer-tools">
              <button
                type="button"
                className="icon-button danger-text"
                title="Xóa lịch"
                aria-label="Xóa lịch"
                onClick={() => {
                  setMode('delete');
                  setScope('one');
                }}
              >
                <Trash2 size={18} />
              </button>
              <button
                type="button"
                className="button ghost small"
                onClick={() => {
                  setMode('makeup');
                  setEdit({ ...edit, date: edit.date < today() ? today() : edit.date });
                }}
              >
                <CopyPlus size={16} />
                Dạy bù
              </button>
            </div>
          )}
          <button type="button" className="button secondary" onClick={close}>
            Đóng
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`button ${mode === 'delete' ? 'danger' : 'primary'}`}
          >
            {busy
              ? 'Đang lưu…'
              : mode === 'delete'
                ? 'Xác nhận xóa'
                : mode === 'makeup'
                  ? 'Thêm ca bù'
                  : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
