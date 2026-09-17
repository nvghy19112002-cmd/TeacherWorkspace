import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export type LocalDate = string;
export type LocalTime = string;
export const dateKey = (date: Date): LocalDate => format(date, 'yyyy-MM-dd');
export const today = () => dateKey(new Date());
export const asDate = (date: LocalDate) => parseISO(`${date}T12:00:00`);
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = asDate(value);
  return isValid(d) && dateKey(d) === value && value >= '1900-01-01' && value <= '2100-12-31';
}
export const addDate = (date: LocalDate, days: number) => dateKey(addDays(asDate(date), days));
export const daysBetween = (a: LocalDate, b: LocalDate) =>
  differenceInCalendarDays(asDate(a), asDate(b));
export const weekday = (date: LocalDate) => (asDate(date).getDay() + 6) % 7;
export const monday = (date: LocalDate) => dateKey(startOfWeek(asDate(date), { weekStartsOn: 1 }));
export function timeMinutes(time: LocalTime): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error('Giờ không hợp lệ. Hãy dùng HH:mm (00:00–23:59).');
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
export function minuteTime(minutes: number): LocalTime {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439)
    throw new Error('Thời gian phải nằm trong cùng ngày (00:00–23:59).');
  return `${Math.floor(minutes / 60)}`.padStart(2, '0') + ':' + `${minutes % 60}`.padStart(2, '0');
}
export const duration = (start: LocalTime, end: LocalTime) => timeMinutes(end) - timeMinutes(start);
export const snapMinute = (value: number, interval: number) =>
  Math.round(value / interval) * interval;
export interface DateRange {
  start: LocalDate;
  end: LocalDate;
}
export function assertRange(range: DateRange, maxDays = 3660): void {
  if (!validDate(range.start) || !validDate(range.end) || range.start > range.end)
    throw new Error('Khoảng ngày không hợp lệ.');
  if (daysBetween(range.end, range.start) > maxDays)
    throw new Error(`Chỉ xem tối đa ${maxDays} ngày mỗi lần.`);
}
export function datesInRange(range: DateRange): LocalDate[] {
  assertRange(range);
  return Array.from({ length: daysBetween(range.end, range.start) + 1 }, (_, i) =>
    addDate(range.start, i),
  );
}
export function weekRange(date: LocalDate): DateRange {
  const start = monday(date);
  return { start, end: addDate(start, 6) };
}
export function monthRange(date: LocalDate): DateRange {
  return { start: dateKey(startOfMonth(asDate(date))), end: dateKey(endOfMonth(asDate(date))) };
}
export const prettyDate = (date: LocalDate) => format(asDate(date), 'dd/MM/yyyy');
export const shortDate = (date: LocalDate) => format(asDate(date), 'dd/MM');
export const hoursLabel = (minutes: number) =>
  `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}`;
export const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'] as const;
