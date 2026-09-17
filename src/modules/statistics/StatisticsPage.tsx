import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  Repeat2,
  Ban,
  Coffee,
  CalendarClock,
} from 'lucide-react';
import { useWorkspace } from '../../app/store';
import { useUi } from '../../app/ui';
import { AddWorkButton } from '../../layouts/AppShell';
import { assertRange, hoursLabel, monthRange, prettyDate, today, weekRange } from '../../core/time';
import { generateOccurrences } from '../schedule/domain/recurrence';
import { STATUS } from '../schedule/domain/model';
import { countShifts } from './statistics';
import { EmptyState } from '../../components/EmptyState';
import { itemColor } from '../schedule/domain/colors';
export default function StatisticsPage({ dashboard = false }: { dashboard?: boolean }) {
  const data = useWorkspace((s) => s.data);
  const focusDate = useUi((s) => s.focusDate);
  const open = useUi((s) => s.openOccurrence);
  const [period, setPeriod] = useState<'week' | 'month' | 'custom'>('week');
  const [itemId, setItemId] = useState('');
  const [custom, setCustom] = useState(weekRange(today()));
  const range = useMemo(
    () =>
      period === 'week'
        ? weekRange(focusDate)
        : period === 'month'
          ? monthRange(focusDate)
          : custom,
    [period, focusDate, custom],
  );
  const items = data.workItems.filter((w) => w.workspaceId === data.settings.activeWorkspaceId);
  const result = useMemo(() => {
    try {
      assertRange(range);
      return {
        events: data.settings.activeWorkspaceId
          ? generateOccurrences(data, data.settings.activeWorkspaceId, range)
          : [],
        error: null,
      };
    } catch (e) {
      return { events: [], error: e instanceof Error ? e.message : 'Khoảng ngày không hợp lệ.' };
    }
  }, [data, range]);
  const events = useMemo(
    () => result.events.filter((o) => !itemId || o.workItemId === itemId),
    [result.events, itemId],
  );
  const stats = useMemo(() => countShifts(events), [events]);
  const byItem = items
    .filter((w) => !itemId || w.id === itemId)
    .map((item) => ({ item, ...countShifts(events.filter((o) => o.workItemId === item.id)) }))
    .filter((r) => r.total)
    .sort((a, b) => b.minutes - a.minutes);
  const cards = [
    { label: 'Tổng ca', value: stats.total, unit: 'ca', icon: CalendarDays },
    { label: 'Đã dạy / hoàn thành', value: stats.completed, unit: 'ca', icon: CheckCircle2 },
    { label: 'Sắp tới', value: stats.upcoming, unit: 'ca', icon: CalendarClock },
    { label: 'Đã hủy', value: stats.cancelled, unit: 'ca', icon: Ban },
    { label: 'Nghỉ buổi', value: stats.skipped, unit: 'ca', icon: Coffee },
    { label: 'Dạy bù', value: stats.makeup, unit: 'ca', icon: Repeat2 },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {dashboard ? 'YOUR WEEK, AT A GLANCE' : 'TEACHING INSIGHTS'}
          </div>
          <h1>{dashboard ? 'Sẵn sàng cho ngày mới.' : 'Thời gian, nhìn rõ hơn.'}</h1>
          <p>
            {dashboard
              ? 'Một góc nhìn gọn gàng về lịch dạy và công việc.'
              : 'Đếm đúng số ca, theo dõi thời lượng và lịch đã thay đổi.'}
          </p>
        </div>
        {dashboard ? (
          <AddWorkButton />
        ) : (
          <span className="badge large">
            <Clock3 size={16} />
            {hoursLabel(stats.completedMinutes)} đã hoàn thành
          </span>
        )}
      </div>
      <div className="report-filters">
        <div className="segmented">
          {(['week', 'month', 'custom'] as const).map((p) => (
            <button key={p} className={period === p ? 'selected' : ''} onClick={() => setPeriod(p)}>
              {p === 'week' ? 'Tuần' : p === 'month' ? 'Tháng' : 'Khoảng ngày'}
            </button>
          ))}
        </div>
        {period === 'custom' ? (
          <div className="date-range-inputs">
            <input
              type="date"
              aria-label="Từ ngày"
              value={custom.start}
              onChange={(e) => setCustom({ ...custom, start: e.target.value })}
            />
            <ArrowRight size={15} />
            <input
              type="date"
              aria-label="Đến ngày"
              value={custom.end}
              onChange={(e) => setCustom({ ...custom, end: e.target.value })}
            />
          </div>
        ) : (
          <input
            type="date"
            aria-label="Ngày tham chiếu thống kê"
            value={focusDate}
            onChange={(e) => {
              if (e.target.value) useUi.getState().setDate(e.target.value);
            }}
          />
        )}
        <select
          aria-label="Thống kê theo công việc"
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
        >
          <option value="">Tất cả công việc</option>
          {items.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title}
            </option>
          ))}
        </select>
      </div>
      {result.error && (
        <div className="inline-error" role="alert">
          {result.error}
        </div>
      )}
      <div className="metrics-grid">
        {cards.map((c) => (
          <div className="metric-card" key={c.label}>
            <c.icon size={19} />
            <span>{c.label}</span>
            <strong>
              {c.value}
              <small>{c.unit}</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="report-columns">
        <section className="panel hours-panel">
          <div className="panel-heading">
            <h2>Thời lượng công việc</h2>
            <span>{hoursLabel(stats.minutes)}</span>
          </div>
          <p className="muted">
            Không tính ca nghỉ hoặc hủy. Ca đổi lịch được tính ở ngày thực hiện.
          </p>
          {byItem.length ? (
            <div className="hours-bars">
              {byItem.map((r) => (
                <div className="hours-row" key={r.item.id}>
                  <div>
                    <strong>{r.item.title}</strong>
                    <span>{hoursLabel(r.minutes)}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      style={{
                        width: `${(r.minutes / Math.max(1, byItem[0].minutes)) * 100}%`,
                        background: itemColor(r.item, data.settings.colorMode),
                      }}
                    />
                  </div>
                  <small>
                    {r.scheduled} ca theo lịch · {r.completed} ca hoàn thành
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có số liệu"
              description="Thống kê tự cập nhật khi anh thêm và đánh dấu các ca."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>{dashboard ? 'Các ca trong khoảng đã chọn' : 'Tóm tắt tiến độ'}</h2>
            {dashboard && (
              <button
                className="icon-button"
                title="Mở thời khóa biểu"
                onClick={() => useUi.getState().navigate('schedule')}
              >
                <ArrowUpRight size={18} />
              </button>
            )}
          </div>
          {dashboard ? (
            <div className="upcoming-list">
              {events
                .filter((o) => o.status !== 'cancelled' && o.status !== 'skipped')
                .slice(0, 8)
                .map((o) => (
                  <button key={o.id} onClick={() => open({ occurrence: o })}>
                    <span className="upcoming-date">
                      {o.date.slice(-2)}
                      <small>thg {Number(o.date.slice(5, 7))}</small>
                    </span>
                    <span>
                      <strong>{items.find((w) => w.id === o.workItemId)?.title}</strong>
                      <small>
                        {o.startTime} – {o.endTime} · {STATUS[o.status].short}
                      </small>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              {!events.length && <p className="muted">Chưa có ca trong khoảng này.</p>}
            </div>
          ) : (
            <div className="progress-summary">
              <strong>
                {stats.scheduled ? Math.round((stats.completed / stats.scheduled) * 100) : 0}
                <small>%</small>
              </strong>
              <p>ca theo lịch đã được xác nhận hoàn thành</p>
              <progress max={Math.max(stats.scheduled, 1)} value={stats.completed} />
              <dl>
                <div>
                  <dt>Thời lượng hoàn thành</dt>
                  <dd>{hoursLabel(stats.completedMinutes)}</dd>
                </div>
                <div>
                  <dt>Ca đổi lịch</dt>
                  <dd>{stats.rescheduled}</dd>
                </div>
                <div>
                  <dt>Ca qua giờ, chưa đánh dấu</dt>
                  <dd>{stats.overdue}</dd>
                </div>
              </dl>
            </div>
          )}
          <div className="report-note">
            Hoàn thành được đánh dấu thủ công. Ca đã qua giờ sẽ không tự động được tính là đã dạy.
          </div>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-heading">
          <h2>Chi tiết theo công việc</h2>
          <span className="muted">
            {!result.error ? `${prettyDate(range.start)} — ${prettyDate(range.end)}` : ''}
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Công việc</th>
                <th>Tổng ca</th>
                <th>Đã dạy</th>
                <th>Sắp tới</th>
                <th>Hủy / nghỉ</th>
                <th>Dạy bù</th>
                <th>Tổng giờ theo lịch</th>
              </tr>
            </thead>
            <tbody>
              {byItem.map((r) => (
                <tr key={r.item.id}>
                  <td>
                    <span
                      className="table-dot"
                      style={{ background: itemColor(r.item, data.settings.colorMode) }}
                    />
                    {r.item.title}
                  </td>
                  <td>{r.total}</td>
                  <td>{r.completed}</td>
                  <td>{r.upcoming}</td>
                  <td>
                    {r.cancelled} / {r.skipped}
                  </td>
                  <td>{r.makeup}</td>
                  <td>{hoursLabel(r.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!byItem.length && <p className="table-empty">Không có ca trong khoảng ngày đã chọn.</p>}
        </div>
      </section>
    </>
  );
}
