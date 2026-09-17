import { daysBetween, monday, weekday } from '../../../core/time';
import type { ScheduleRule } from './model';

/** Pure recurrence predicate shared by validation and range expansion. */
export function ruleOccursOn(rule: ScheduleRule, date: string): boolean {
  if (!rule.active || date < rule.startDate || (rule.endDate && date > rule.endDate)) return false;
  if (rule.recurrenceType === 'once') return date === rule.startDate;
  return (
    rule.weekdays.includes(weekday(date)) &&
    (((daysBetween(monday(date), monday(rule.anchorDate)) / 7) % rule.intervalWeeks) +
      rule.intervalWeeks) %
      rule.intervalWeeks ===
      0
  );
}
