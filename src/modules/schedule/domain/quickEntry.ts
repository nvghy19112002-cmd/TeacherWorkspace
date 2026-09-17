import { duration } from '../../../core/time';
export interface QuickEntry {
  title: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
}
export function parseQuickEntry(input: string): QuickEntry {
  const parts = input
    .trim()
    .split('|')
    .map((x) => x.trim());
  if (parts.length !== 3 || !parts[0]) throw new Error('Dùng mẫu: 10A1 | 2 4 6 | 17:45-19:15');
  const tokens = parts[1]
    .toUpperCase()
    .replace(/THỨ\s*/g, '')
    .replace(/T(?=[2-7])/g, '')
    .split(/[\s,;/]+/)
    .filter(Boolean);
  if (!tokens.length || tokens.some((t) => !/^[2-7]$|^CN$|^8$/.test(t)))
    throw new Error('Thứ phải từ 2 đến 7; Chủ nhật dùng CN.');
  const weekdays = [
    ...new Set(tokens.map((t) => (t === 'CN' || t === '8' ? 6 : Number(t) - 2))),
  ].sort();
  const match = parts[2].match(/^(\d{1,2}):([0-5]\d)\s*[-–→]\s*(\d{1,2}):([0-5]\d)$/);
  if (!match) throw new Error('Giờ phải theo mẫu 17:45-19:15.');
  const startTime = `${match[1].padStart(2, '0')}:${match[2]}`;
  const endTime = `${match[3].padStart(2, '0')}:${match[4]}`;
  if (duration(startTime, endTime) <= 0)
    throw new Error('Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.');
  return { title: parts[0], weekdays, startTime, endTime };
}
