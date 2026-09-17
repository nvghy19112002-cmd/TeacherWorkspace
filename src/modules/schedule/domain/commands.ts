import { addDate, daysBetween, weekday } from '../../../core/time';
import {
  newId,
  type OccurrenceStatus,
  type ScheduleException,
  type ScheduleOccurrence,
  type ScheduleRule,
  type Snapshot,
  type WorkItem,
} from './model';

export interface WorkDraft {
  title: string;
  description: string;
  category: WorkItem['category'];
  location: string;
  color: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string | null;
  recurrenceType: ScheduleRule['recurrenceType'];
  intervalWeeks: number;
}
export type EditScope = 'one' | 'future' | 'weekdayFuture' | 'all';
export interface OccurrenceEdit {
  date: string;
  startTime: string;
  endTime: string;
}
export function addWork(
  data: Snapshot,
  workspaceId: string,
  draft: WorkDraft,
  existingItemId?: string,
): Snapshot {
  const next = structuredClone(data);
  const now = new Date().toISOString();
  const workItemId = existingItemId ?? newId();
  if (
    existingItemId &&
    !next.workItems.some((w) => w.id === existingItemId && w.workspaceId === workspaceId)
  )
    throw new Error('Không tìm thấy công việc.');
  if (!existingItemId)
    next.workItems.push({
      id: workItemId,
      workspaceId,
      title: draft.title,
      description: draft.description,
      category: draft.category,
      location: draft.location,
      color: draft.color,
      createdAt: now,
      updatedAt: now,
      archived: false,
    });
  const id = newId();
  next.rules.push({
    id,
    seriesId: id,
    workItemId,
    weekdays: [...draft.weekdays],
    startTime: draft.startTime,
    endTime: draft.endTime,
    startDate: draft.startDate,
    endDate: draft.recurrenceType === 'once' ? draft.startDate : draft.endDate,
    anchorDate: draft.startDate,
    recurrenceType: draft.recurrenceType,
    intervalWeeks: draft.intervalWeeks,
    active: true,
  });
  return next;
}
function baseException(o: ScheduleOccurrence): ScheduleException {
  return {
    id: newId(),
    ruleId: o.ruleId,
    originalDate: o.originalDate,
    kind: 'override',
    targetDate: o.date,
    startTime: o.startTime,
    endTime: o.endTime,
    status: o.status,
    note: o.note,
    deleted: false,
  };
}
function upsert(next: Snapshot, occurrence: ScheduleOccurrence, patch: Partial<ScheduleException>) {
  const index = next.exceptions.findIndex((e) =>
    occurrence.isMakeup
      ? e.id === occurrence.exceptionId
      : e.ruleId === occurrence.ruleId &&
        e.originalDate === occurrence.originalDate &&
        e.kind !== 'makeup',
  );
  const current = index < 0 ? baseException(occurrence) : next.exceptions[index];
  const updated = {
    ...current,
    ...patch,
    id: current.id,
    ruleId: current.ruleId,
    originalDate: current.originalDate,
  };
  if (index < 0) next.exceptions.push(updated);
  else next.exceptions[index] = updated;
}
export function markStatus(
  data: Snapshot,
  o: ScheduleOccurrence,
  status: OccurrenceStatus,
): Snapshot {
  const next = structuredClone(data);
  upsert(next, o, {
    status,
    kind: o.isMakeup
      ? 'makeup'
      : status === 'cancelled' || status === 'skipped'
        ? status
        : o.date !== o.originalDate
          ? 'rescheduled'
          : 'override',
    deleted: false,
  });
  return next;
}
export function createMakeup(
  data: Snapshot,
  o: ScheduleOccurrence,
  edit: OccurrenceEdit,
  note = '',
): Snapshot {
  const next = structuredClone(data);
  next.exceptions.push({
    ...baseException(o),
    id: newId(),
    kind: 'makeup',
    targetDate: edit.date,
    startTime: edit.startTime,
    endTime: edit.endTime,
    status: 'makeup',
    note,
  });
  return next;
}
function shiftRule(rule: ScheduleRule, delta: number, edit: OccurrenceEdit): ScheduleRule {
  return {
    ...rule,
    startDate: addDate(rule.startDate, delta),
    endDate: rule.endDate ? addDate(rule.endDate, delta) : null,
    anchorDate: addDate(rule.anchorDate, delta),
    weekdays: [...new Set(rule.weekdays.map((d) => (d + (delta % 7) + 7) % 7))].sort(),
    startTime: edit.startTime,
    endTime: edit.endTime,
  };
}
function reparent(
  ex: ScheduleException,
  from: ScheduleRule,
  to: ScheduleRule,
  delta: number,
): ScheduleException {
  // Exception's effective date/time stay explicit: edits to a series never erase personal overrides.
  return {
    ...ex,
    ruleId: to.id,
    originalDate: addDate(ex.originalDate, delta),
    targetDate: ex.targetDate ?? ex.originalDate,
    startTime: ex.startTime ?? from.startTime,
    endTime: ex.endTime ?? from.endTime,
  };
}
export function editOccurrence(
  data: Snapshot,
  o: ScheduleOccurrence,
  edit: OccurrenceEdit,
  scope: EditScope,
): Snapshot {
  const next = structuredClone(data);
  const source = next.rules.find((r) => r.id === o.ruleId);
  if (!source) throw new Error('Chuỗi lịch không còn tồn tại.');
  if (scope === 'one' || o.isMakeup || source.recurrenceType === 'once') {
    upsert(next, o, {
      targetDate: edit.date,
      startTime: edit.startTime,
      endTime: edit.endTime,
      kind: o.isMakeup ? 'makeup' : edit.date !== o.originalDate ? 'rescheduled' : 'override',
      status: o.isMakeup
        ? o.status === 'completed'
          ? 'completed'
          : 'makeup'
        : o.status === 'completed'
          ? 'completed'
          : edit.date !== o.originalDate
            ? 'rescheduled'
            : 'upcoming',
      deleted: false,
    });
    return next;
  }
  // A drop is relative to the rendered occurrence, including any existing exception.
  const delta = daysBetween(edit.date, o.date);
  const targets = next.rules.filter(
    (r) =>
      r.seriesId === source.seriesId &&
      r.active &&
      (scope === 'all' || !r.endDate || r.endDate >= o.originalDate),
  );
  for (const old of targets) {
    if (scope === 'all') {
      const replacement = shiftRule(old, delta, edit);
      next.rules = next.rules.map((r) => (r.id === old.id ? replacement : r));
      next.exceptions = next.exceptions.map((e) =>
        e.ruleId === old.id ? reparent(e, old, replacement, delta) : e,
      );
      continue;
    }
    const cutoff = old.startDate > o.originalDate ? old.startDate : o.originalDate;
    const selectedDay = weekday(o.originalDate);
    if (scope === 'weekdayFuture' && !old.weekdays.includes(selectedDay)) continue;
    const movingDays = scope === 'weekdayFuture' ? [selectedDay] : old.weekdays;
    const remainingDays = old.weekdays.filter((d) => !movingDays.includes(d));
    const moving = shiftRule(
      { ...old, id: newId(), startDate: cutoff, weekdays: movingDays },
      delta,
      edit,
    );
    const remaining = remainingDays.length
      ? { ...old, id: newId(), startDate: cutoff, weekdays: remainingDays }
      : null;
    const hadPast = cutoff > old.startDate;
    next.rules = next.rules.filter((r) => r.id !== old.id);
    if (hadPast) next.rules.push({ ...old, endDate: addDate(cutoff, -1) });
    next.rules.push(moving);
    if (remaining) next.rules.push(remaining);
    next.exceptions = next.exceptions.map((e) => {
      if (e.ruleId !== old.id || (hadPast && e.originalDate < cutoff)) return e;
      const destination =
        movingDays.includes(weekday(e.originalDate)) || !remaining ? moving : remaining;
      return reparent(e, old, destination, destination.id === moving.id ? delta : 0);
    });
  }
  return next;
}
export function removeOccurrence(
  data: Snapshot,
  o: ScheduleOccurrence,
  scope: 'one' | 'future' | 'all',
): Snapshot {
  const next = structuredClone(data);
  const source = next.rules.find((r) => r.id === o.ruleId);
  if (!source) return next;
  if (scope === 'one' || o.isMakeup) {
    if (o.isMakeup) next.exceptions = next.exceptions.filter((e) => e.id !== o.exceptionId);
    else upsert(next, o, { deleted: true, status: 'skipped', kind: 'skipped' });
    return next;
  }
  const remove = new Set<string>();
  next.rules = next.rules
    .map((r) => {
      if (r.seriesId !== source.seriesId) return r;
      if (scope === 'all' || r.startDate >= o.originalDate) remove.add(r.id);
      else if (!r.endDate || r.endDate >= o.originalDate)
        return { ...r, endDate: addDate(o.originalDate, -1) };
      return r;
    })
    .filter((r) => !remove.has(r.id));
  next.exceptions = next.exceptions.filter(
    (e) =>
      !remove.has(e.ruleId) &&
      !(
        scope === 'future' &&
        data.rules.some((r) => r.id === e.ruleId && r.seriesId === source.seriesId) &&
        e.originalDate >= o.originalDate
      ),
  );
  return next;
}
export function updateWork(
  data: Snapshot,
  id: string,
  patch: Pick<WorkItem, 'title' | 'description' | 'category' | 'location' | 'color' | 'archived'>,
): Snapshot {
  return {
    ...data,
    workItems: data.workItems.map((w) =>
      w.id === id ? { ...w, ...patch, updatedAt: new Date().toISOString() } : w,
    ),
  };
}
