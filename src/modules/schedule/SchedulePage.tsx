import { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Plus,
  List,
} from 'lucide-react';
import { useWorkspace } from '../../app/store';
import { useUi } from '../../app/ui';
import { AddWorkButton } from '../../layouts/AppShell';
import { addDate, prettyDate, today, weekRange, hoursLabel } from '../../core/time';
import { generateOccurrences } from './domain/recurrence';
import { findConflicts } from './domain/conflicts';
import { countShifts } from '../statistics/statistics';
import { WeekCalendar } from './components/WeekCalendar';
import { STATUS } from './domain/model';
import { EmptyState } from '../../components/EmptyState';
export default function SchedulePage() {
  const data = useWorkspace((s) => s.data);
  const focusDate = useUi((s) => s.focusDate);
  const setDate = useUi((s) => s.setDate);
  const open = useUi((s) => s.openWork);
  const openOccurrence = useUi((s) => s.openOccurrence);
  const exportImage = useUi((s) => s.setExport);
  const [itemFilter, setItemFilter] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [view, setView] = useState<'week' | 'list'>('week');
  const range = useMemo(() => weekRange(focusDate), [focusDate]);
  const workspaceId = data.settings.activeWorkspaceId;
  const items = useMemo(
    () => data.workItems.filter((w) => w.workspaceId === workspaceId),
    [data.workItems, workspaceId],
  );
  const events = useMemo(
    () => (workspaceId ? generateOccurrences(data, workspaceId, range) : []),
    [data, workspaceId, range],
  );
  const shown = useMemo(
    () =>
      events.filter(
        (o) =>
          (!itemFilter || o.workItemId === itemFilter) &&
          (showInactive || !['cancelled', 'skipped'].includes(o.status)),
      ),
    [events, itemFilter, showInactive],
  );
  const stats = useMemo(
    () => countShifts(itemFilter ? events.filter((o) => o.workItemId === itemFilter) : events),
    [events, itemFilter],
  );
  const conflicts = useMemo(() => findConflicts(shown), [shown]);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SMART SCHEDULE</div>
          <h1>Một tuần thật chủ động.</h1>
          <p>Mỗi ca dạy đều có chỗ. Mỗi ngày đều rõ ràng.</p>
        </div>
        <div className="page-actions">
          <button
            className="button secondary"
            onClick={() => exportImage(true)}
            disabled={!workspaceId}
          >
            <ArrowDownToLine size={17} />
            Xuất ảnh
          </button>
          <AddWorkButton />
        </div>
      </div>
      <div className="stat-strip">
        <div className="stat-tile">
          <span className="stat-icon">
            <CalendarDays size={18} />
          </span>
          <div>
            <span>Tổng ca trong tuần</span>
            <strong>
              {stats.total}
              <small>ca</small>
            </strong>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-icon blue">
            <Clock3 size={18} />
          </span>
          <div>
            <span>Thời gian theo lịch</span>
            <strong>
              {(stats.minutes / 60).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
              <small>giờ</small>
            </strong>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-icon purple">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <span>Đã hoàn thành</span>
            <strong>
              {stats.completed}
              <small>/ {stats.scheduled} ca</small>
            </strong>
          </div>
        </div>
        <div className="stat-tile">
          <span className={`stat-icon ${conflicts.size ? 'orange' : ''}`}>
            <AlertTriangle size={18} />
          </span>
          <div>
            <span>Ca bị trùng giờ</span>
            <strong>
              {conflicts.size}
              <small>{conflicts.size ? 'cần xem lại' : 'lịch thoáng'}</small>
            </strong>
          </div>
        </div>
      </div>
      {!workspaceId ? (
        <EmptyState
          title="Bắt đầu một thời khóa biểu mới"
          description="Tạo không gian để quản lý lịch ở trường, trung tâm hoặc lớp dạy thêm."
          label="Tạo thời khóa biểu"
          action={() => useUi.getState().setWorkspaceManager(true)}
        />
      ) : (
        <section className="calendar-card">
          <div className="calendar-toolbar">
            <div className="week-navigation">
              <h2>
                {prettyDate(range.start)} <span>—</span> {prettyDate(range.end)}
              </h2>
              <div className="arrow-group">
                <button
                  aria-label="Tuần trước"
                  className="icon-button"
                  onClick={() => setDate(addDate(focusDate, -7))}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  aria-label="Tuần sau"
                  className="icon-button"
                  onClick={() => setDate(addDate(focusDate, 7))}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              <button className="button secondary small" onClick={() => setDate(today())}>
                Tuần này
              </button>
              <input
                className="date-jump"
                type="date"
                aria-label="Chuyển đến ngày"
                value={focusDate}
                min="1900-01-01"
                max="2100-12-31"
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
              />
            </div>
            <div className="segmented">
              <button className={view === 'week' ? 'selected' : ''} onClick={() => setView('week')}>
                <CalendarDays size={15} />
                Tuần
              </button>
              <button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}>
                <List size={15} />
                Danh sách
              </button>
            </div>
          </div>
          <div className="calendar-filters">
            <div className="filter-group">
              <SlidersHorizontal size={15} />
              <select
                aria-label="Lọc công việc"
                value={itemFilter}
                onChange={(e) => setItemFilter(e.target.value)}
              >
                <option value="">Tất cả công việc</option>
                {items.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                Hiện ca nghỉ / hủy
              </label>
            </div>
            <span className="muted">
              {shown.length} ca · {hoursLabel(stats.minutes)}
            </span>
          </div>
          {!events.length && (
            <div className="empty-calendar-hint">
              <span>
                <strong>Tuần này còn trống.</strong> Thêm lớp học bằng mẫu{' '}
                <code>10A1 | 2 4 6 | 17:45-19:15</code>
              </span>
              <button className="button ghost small" onClick={() => open()}>
                <Plus size={15} />
                Bắt đầu
              </button>
            </div>
          )}
          {view === 'week' ? (
            <WeekCalendar
              start={range.start}
              events={shown}
              items={items}
              settings={data.settings}
            />
          ) : (
            <div className="agenda-list">
              {shown.length ? (
                shown.map((o) => (
                  <button
                    className="agenda-row"
                    key={o.id}
                    onClick={() => openOccurrence({ occurrence: o })}
                  >
                    <span className="agenda-date">{prettyDate(o.date)}</span>
                    <strong>
                      {o.startTime}–{o.endTime}
                    </strong>
                    <span>{items.find((w) => w.id === o.workItemId)?.title}</span>
                    <span className="muted">
                      {items.find((w) => w.id === o.workItemId)?.location}
                    </span>
                    <span className={`badge ${o.status}`}>{STATUS[o.status].short}</span>
                    {conflicts.has(o.id) && <AlertTriangle size={16} className="danger-text" />}
                  </button>
                ))
              ) : (
                <EmptyState
                  title="Không có ca phù hợp"
                  description="Thử chọn tuần khác hoặc thay đổi bộ lọc."
                />
              )}
            </div>
          )}
          <div className="calendar-footer">
            <span>Nhấp đúp ô trống để thêm · Kéo ca để đổi giờ · Kéo cạnh để đổi thời lượng</span>
            <span>Snap {data.settings.snapMinutes} phút</span>
          </div>
        </section>
      )}
    </>
  );
}
