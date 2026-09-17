import { addDate, assertRange, type DateRange } from '../../../core/time';
import type { ScheduleException, ScheduleOccurrence, ScheduleRule, Snapshot } from './model';
import { ruleOccursOn } from './predicate';
function occurrence(
  rule: ScheduleRule,
  originalDate: string,
  ex?: ScheduleException,
): ScheduleOccurrence {
  const isMakeup = ex?.kind === 'makeup';
  const kindStatus =
    ex?.kind === 'cancelled'
      ? 'cancelled'
      : ex?.kind === 'skipped'
        ? 'skipped'
        : ex?.kind === 'rescheduled'
          ? 'rescheduled'
          : isMakeup
            ? 'makeup'
            : 'upcoming';
  return {
    id: isMakeup ? `makeup:${ex.id}` : `${rule.id}:${originalDate}`,
    ruleId: rule.id,
    workItemId: rule.workItemId,
    originalDate,
    date: ex?.targetDate ?? originalDate,
    startTime: ex?.startTime ?? rule.startTime,
    endTime: ex?.endTime ?? rule.endTime,
    status: ex?.status ?? kindStatus,
    isMakeup,
    exceptionId: ex?.id ?? null,
    note: ex?.note ?? '',
  };
}
/** Expand only the requested range. Include exceptions moved INTO it from any origin. */
export function generateOccurrences(
  data: Snapshot,
  workspaceId: string,
  range: DateRange,
): ScheduleOccurrence[] {
  assertRange(range);
  const items = new Set(
    data.workItems.filter((w) => w.workspaceId === workspaceId).map((w) => w.id),
  );
  const rules = data.rules.filter((r) => r.active && items.has(r.workItemId));
  const byRule = new Map<string, ScheduleException[]>();
  for (const ex of data.exceptions) {
    const list = byRule.get(ex.ruleId);
    if (list) list.push(ex);
    else byRule.set(ex.ruleId, [ex]);
  }
  const output = new Map<string, ScheduleOccurrence>();
  const add = (o: ScheduleOccurrence) => {
    if (o.date >= range.start && o.date <= range.end) output.set(o.id, o);
  };
  for (const rule of rules) {
    const exceptions = byRule.get(rule.id) ?? [];
    const overrides = new Map(
      exceptions.filter((e) => e.kind !== 'makeup').map((e) => [e.originalDate, e]),
    );
    const start = range.start > rule.startDate ? range.start : rule.startDate;
    const end = rule.endDate && rule.endDate < range.end ? rule.endDate : range.end;
    for (let d = start; d <= end; d = addDate(d, 1))
      if (ruleOccursOn(rule, d) && !overrides.get(d)?.deleted)
        add(occurrence(rule, d, overrides.get(d)));
    for (const ex of exceptions) {
      if (!ex.deleted && (ex.kind === 'makeup' || ruleOccursOn(rule, ex.originalDate)))
        add(occurrence(rule, ex.originalDate, ex));
    }
  }
  return [...output.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime) ||
      a.id.localeCompare(b.id),
  );
}
