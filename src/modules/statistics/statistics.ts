import { dateKey, duration } from '../../core/time';
import { occupiesTime } from '../schedule/domain/conflicts';
import type { ScheduleOccurrence } from '../schedule/domain/model';
export interface ShiftStats {
  total: number;
  scheduled: number;
  completed: number;
  upcoming: number;
  overdue: number;
  cancelled: number;
  skipped: number;
  rescheduled: number;
  makeup: number;
  minutes: number;
  completedMinutes: number;
}
export function countShifts(events: ScheduleOccurrence[], now = new Date()): ShiftStats {
  const today = dateKey(now);
  const time = `${now.getHours()}`.padStart(2, '0') + ':' + `${now.getMinutes()}`.padStart(2, '0');
  const s: ShiftStats = {
    total: events.length,
    scheduled: 0,
    completed: 0,
    upcoming: 0,
    overdue: 0,
    cancelled: 0,
    skipped: 0,
    rescheduled: 0,
    makeup: 0,
    minutes: 0,
    completedMinutes: 0,
  };
  for (const e of events) {
    if (e.status === 'cancelled') s.cancelled++;
    if (e.status === 'skipped') s.skipped++;
    if (e.isMakeup && occupiesTime(e)) s.makeup++;
    if (e.status === 'rescheduled') s.rescheduled++;
    if (!occupiesTime(e)) continue;
    s.scheduled++;
    s.minutes += duration(e.startTime, e.endTime);
    if (e.status === 'completed') {
      s.completed++;
      s.completedMinutes += duration(e.startTime, e.endTime);
    } else if (e.date > today || (e.date === today && e.startTime >= time)) s.upcoming++;
    else s.overdue++;
  }
  return s;
}
