import { timeMinutes } from '../../../core/time';
import type { ScheduleOccurrence } from './model';
export const occupiesTime = (o: ScheduleOccurrence) =>
  o.status !== 'cancelled' && o.status !== 'skipped';
export function overlaps(a: ScheduleOccurrence, b: ScheduleOccurrence): boolean {
  return (
    a.id !== b.id &&
    a.date === b.date &&
    occupiesTime(a) &&
    occupiesTime(b) &&
    a.startTime < b.endTime &&
    b.startTime < a.endTime
  );
}
export function findConflicts(events: ScheduleOccurrence[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const sorted = [...events]
    .filter(occupiesTime)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].date !== sorted[i].date || sorted[j].startTime >= sorted[i].endTime) break;
      if (overlaps(sorted[i], sorted[j])) {
        result.set(sorted[i].id, [...(result.get(sorted[i].id) ?? []), sorted[j].id]);
        result.set(sorted[j].id, [...(result.get(sorted[j].id) ?? []), sorted[i].id]);
      }
    }
  }
  return result;
}
export interface PlacedOccurrence {
  occurrence: ScheduleOccurrence;
  column: number;
  columns: number;
}
/** Interval partitioning: all blocks in a connected overlap group get equal columns. */
export function layoutDay(events: ScheduleOccurrence[]): PlacedOccurrence[] {
  const sorted = [...events].sort(
    (a, b) => a.startTime.localeCompare(b.startTime) || b.endTime.localeCompare(a.endTime),
  );
  const result: PlacedOccurrence[] = [];
  let group: PlacedOccurrence[] = [];
  let ends: number[] = [];
  let maxEnd = -1;
  const flush = () => {
    result.push(...group.map((x) => ({ ...x, columns: ends.length })));
    group = [];
    ends = [];
  };
  for (const event of sorted) {
    const start = timeMinutes(event.startTime);
    const end = timeMinutes(event.endTime);
    if (start >= maxEnd && group.length) flush();
    let column = ends.findIndex((x) => x <= start);
    if (column < 0) {
      column = ends.length;
      ends.push(end);
    } else ends[column] = end;
    group.push({ occurrence: event, column, columns: 1 });
    maxEnd = group.length === 1 ? end : Math.max(maxEnd, end);
  }
  flush();
  return result;
}
