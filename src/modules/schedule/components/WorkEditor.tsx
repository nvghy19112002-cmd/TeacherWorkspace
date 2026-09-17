import { useMemo, useState, type FormEvent } from 'react';
import { WandSparkles, Clock3, MapPin, Info } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { useMutation, useToasts } from '../../../components/feedback';
import { useWorkspace, errorText } from '../../../app/store';
import { useUi, type WorkEditorRequest } from '../../../app/ui';
import {
  addDate,
  duration,
  minuteTime,
  timeMinutes,
  today,
  weekday,
  WEEKDAYS,
} from '../../../core/time';
import { addWork, updateWork, type WorkDraft } from '../domain/commands';
import { CATEGORIES, snapshotSchema, type WorkItem } from '../domain/model';
import { PALETTE } from '../domain/colors';
import { parseQuickEntry } from '../domain/quickEntry';
import { generateOccurrences } from '../domain/recurrence';
import { findConflicts } from '../domain/conflicts';
const DURATIONS = [
  { name: 'Dạy 45 phút', minutes: 45 },
  { name: 'Dạy 90 phút', minutes: 90 },
  { name: 'Dạy 120 phút', minutes: 120 },
  { name: 'Họp · 60 phút', minutes: 60 },
  { name: 'Cá nhân · 30 phút', minutes: 30 },
];
export function WorkEditor({ request }: { request: WorkEditorRequest }) {
  const data = useWorkspace((s) => s.data);
  const busy = useWorkspace((s) => s.busy);
  const close = useUi((s) => s.closeWork);
  const mutate = useMutation();
  const push = useToasts((s) => s.push);
  const item = data.workItems.find((w) => w.id === (request.metadataId ?? request.workItemId));
  const initialDate = request.date ?? today();
  const initialStart = request.startTime ?? '17:45';
  const [draft, setDraft] = useState<WorkDraft>({
    title: item?.title ?? '',
    description: item?.description ?? '',
    category: item?.category ?? 'teaching',
    location: item?.location ?? '',
    color: item?.color ?? PALETTE[0],
    weekdays: request.date ? [weekday(request.date)] : [0, 2, 4],
    startTime: initialStart,
    endTime: minuteTime(Math.min(timeMinutes(initialStart) + 90, 1439)),
    startDate: initialDate,
    endDate: null,
    recurrenceType: request.date ? 'once' : 'weekly',
    intervalWeeks: 1,
  });
  const [quick, setQuick] = useState('');
  const [error, setError] = useState('');
  const [preset, setPreset] = useState(90);
  const patch = (p: Partial<WorkDraft>) => setDraft((d) => ({ ...d, ...p }));
  const minutes = useMemo(() => {
    try {
      return duration(draft.startTime, draft.endTime);
    } catch {
      return 0;
    }
  }, [draft.startTime, draft.endTime]);
  const parse = () => {
    try {
      patch({ ...parseQuickEntry(quick), recurrenceType: 'weekly' });
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  };
  const changeStart = (value: string) => {
    try {
      patch({ startTime: value, endTime: minuteTime(Math.min(timeMinutes(value) + preset, 1439)) });
    } catch {
      patch({ startTime: value });
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (!data.settings.activeWorkspaceId) throw new Error('Hãy tạo thời khóa biểu trước.');
      const next = request.metadataId
        ? updateWork(data, request.metadataId, { ...draft, archived: item?.archived ?? false })
        : addWork(data, data.settings.activeWorkspaceId, draft, request.workItemId);
      snapshotSchema.parse(next);
      if (
        await mutate(
          () => next,
          request.metadataId ? 'Đã cập nhật công việc.' : 'Đã thêm công việc vào thời khóa biểu.',
        )
      ) {
        if (!request.metadataId) {
          const events = generateOccurrences(next, data.settings.activeWorkspaceId, {
            start: draft.startDate,
            end: addDate(draft.startDate, 55),
          });
          const newRule = next.rules[next.rules.length - 1];
          const conflicts = findConflicts(events);
          if (events.some((o) => o.ruleId === newRule.id && conflicts.has(o.id)))
            push(
              'Đã lưu. Có ca trùng giờ trong 8 tuần đầu; các ca được đánh dấu trên lịch.',
              'info',
            );
          useUi.getState().setDate(draft.startDate);
        }
        close();
      }
    } catch (e) {
      setError(errorText(e));
    }
  };
  return (
    <Modal
      title={
        request.metadataId
          ? 'Sửa công việc'
          : request.workItemId
            ? 'Thêm lịch cho công việc'
            : 'Thêm công việc'
      }
      subtitle={
        request.metadataId
          ? 'Tên, màu và ghi chú áp dụng cho mọi ca của công việc.'
          : 'Một công việc, nhiều buổi học. Lịch sẽ tự sắp xếp cho anh.'
      }
      onClose={close}
      wide
    >
      <form
        onSubmit={(e) => void submit(e)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            e.currentTarget.requestSubmit();
          }
        }}
      >
        <div className="modal-body">
          {!request.metadataId && !request.workItemId && (
            <div className="quick-entry">
              <label htmlFor="quick">
                <WandSparkles size={16} />
                Nhập nhanh
              </label>
              <div className="input-with-action">
                <input
                  id="quick"
                  value={quick}
                  onChange={(e) => setQuick(e.target.value)}
                  placeholder="10A1 | 2 4 6 | 17:45-19:15"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      parse();
                    }
                  }}
                />
                <button className="button secondary small" type="button" onClick={parse}>
                  Điền vào form
                </button>
              </div>
              <small>Dùng 2–7 cho thứ trong tuần; CN cho Chủ nhật.</small>
            </div>
          )}
          <div className="form-grid">
            <label className="field span-2">
              Tên công việc
              <input
                required
                maxLength={120}
                value={draft.title}
                disabled={!!request.workItemId}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Ví dụ: Lớp 10A1"
                autoFocus
              />
            </label>
            <label className="field">
              Nhóm công việc
              <select
                value={draft.category}
                disabled={!!request.workItemId}
                onChange={(e) => patch({ category: e.target.value as WorkItem['category'] })}
              >
                {Object.entries(CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                <MapPin size={14} /> Địa điểm
              </span>
              <input
                maxLength={150}
                value={draft.location}
                disabled={!!request.workItemId}
                onChange={(e) => patch({ location: e.target.value })}
                placeholder="Phòng học, trung tâm…"
              />
            </label>
            {!request.metadataId && (
              <>
                <label className="field">
                  Lặp lại
                  <select
                    value={draft.recurrenceType}
                    onChange={(e) =>
                      patch({ recurrenceType: e.target.value as WorkDraft['recurrenceType'] })
                    }
                  >
                    <option value="weekly">Hằng tuần</option>
                    <option value="once">Một lần</option>
                  </select>
                </label>
                {draft.recurrenceType === 'weekly' ? (
                  <label className="field">
                    Cách mỗi (tuần)
                    <input
                      type="number"
                      min={1}
                      max={52}
                      required
                      value={draft.intervalWeeks}
                      onChange={(e) => patch({ intervalWeeks: Number(e.target.value) })}
                    />
                  </label>
                ) : (
                  <div />
                )}
                {draft.recurrenceType === 'weekly' && (
                  <div className="field span-2">
                    <span>Các ngày trong tuần</span>
                    <div className="weekday-selector">
                      {WEEKDAYS.map((day, i) => (
                        <button
                          key={day}
                          aria-label={day}
                          type="button"
                          aria-pressed={draft.weekdays.includes(i)}
                          className={draft.weekdays.includes(i) ? 'selected' : ''}
                          onClick={() =>
                            patch({
                              weekdays: draft.weekdays.includes(i)
                                ? draft.weekdays.filter((x) => x !== i)
                                : [...draft.weekdays, i].sort(),
                            })
                          }
                        >
                          {i === 6 ? 'CN' : `T${i + 2}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="field span-2">
                  <span>Thời lượng gợi ý</span>
                  <div className="preset-row">
                    {DURATIONS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className={`chip ${preset === p.minutes ? 'selected' : ''}`}
                        onClick={() => {
                          setPreset(p.minutes);
                          try {
                            patch({
                              endTime: minuteTime(
                                Math.min(timeMinutes(draft.startTime) + p.minutes, 1439),
                              ),
                            });
                          } catch {
                            /* Wait until a valid start time is entered. */
                          }
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="field">
                  Giờ bắt đầu
                  <input
                    type="time"
                    step={60}
                    required
                    value={draft.startTime}
                    onChange={(e) => changeStart(e.target.value)}
                  />
                </label>
                <label className="field">
                  Giờ kết thúc
                  <input
                    type="time"
                    step={60}
                    required
                    value={draft.endTime}
                    onChange={(e) => patch({ endTime: e.target.value })}
                  />
                </label>
                <label className="field">
                  {draft.recurrenceType === 'once' ? 'Ngày thực hiện' : 'Ngày bắt đầu'}
                  <input
                    type="date"
                    required
                    min="1900-01-01"
                    max="2100-12-31"
                    value={draft.startDate}
                    onChange={(e) =>
                      patch({
                        startDate: e.target.value,
                        weekdays:
                          draft.recurrenceType === 'once' && e.target.value
                            ? [weekday(e.target.value)]
                            : draft.weekdays,
                      })
                    }
                  />
                </label>
                {draft.recurrenceType === 'weekly' && (
                  <label className="field">
                    Ngày kết thúc · để trống nếu không giới hạn
                    <input
                      type="date"
                      min={draft.startDate}
                      max="2100-12-31"
                      value={draft.endDate ?? ''}
                      onChange={(e) => patch({ endDate: e.target.value || null })}
                    />
                  </label>
                )}
              </>
            )}
            {!request.workItemId && (
              <>
                <div className="field span-2">
                  <span>
                    Màu tùy chỉnh <small>Áp dụng khi chọn chế độ màu “Custom” trong Cài đặt</small>
                  </span>
                  <div className="color-picker">
                    {PALETTE.map((c) => (
                      <button
                        type="button"
                        key={c}
                        aria-label={`Màu ${c}`}
                        aria-pressed={draft.color === c}
                        style={{ background: c }}
                        className={draft.color === c ? 'selected' : ''}
                        onClick={() => patch({ color: c })}
                      />
                    ))}
                    <input
                      aria-label="Chọn màu khác"
                      type="color"
                      value={draft.color}
                      onChange={(e) => patch({ color: e.target.value })}
                    />
                  </div>
                </div>
                <label className="field span-2">
                  Ghi chú
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={draft.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    placeholder="Nội dung, tài liệu cần chuẩn bị…"
                  />
                </label>
              </>
            )}
          </div>
          {!request.metadataId && (
            <div className="form-summary">
              <Clock3 size={16} />
              {minutes > 0 ? `${minutes} phút / ca` : 'Hãy nhập giờ hợp lệ'}
              <span>·</span>
              {draft.recurrenceType === 'weekly'
                ? `${draft.weekdays.length} ca / ${draft.intervalWeeks} tuần`
                : 'Một ca riêng'}
            </div>
          )}
          {error && (
            <div className="inline-error" role="alert">
              <Info size={17} />
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <span>Ctrl + S để lưu</span>
          <button className="button secondary" type="button" onClick={close}>
            Đóng
          </button>
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu công việc'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
