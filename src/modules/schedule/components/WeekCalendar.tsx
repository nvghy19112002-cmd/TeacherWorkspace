import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import {
  AlertTriangle,
  Check,
  MapPin,
  MoreHorizontal,
  Pencil,
  Copy,
  CalendarClock,
  CheckCircle2,
  Ban,
  Trash2,
} from 'lucide-react';
import {
  addDate,
  shortDate,
  snapMinute,
  timeMinutes,
  minuteTime,
  today,
  weekday,
  WEEKDAYS,
} from '../../../core/time';
import { useUi } from '../../../app/ui';
import { useWorkspace } from '../../../app/store';
import { useMutation } from '../../../components/feedback';
import { addWork, markStatus, type OccurrenceEdit } from '../domain/commands';
import { STATUS, type ScheduleOccurrence, type Settings, type WorkItem } from '../domain/model';
import { findConflicts, layoutDay } from '../domain/conflicts';
import { itemColor, contrastText } from '../domain/colors';
interface Props {
  start: string;
  events: ScheduleOccurrence[];
  items: WorkItem[];
  settings: Settings;
}
interface Gesture {
  o: ScheduleOccurrence;
  mode: 'move' | 'start' | 'end';
  x: number;
  y: number;
  dx: number;
  dy: number;
  edit: OccurrenceEdit;
  moved: boolean;
  dayWidth: number;
}
const EventBlock = memo(function EventBlock({
  o,
  item,
  style,
  conflict,
  color,
  gesture,
  onStart,
  onMove,
  onEnd,
  onOpen,
  onContext,
}: {
  o: ScheduleOccurrence;
  item: WorkItem;
  style: CSSProperties;
  conflict: boolean;
  color: string;
  gesture: Gesture | null;
  onStart: (e: PointerEvent<HTMLDivElement>, mode: Gesture['mode']) => void;
  onMove: (e: PointerEvent<HTMLDivElement>) => void;
  onEnd: (e: PointerEvent<HTMLDivElement>) => void;
  onOpen: () => void;
  onContext: (x: number, y: number) => void;
}) {
  const active = gesture?.o.id === o.id ? gesture : null;
  const minutes = timeMinutes(o.endTime) - timeMinutes(o.startTime);
  const compact = minutes < 35;
  return (
    <div
      role="button"
      tabIndex={0}
      data-event-id={o.id}
      className={`calendar-event ${conflict ? 'conflict' : ''} ${active?.moved ? 'dragging' : ''} status-${o.status} ${compact ? 'compact' : ''}`}
      style={
        {
          ...style,
          '--event-color': color,
          '--event-text': contrastText(color),
          transform: active ? `translate(${active.dx}px,${active.dy}px)` : undefined,
          height:
            active && active.mode !== 'move'
              ? `${(timeMinutes(active.edit.endTime) - timeMinutes(active.edit.startTime)) * (Number(style.height) / minutes)}px`
              : style.height,
        } as CSSProperties
      }
      title={`${item.title}\n${o.startTime} – ${o.endTime}\n${item.location}\n${STATUS[o.status].label}${conflict ? ' · Trùng lịch' : ''}`}
      aria-label={`${item.title}, ${o.startTime} đến ${o.endTime}, ${STATUS[o.status].label}${conflict ? ', trùng lịch' : ''}`}
      onPointerDown={(e) => onStart(e, 'move')}
      onPointerMove={onMove}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
        if (e.key === 'Delete') {
          e.preventDefault();
          useUi.getState().openOccurrence({ occurrence: o, mode: 'delete' });
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onContext(e.clientX, e.clientY);
      }}
    >
      <div
        className="resize-handle top"
        onPointerDown={(e) => {
          e.stopPropagation();
          onStart(e, 'start');
        }}
        title="Kéo để đổi giờ bắt đầu"
      />
      <div className="event-title">
        <strong>{item.title}</strong>
        {conflict ? (
          <AlertTriangle size={13} />
        ) : o.status === 'completed' ? (
          <Check size={14} />
        ) : (
          <button
            className="event-menu-button"
            aria-label={`Tùy chọn ${item.title}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              onContext(r.right, r.bottom);
            }}
          >
            <MoreHorizontal size={15} />
          </button>
        )}
      </div>
      {!compact && (
        <>
          <span className="event-time">
            {active?.edit.startTime ?? o.startTime} – {active?.edit.endTime ?? o.endTime}
          </span>
          {item.location && minutes >= 60 && (
            <span className="event-location">
              <MapPin size={11} />
              {item.location}
            </span>
          )}
          {o.status !== 'upcoming' && minutes >= 75 && (
            <span className="event-status">{STATUS[o.status].short}</span>
          )}
        </>
      )}
      <div
        className="resize-handle bottom"
        onPointerDown={(e) => {
          e.stopPropagation();
          onStart(e, 'end');
        }}
        title="Kéo để đổi giờ kết thúc"
      />
    </div>
  );
});
export const WeekCalendar = memo(function WeekCalendar({ start, events, items, settings }: Props) {
  const open = useUi((s) => s.openOccurrence);
  const add = useUi((s) => s.openWork);
  const mutate = useMutation();
  const data = useWorkspace((s) => s.data);
  const conflicts = useMemo(() => findConflicts(events), [events]);
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const minEvent = events.length
    ? Math.floor(Math.min(...events.map((e) => timeMinutes(e.startTime))) / 60)
    : settings.dayStart;
  const maxEvent = events.length
    ? Math.ceil(Math.max(...events.map((e) => timeMinutes(e.endTime))) / 60)
    : settings.dayEnd;
  const from = Math.min(settings.dayStart, minEvent),
    to = Math.max(settings.dayEnd, maxEvent);
  const px = settings.hourHeight / 60;
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDate(start, i)), [start]);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const current = useRef<Gesture | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ o: ScheduleOccurrence; x: number; y: number } | null>(null);
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', close);
    };
  }, [menu]);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [start]);
  const startGesture = (
    e: PointerEvent<HTMLDivElement>,
    o: ScheduleOccurrence,
    mode: Gesture['mode'],
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const width = (grid.current?.getBoundingClientRect().width ?? 700) / 7;
    const g: Gesture = {
      o,
      mode,
      x: e.clientX,
      y: e.clientY,
      dx: 0,
      dy: 0,
      edit: { date: o.date, startTime: o.startTime, endTime: o.endTime },
      moved: false,
      dayWidth: width,
    };
    current.current = g;
    setGesture(g);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveGesture = (e: PointerEvent<HTMLDivElement>) => {
    const g = current.current;
    if (!g) return;
    if (Math.abs(e.clientX - g.x) + Math.abs(e.clientY - g.y) < 5 && !g.moved) return;
    const originalStart = timeMinutes(g.o.startTime),
      originalEnd = timeMinutes(g.o.endTime),
      delta = (e.clientY - g.y) / px;
    let a = originalStart,
      b = originalEnd,
      date = g.o.date,
      dx = 0;
    if (g.mode === 'move') {
      a = Math.min(1439 - (b - a), Math.max(0, snapMinute(a + delta, settings.snapMinutes)));
      b = a + (originalEnd - originalStart);
      const dayDelta = Math.min(
        6 - weekday(g.o.date),
        Math.max(-weekday(g.o.date), Math.round((e.clientX - g.x) / g.dayWidth)),
      );
      date = addDate(g.o.date, dayDelta);
      dx = dayDelta * g.dayWidth;
    } else if (g.mode === 'start')
      a = Math.max(0, Math.min(b - 1, snapMinute(a + delta, settings.snapMinutes)));
    else b = Math.min(1439, Math.max(a + 1, snapMinute(b + delta, settings.snapMinutes)));
    const updated = {
      ...g,
      moved: true,
      dx,
      dy: (a - originalStart) * px,
      edit: { date, startTime: minuteTime(a), endTime: minuteTime(b) },
    };
    current.current = updated;
    setGesture(updated);
  };
  const endGesture = (e: PointerEvent<HTMLDivElement>) => {
    const g = current.current;
    if (!g) return;
    current.current = null;
    setGesture(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (e.type === 'pointercancel') return;
    if (g.moved) {
      if (
        g.edit.date !== g.o.date ||
        g.edit.startTime !== g.o.startTime ||
        g.edit.endTime !== g.o.endTime
      )
        open({ occurrence: g.o, edit: g.edit });
    } else if (g.mode === 'move') open({ occurrence: g.o });
  };
  const duplicate = async (o: ScheduleOccurrence) => {
    const item = itemMap.get(o.workItemId);
    if (!item || !data.settings.activeWorkspaceId) return;
    await mutate(
      (s) =>
        addWork(
          s,
          item.workspaceId,
          {
            ...item,
            weekdays: [weekday(o.date)],
            startTime: o.startTime,
            endTime: o.endTime,
            startDate: o.date,
            endDate: o.date,
            recurrenceType: 'once',
            intervalWeeks: 1,
          },
          item.id,
        ),
      'Đã tạo ca độc lập cùng giờ. Kéo ca mới để đổi lịch.',
    );
  };
  const nowMinute = clock.getHours() * 60 + clock.getMinutes();
  return (
    <>
      <div className="calendar-scroll" ref={scroll}>
        <div className="calendar-inner">
          <div className="calendar-day-header">
            <div className="timezone-label">GIỜ</div>
            {days.map((day, i) => (
              <div key={day} className={`day-header ${day === today() ? 'today' : ''}`}>
                <span>{WEEKDAYS[i]}</span>
                <strong>{Number(day.slice(-2))}</strong>
                <small>{shortDate(day)}</small>
              </div>
            ))}
          </div>
          <div className="calendar-body">
            <div className="time-axis" style={{ height: (to - from) * settings.hourHeight }}>
              {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((h) => (
                <span key={h} style={{ top: (h - from) * settings.hourHeight }}>
                  {`${h}`.padStart(2, '0')}:00
                </span>
              ))}
            </div>
            <div
              ref={grid}
              className="calendar-grid"
              style={
                {
                  height: (to - from) * settings.hourHeight,
                  '--hour-height': `${settings.hourHeight}px`,
                } as CSSProperties
              }
            >
              {days.map((day) => (
                <div
                  key={day}
                  className={`day-column ${day === today() ? 'today' : ''}`}
                  onDoubleClick={(e) => {
                    if ((e.target as HTMLElement).closest('.calendar-event')) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    const m = Math.min(
                      1438,
                      Math.max(
                        0,
                        snapMinute((e.clientY - r.top) / px + from * 60, settings.snapMinutes),
                      ),
                    );
                    add({ date: day, startTime: minuteTime(m) });
                  }}
                >
                  {layoutDay(events.filter((o) => o.date === day)).map(
                    ({ occurrence: o, column, columns }) => {
                      const item = itemMap.get(o.workItemId);
                      if (!item) return null;
                      return (
                        <EventBlock
                          key={o.id}
                          o={o}
                          item={item}
                          color={itemColor(item, settings.colorMode)}
                          conflict={conflicts.has(o.id)}
                          gesture={gesture}
                          style={{
                            top: (timeMinutes(o.startTime) - from * 60) * px,
                            height: (timeMinutes(o.endTime) - timeMinutes(o.startTime)) * px,
                            left: `calc(${(column / columns) * 100}% + 4px)`,
                            width: `calc(${100 / columns}% - 8px)`,
                            zIndex: gesture?.o.id === o.id ? 20 : 2,
                          }}
                          onStart={(e, mode) => startGesture(e, o, mode)}
                          onMove={moveGesture}
                          onEnd={endGesture}
                          onOpen={() => open({ occurrence: o })}
                          onContext={(x, y) =>
                            setMenu({
                              o,
                              x: Math.min(x, window.innerWidth - 232),
                              y: Math.min(y, window.innerHeight - 320),
                            })
                          }
                        />
                      );
                    },
                  )}
                  {day === today() && nowMinute >= from * 60 && nowMinute < to * 60 && (
                    <div className="now-line" style={{ top: (nowMinute - from * 60) * px }}>
                      <span />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {menu && (
        <div
          className="context-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-title">{itemMap.get(menu.o.workItemId)?.title}</div>
          <button
            role="menuitem"
            onClick={() => {
              open({ occurrence: menu.o });
              setMenu(null);
            }}
          >
            <Pencil size={16} />
            Sửa ca
          </button>
          <button
            role="menuitem"
            onClick={() => {
              void duplicate(menu.o);
              setMenu(null);
            }}
          >
            <Copy size={16} />
            Nhân bản ca
          </button>
          <button
            role="menuitem"
            onClick={() => {
              void mutate((s) => markStatus(s, menu.o, 'completed'), 'Đã đánh dấu hoàn thành.');
              setMenu(null);
            }}
          >
            <CheckCircle2 size={16} />
            Đánh dấu đã dạy
          </button>
          <button
            role="menuitem"
            onClick={() => {
              void mutate((s) => markStatus(s, menu.o, 'cancelled'), 'Đã hủy ca.');
              setMenu(null);
            }}
          >
            <Ban size={16} />
            Hủy ca
          </button>
          <button
            role="menuitem"
            onClick={() => {
              open({ occurrence: menu.o });
              setMenu(null);
            }}
          >
            <CalendarClock size={16} />
            Chuyển ngày / giờ
          </button>
          <button
            role="menuitem"
            onClick={() => {
              open({ occurrence: menu.o, mode: 'makeup' });
              setMenu(null);
            }}
          >
            <Copy size={16} />
            Thêm ca dạy bù
          </button>
          <hr />
          <button
            role="menuitem"
            className="danger-text"
            onClick={() => {
              open({ occurrence: menu.o, mode: 'delete' });
              setMenu(null);
            }}
          >
            <Trash2 size={16} />
            Xóa
          </button>
        </div>
      )}
    </>
  );
});
