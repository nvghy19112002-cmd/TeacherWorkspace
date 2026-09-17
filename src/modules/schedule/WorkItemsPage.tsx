import { useState } from 'react';
import { Search, MapPin, Plus, Pencil, Archive, ArchiveRestore, CalendarDays } from 'lucide-react';
import { useWorkspace } from '../../app/store';
import { useUi } from '../../app/ui';
import { useMutation } from '../../components/feedback';
import { AddWorkButton } from '../../layouts/AppShell';
import { CATEGORIES } from './domain/model';
import { itemColor } from './domain/colors';
import { prettyDate, WEEKDAYS } from '../../core/time';
import { EmptyState } from '../../components/EmptyState';
export default function WorkItemsPage() {
  const data = useWorkspace((s) => s.data);
  const open = useUi((s) => s.openWork);
  const mutate = useMutation();
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const items = data.workItems.filter(
    (w) =>
      w.workspaceId === data.settings.activeWorkspaceId &&
      (showArchived || !w.archived) &&
      `${w.title} ${w.location}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORK COLLECTION</div>
          <h1>Công việc của anh.</h1>
          <p>Quản lý lớp học và thêm nhiều khung giờ cho cùng một công việc.</p>
        </div>
        <AddWorkButton />
      </div>
      <div className="collection-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder="Tìm lớp, công việc, địa điểm…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="checkbox-inline">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Hiện công việc lưu trữ
        </label>
      </div>
      {items.length ? (
        <div className="work-grid">
          {items.map((item) => {
            const rules = data.rules.filter((r) => r.workItemId === item.id && r.active);
            return (
              <article className="work-card" key={item.id}>
                <div className="work-card-top">
                  <span
                    className="work-color"
                    style={{ background: itemColor(item, data.settings.colorMode) }}
                  >
                    <CalendarDays size={22} />
                  </span>
                  <span className="badge">{CATEGORIES[item.category]}</span>
                  <button
                    className="icon-button"
                    aria-label={`Sửa ${item.title}`}
                    onClick={() => open({ metadataId: item.id })}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
                <h2>{item.title}</h2>
                <p className="work-location">
                  <MapPin size={14} />
                  {item.location || 'Chưa có địa điểm'}
                </p>
                {item.description && <p className="work-description">{item.description}</p>}
                <div className="rule-list">
                  {rules.length ? (
                    rules.map((r) => (
                      <div key={r.id}>
                        <strong>
                          {r.recurrenceType === 'once'
                            ? prettyDate(r.startDate)
                            : r.weekdays.map((d) => WEEKDAYS[d].replace('Thứ ', 'T')).join(' · ')}
                        </strong>
                        <span>
                          {r.startTime} – {r.endTime}
                        </span>
                        <small>
                          {r.recurrenceType === 'weekly'
                            ? `${r.intervalWeeks === 1 ? 'Hằng tuần' : `Mỗi ${r.intervalWeeks} tuần`} · ${prettyDate(r.startDate)}${r.endDate ? ` → ${prettyDate(r.endDate)}` : ' → không giới hạn'}`
                            : 'Một ca độc lập'}
                        </small>
                      </div>
                    ))
                  ) : (
                    <p className="muted">Chưa có quy luật đang hoạt động.</p>
                  )}
                </div>
                <div className="work-card-footer">
                  <button
                    className="button ghost small"
                    disabled={item.archived}
                    onClick={() => open({ workItemId: item.id })}
                  >
                    <Plus size={15} />
                    Thêm khung giờ
                  </button>
                  <button
                    className="icon-button"
                    aria-label={item.archived ? `Khôi phục ${item.title}` : `Lưu trữ ${item.title}`}
                    title={
                      item.archived
                        ? 'Khôi phục'
                        : 'Lưu trữ công việc; các ca và lịch sử vẫn giữ nguyên'
                    }
                    onClick={() =>
                      void mutate(
                        (s) => ({
                          ...s,
                          workItems: s.workItems.map((w) =>
                            w.id === item.id
                              ? { ...w, archived: !w.archived, updatedAt: new Date().toISOString() }
                              : w,
                          ),
                        }),
                        item.archived
                          ? 'Đã khôi phục công việc.'
                          : 'Đã lưu trữ công việc. Các ca và lịch sử vẫn giữ nguyên.',
                      )
                    }
                  >
                    {item.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Mỗi lớp học, một công việc"
          description="Thêm lớp một lần rồi chọn những ngày và khung giờ anh dạy."
          action={() => open()}
        />
      )}
    </>
  );
}
