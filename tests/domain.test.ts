import { describe, expect, it } from 'vitest';
import {
  addDate,
  assertRange,
  dateKey,
  datesInRange,
  duration,
  minuteTime,
  monthRange,
  snapMinute,
  timeMinutes,
  validDate,
  weekRange,
} from '../src/core/time';
import { duplicateWorkspace, deleteWorkspace } from '../src/core/workspaces';
import { snapshotSchema, type ScheduleOccurrence } from '../src/modules/schedule/domain/model';
import { generateOccurrences } from '../src/modules/schedule/domain/recurrence';
import {
  createMakeup,
  editOccurrence,
  markStatus,
  removeOccurrence,
} from '../src/modules/schedule/domain/commands';
import { findConflicts, layoutDay, overlaps } from '../src/modules/schedule/domain/conflicts';
import { parseQuickEntry } from '../src/modules/schedule/domain/quickEntry';
import { countShifts } from '../src/modules/statistics/statistics';
import { parseBackup, serializeBackup } from '../src/services/backup';
import { contrastText } from '../src/modules/schedule/domain/colors';
import { fixture } from './fixtures';
const range = { start: '2026-09-07', end: '2026-09-13' };
const occurrences = (s = fixture(), r = range) =>
  generateOccurrences(s, s.settings.activeWorkspaceId!, r);
const event = (patch: Partial<ScheduleOccurrence> = {}): ScheduleOccurrence => ({
  ...occurrences()[0],
  ...patch,
});
describe('date and minute arithmetic', () => {
  it('places arbitrary minutes and preserves duration', () => {
    expect(timeMinutes('17:45')).toBe(1065);
    expect(duration('17:45', '19:15')).toBe(90);
    expect(minuteTime(1065)).toBe('17:45');
  });
  it.each(['24:00', '25:10', '10:60', '5:00', '-1:20', ''])('rejects invalid time %s', (t) =>
    expect(() => timeMinutes(t)).toThrow(),
  );
  it('validates leap dates and actual calendar days', () => {
    expect(validDate('2024-02-29')).toBe(true);
    expect(validDate('2025-02-29')).toBe(false);
    expect(validDate('2026-02-30')).toBe(false);
  });
  it('uses local civil dates across month/year boundaries', () => {
    expect(addDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(monthRange('2024-02-10')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(weekRange('2026-09-13')).toEqual(range);
  });
  it('does not shift the day through UTC serialization', () =>
    expect(dateKey(new Date(2026, 8, 7, 0, 5))).toBe('2026-09-07'));
  it('includes both range endpoints', () =>
    expect(datesInRange({ start: '2026-09-07', end: '2026-09-09' })).toHaveLength(3));
  it('rejects inverted and excessive ranges', () => {
    expect(() => assertRange({ start: range.end, end: range.start })).toThrow();
    expect(() => assertRange({ start: '2000-01-01', end: '2090-01-01' })).toThrow();
  });
  it.each([5, 10, 15, 30])('snaps with %i-minute intervals', (n) =>
    expect(snapMinute(1077, n) % n).toBe(0),
  );
});
describe('runtime recurrence', () => {
  it('generates Monday/Wednesday/Friday exactly', () =>
    expect(occurrences().map((o) => o.date)).toEqual(['2026-09-07', '2026-09-09', '2026-09-11']));
  it('respects inclusive start/end dates', () =>
    expect(occurrences(fixture({ startDate: '2026-09-09', endDate: '2026-09-11' }))).toHaveLength(
      2,
    ));
  it('generates a once rule just once', () =>
    expect(
      occurrences(fixture({ recurrenceType: 'once', startDate: '2026-09-10' })).map((o) => o.date),
    ).toEqual(['2026-09-10']));
  it('retains interval phase after the first week', () => {
    const s = fixture({ intervalWeeks: 2 });
    expect(occurrences(s, { start: '2026-09-14', end: '2026-09-20' })).toHaveLength(0);
    expect(occurrences(s, { start: '2026-09-21', end: '2026-09-27' })).toHaveLength(3);
  });
  it('filters workspaces and inactive rules', () => {
    const s = fixture();
    s.rules[0].active = false;
    expect(occurrences(s)).toEqual([]);
    expect(generateOccurrences(fixture(), 'missing', range)).toEqual([]);
  });
  it('does not persist generated occurrences', () => {
    const s = fixture();
    occurrences(s, { start: '2026-09-07', end: '2027-09-07' });
    expect(s.rules).toHaveLength(1);
    expect(s.exceptions).toHaveLength(0);
    expect('occurrences' in s).toBe(false);
  });
});
describe('exceptions and edits', () => {
  it('edits one occurrence without changing the rule', () => {
    const s = fixture(),
      o = occurrences(s)[1];
    const next = editOccurrence(
      s,
      o,
      { date: o.date, startTime: '18:00', endTime: '19:30' },
      'one',
    );
    expect(next.rules).toEqual(s.rules);
    expect(next.exceptions).toHaveLength(1);
    expect(occurrences(next).map((x) => x.startTime)).toEqual(['17:45', '18:00', '17:45']);
  });
  it('reschedules across boundaries and includes an origin outside the query', () => {
    const s = fixture();
    const o = occurrences(s)[0];
    const next = editOccurrence(
      s,
      o,
      { date: '2026-10-01', startTime: '18:00', endTime: '19:30' },
      'one',
    );
    expect(occurrences(next)).toHaveLength(2);
    const moved = occurrences(next, { start: '2026-10-01', end: '2026-10-01' });
    expect(moved).toHaveLength(1);
    expect(moved[0].originalDate).toBe(o.date);
    expect(moved[0].status).toBe('rescheduled');
  });
  it('does not duplicate an in-range exception', () => {
    const s = fixture(),
      o = occurrences(s)[0];
    expect(occurrences(markStatus(s, o, 'completed'))).toHaveLength(3);
  });
  it('supports cancelled, skipped and restoration', () => {
    const s = fixture(),
      o = occurrences(s)[0];
    for (const status of ['cancelled', 'skipped'] as const) {
      const next = markStatus(s, o, status);
      expect(occurrences(next)[0].status).toBe(status);
      expect(countShifts(occurrences(next)).minutes).toBe(180);
      expect(occurrences(markStatus(next, occurrences(next)[0], 'upcoming'))[0].status).toBe(
        'upcoming',
      );
    }
  });
  it('creates additive makeup even after the rule date range', () => {
    const s = fixture({ endDate: '2026-09-07' }),
      o = occurrences(s)[0];
    const next = createMakeup(s, o, { date: '2026-10-01', startTime: '10:00', endTime: '11:30' });
    expect(occurrences(next)).toHaveLength(1);
    expect(occurrences(next, { start: '2026-10-01', end: '2026-10-01' })[0].isMakeup).toBe(true);
  });
  it('keeps completed makeup in both completion and makeup metrics', () => {
    const s = fixture(),
      o = occurrences(s)[0];
    const next = createMakeup(s, o, { date: '2026-09-08', startTime: '10:00', endTime: '11:30' });
    const makeup = occurrences(next).find((x) => x.isMakeup)!;
    const stats = countShifts(occurrences(markStatus(next, makeup, 'completed')));
    expect(stats.total).toBe(4);
    expect(stats.makeup).toBe(1);
    expect(stats.completed).toBe(1);
    expect(stats.minutes).toBe(360);
  });
  it('splits the whole future while preserving history', () => {
    const s = fixture(),
      o = occurrences(s)[1];
    const next = editOccurrence(
      s,
      o,
      { date: o.date, startTime: '18:00', endTime: '19:30' },
      'future',
    );
    expect(snapshotSchema.safeParse(next).success).toBe(true);
    expect(next.rules).toHaveLength(2);
    expect(occurrences(next).map((x) => x.startTime)).toEqual(['17:45', '18:00', '18:00']);
    expect(
      occurrences(next, { start: '2026-09-14', end: '2026-09-20' }).every(
        (x) => x.startTime === '18:00',
      ),
    ).toBe(true);
  });
  it('splits only the selected weekday into the future', () => {
    const s = fixture(),
      o = occurrences(s)[1];
    const next = editOccurrence(
      s,
      o,
      { date: '2026-09-10', startTime: '18:00', endTime: '19:30' },
      'weekdayFuture',
    );
    expect(snapshotSchema.safeParse(next).success).toBe(true);
    expect(occurrences(next).map((x) => [x.date, x.startTime])).toEqual([
      ['2026-09-07', '17:45'],
      ['2026-09-10', '18:00'],
      ['2026-09-11', '17:45'],
    ]);
    expect(
      occurrences(next, { start: '2026-09-14', end: '2026-09-20' }).map((x) => x.date),
    ).toEqual(['2026-09-14', '2026-09-17', '2026-09-18']);
  });
  it('keeps biweekly anchor phase when splitting midweek', () => {
    const s = fixture({ intervalWeeks: 2 }),
      o = occurrences(s)[1];
    const next = editOccurrence(
      s,
      o,
      { date: o.date, startTime: '18:00', endTime: '19:30' },
      'future',
    );
    expect(occurrences(next, { start: '2026-09-14', end: '2026-09-20' })).toHaveLength(0);
    expect(occurrences(next, { start: '2026-09-21', end: '2026-09-27' })).toHaveLength(3);
  });
  it('reparents existing future exceptions on split', () => {
    let s = fixture();
    s = markStatus(s, occurrences(s)[2], 'cancelled');
    const next = editOccurrence(
      s,
      occurrences(s)[1],
      { date: '2026-09-09', startTime: '18:00', endTime: '19:30' },
      'future',
    );
    expect(snapshotSchema.safeParse(next).success).toBe(true);
    const friday = occurrences(next).find((o) => o.date === '2026-09-11')!;
    expect(friday.status).toBe('cancelled');
    expect(friday.startTime).toBe('17:45');
    expect(next.exceptions[0].ruleId).not.toBe(s.rules[0].id);
  });
  it('all-series edit covers previously split segments but keeps explicit overrides', () => {
    let s = fixture();
    s = editOccurrence(
      s,
      occurrences(s)[1],
      { date: '2026-09-09', startTime: '18:00', endTime: '19:30' },
      'future',
    );
    s = markStatus(s, occurrences(s)[2], 'completed');
    const next = editOccurrence(
      s,
      occurrences(s)[0],
      { date: '2026-09-07', startTime: '16:00', endTime: '17:00' },
      'all',
    );
    expect(next.rules.every((r) => r.startTime === '16:00')).toBe(true);
    expect(occurrences(next)[2].startTime).toBe('18:00');
  });
  it('shifts all series dates and exception anchors while preserving absolute exception times', () => {
    let s = fixture();
    s = markStatus(s, occurrences(s)[1], 'completed');
    const next = editOccurrence(
      s,
      occurrences(s)[0],
      { date: '2026-09-08', startTime: '18:00', endTime: '19:00' },
      'all',
    );
    expect(snapshotSchema.safeParse(next).success).toBe(true);
    expect(occurrences(next).map((o) => o.date)).toEqual([
      '2026-09-08',
      '2026-09-09',
      '2026-09-12',
    ]);
  });
  it('deletes only one occurrence with a tombstone', () => {
    const s = fixture(),
      o = occurrences(s)[0];
    const next = removeOccurrence(s, o, 'one');
    expect(next.rules).toEqual(s.rules);
    expect(next.exceptions[0].deleted).toBe(true);
    expect(occurrences(next)).toHaveLength(2);
  });
  it('deletes future or all segments and related exceptions', () => {
    const s = fixture();
    expect(occurrences(removeOccurrence(s, occurrences(s)[1], 'future'))).toHaveLength(1);
    const all = removeOccurrence(s, occurrences(s)[0], 'all');
    expect(all.rules).toHaveLength(0);
    expect(all.exceptions).toHaveLength(0);
  });
});
describe('overlap and layout', () => {
  it('detects half-open intervals and ignores touching endpoints', () => {
    const a = event(),
      b = event({ id: 'b', startTime: '18:30', endTime: '20:00' }),
      c = event({ id: 'c', startTime: '19:15', endTime: '20:00' });
    expect(overlaps(a, b)).toBe(true);
    expect(overlaps(a, c)).toBe(false);
  });
  it('ignores cancelled/skipped and different dates', () => {
    expect(overlaps(event(), event({ id: 'b', status: 'cancelled' }))).toBe(false);
    expect(overlaps(event(), event({ id: 'b', date: '2026-09-08' }))).toBe(false);
  });
  it('finds every nested conflict', () => {
    const list = [
      event({ id: 'a', startTime: '08:00', endTime: '18:00' }),
      event({ id: 'b', startTime: '09:00', endTime: '10:00' }),
      event({ id: 'c', startTime: '09:15', endTime: '09:30' }),
    ];
    const conflicts = findConflicts(list);
    expect(conflicts.size).toBe(3);
    expect(conflicts.get('a')).toHaveLength(2);
  });
  it('partitions connected overlap groups and resets width for non-overlapping groups', () => {
    const result = layoutDay([
      event({ id: 'a', startTime: '09:00', endTime: '12:00' }),
      event({ id: 'b', startTime: '10:00', endTime: '11:00' }),
      event({ id: 'c', startTime: '10:15', endTime: '10:45' }),
      event({ id: 'd', startTime: '13:00', endTime: '14:00' }),
    ]);
    expect(result.slice(0, 3).map((x) => x.columns)).toEqual([3, 3, 3]);
    expect(result[3].columns).toBe(1);
  });
});
describe('statistics, parsing and validation', () => {
  it('does not automatically mark past events completed', () => {
    const stats = countShifts(occurrences(), new Date(2026, 8, 20));
    expect(stats.completed).toBe(0);
    expect(stats.upcoming).toBe(0);
    expect(stats.overdue).toBe(3);
  });
  it('counts upcoming and completed durations with fixed local clock', () => {
    const s = fixture();
    const stats = countShifts(
      occurrences(markStatus(s, occurrences(s)[0], 'completed')),
      new Date(2026, 8, 8),
    );
    expect(stats.completed).toBe(1);
    expect(stats.upcoming).toBe(2);
    expect(stats.completedMinutes).toBe(90);
  });
  it('parses Vietnamese quick entry and Sunday', () => {
    expect(parseQuickEntry('10A1 | 2 4 6 | 17:45-19:15')).toEqual({
      title: '10A1',
      weekdays: [0, 2, 4],
      startTime: '17:45',
      endTime: '19:15',
    });
    expect(parseQuickEntry('Lớp 11 | T2, T3 CN | 7:05–8:35').weekdays).toEqual([0, 1, 6]);
  });
  it.each([
    '10A1 | 1 | 17:45-19:15',
    '10A1 | 2 4 | 20:00-19:00',
    ' | 2 | 17:00-18:00',
    '10A1 | 2 | 24:00-25:00',
  ])('rejects malformed quick entry %s', (text) => expect(() => parseQuickEntry(text)).toThrow());
  it('validates data graph and backup version before import', () => {
    const s = fixture();
    expect(parseBackup(serializeBackup(s))).toEqual(s);
    expect(() => parseBackup('{"schemaVersion":99}')).toThrow();
    const broken = structuredClone(s);
    broken.rules[0].workItemId = 'missing';
    expect(snapshotSchema.safeParse(broken).success).toBe(false);
  });
  it('rejects duplicate, orphan and non-occurring exceptions', () => {
    const s = fixture();
    const next = markStatus(s, occurrences(s)[0], 'completed');
    next.exceptions.push({ ...next.exceptions[0], id: 'second' });
    expect(snapshotSchema.safeParse(next).success).toBe(false);
    next.exceptions.pop();
    next.exceptions[0].originalDate = '2026-09-08';
    expect(snapshotSchema.safeParse(next).success).toBe(false);
  });
  it('duplicates workspaces with fully remapped identities and deletes independently', () => {
    let s = fixture();
    s = markStatus(s, occurrences(s)[0], 'completed');
    const next = duplicateWorkspace(s, s.settings.activeWorkspaceId!);
    expect(snapshotSchema.safeParse(next).success).toBe(true);
    expect(next.workspaces).toHaveLength(2);
    expect(new Set(next.rules.map((r) => r.seriesId)).size).toBe(2);
    const remaining = deleteWorkspace(next, s.settings.activeWorkspaceId!);
    expect(snapshotSchema.safeParse(remaining).success).toBe(true);
    expect(occurrences(remaining)).toHaveLength(3);
    expect(remaining.exceptions).toHaveLength(1);
  });
  it('picks accessible text for bright and dark custom colors', () => {
    expect(contrastText('#ffffff')).toBe('#000000');
    expect(contrastText('#000000')).toBe('#ffffff');
  });
});
