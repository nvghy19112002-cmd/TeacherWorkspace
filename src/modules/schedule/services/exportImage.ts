import {
  hoursLabel,
  shortDate,
  prettyDate,
  timeMinutes,
  WEEKDAYS,
  addDate,
} from '../../../core/time';
import { countShifts } from '../../statistics/statistics';
import { itemColor, contrastText } from '../domain/colors';
import { layoutDay } from '../domain/conflicts';
import { STATUS, type ScheduleOccurrence, type Settings, type WorkItem } from '../domain/model';
export const EXPORT_PRESETS = {
  a4portrait: { label: 'A4 dọc', width: 2480, height: 3508 },
  a4landscape: { label: 'A4 ngang', width: 3508, height: 2480 },
  wide: { label: '16:9 · Full HD', width: 1920, height: 1080 },
  classic: { label: '4:3', width: 2400, height: 1800 },
  square: { label: '1:1 · Vuông', width: 2000, height: 2000 },
  mobile: { label: '9:16 · Điện thoại', width: 1080, height: 1920 },
} as const;
export interface ExportOptions {
  preset: keyof typeof EXPORT_PRESETS;
  style: 'clean' | 'minimal' | 'dark' | 'print';
  medium: 'screen' | 'colorPrint' | 'mono';
  title: string;
  showTitle: boolean;
  showDates: boolean;
  showTimes: boolean;
  showLocation: boolean;
  showNotes: boolean;
  showTotal: boolean;
}
export const DEFAULT_EXPORT: ExportOptions = {
  preset: 'a4landscape',
  style: 'clean',
  medium: 'screen',
  title: 'Thời khóa biểu',
  showTitle: true,
  showDates: true,
  showTimes: true,
  showLocation: true,
  showNotes: false,
  showTotal: true,
};
export interface ExportInput {
  start: string;
  events: ScheduleOccurrence[];
  items: WorkItem[];
  settings: Settings;
  options: ExportOptions;
}
export interface ExportPage {
  canvas: HTMLCanvasElement;
  label: string;
}
interface Detail {
  code: string;
  text: string;
}
function font(ctx: CanvasRenderingContext2D, size: number, bold = false) {
  ctx.font = `${bold ? 600 : 400} ${size}px "Segoe UI", Arial, sans-serif`;
}
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= width) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const char of word) {
        if (ctx.measureText(line + char).width > width && line) {
          lines.push(line);
          line = '';
        }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number) {
  let value = text;
  while (value && ctx.measureText(value).width > width) value = value.slice(0, -1);
  if (value !== text) {
    while (value && ctx.measureText(value + '…').width > width) value = value.slice(0, -1);
    value += '…';
  }
  ctx.fillText(value, x, y);
}
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2));
}
/** Pure-data canvas rendering: no DOM capture, browser zoom, scroll position or UI theme dependency. */
export function renderScheduleImages(input: ExportInput): ExportPage[] {
  const { options: o, events, items, settings, start } = input;
  const { width, height } = EXPORT_PRESETS[o.preset];
  const monochrome = o.medium === 'mono' || o.style === 'print';
  const dark = o.style === 'dark' && o.medium === 'screen';
  const bg = dark ? '#142321' : '#ffffff',
    fg = dark ? '#f1f6f4' : '#172f2b',
    muted = dark ? '#adc0ba' : '#647770',
    gridColor = dark ? '#31433f' : '#dce4e0';
  const unit = Math.max(0.78, Math.min(width / 1600, height / 1000));
  const margin = 44 * unit;
  const size = 17 * unit;
  const map = new Map(items.map((i) => [i.id, i]));
  const stats = countShifts(events);
  const details: Detail[] = [];
  const pages: ExportPage[] = [];
  const codes = new Map(events.map((event, i) => [event.id, String(i + 1).padStart(2, '0')]));
  const create = (label: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không thể khởi tạo bộ vẽ PNG.');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'top';
    pages.push({ canvas, label });
    return ctx;
  };
  const ctx = create('Thời khóa biểu');
  ctx.fillStyle = fg;
  let headerY = margin;
  if (o.showTitle) {
    font(ctx, 36 * unit, true);
    fitText(ctx, o.title || 'Thời khóa biểu', margin, headerY, width - 2 * margin);
    headerY += 53 * unit;
  }
  if (o.showDates) {
    font(ctx, 18 * unit);
    ctx.fillStyle = muted;
    ctx.fillText(`${prettyDate(start)} – ${prettyDate(addDate(start, 6))}`, margin, headerY);
    headerY += 30 * unit;
  }
  if (o.showTotal) {
    font(ctx, 15 * unit);
    ctx.fillStyle = muted;
    ctx.fillText(
      `${stats.total} ca tổng · ${stats.scheduled} ca theo lịch · ${hoursLabel(stats.minutes)}`,
      margin,
      headerY,
    );
    headerY += 26 * unit;
  }
  const axis = o.showTimes ? 65 * unit : 12 * unit;
  const left = margin + axis;
  const top = headerY + 65 * unit;
  const bottom = height - margin - 54 * unit;
  const gridHeight = bottom - top;
  const colWidth = (width - margin - left) / 7;
  let min = events.length
    ? Math.max(
        0,
        Math.floor(Math.min(...events.map((e) => timeMinutes(e.startTime))) / 60) * 60 - 30,
      )
    : settings.dayStart * 60;
  let max = events.length
    ? Math.min(
        1440,
        Math.ceil(Math.max(...events.map((e) => timeMinutes(e.endTime))) / 60) * 60 + 30,
      )
    : settings.dayEnd * 60;
  if (max - min < 120) {
    min = Math.max(0, max - 120);
    max = Math.min(1440, min + 120);
  }
  const range = max - min;
  const px = gridHeight / range;
  font(ctx, 17 * unit, true);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.fillText(WEEKDAYS[i], left + (i + 0.5) * colWidth, top - 48 * unit);
    if (o.showDates) {
      font(ctx, 14 * unit);
      ctx.fillStyle = muted;
      ctx.fillText(shortDate(addDate(start, i)), left + (i + 0.5) * colWidth, top - 24 * unit);
      font(ctx, 17 * unit, true);
    }
  }
  ctx.textAlign = 'left';
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = Math.max(1, unit * 0.7);
  for (let i = 0; i <= 7; i++) {
    ctx.beginPath();
    ctx.moveTo(left + i * colWidth, top);
    ctx.lineTo(left + i * colWidth, bottom);
    ctx.stroke();
  }
  const tickStep = gridHeight / (range / 60) < size * 1.8 ? 120 : 60;
  for (let m = Math.ceil(min / tickStep) * tickStep; m <= min + range; m += tickStep) {
    const y = top + (m - min) * px;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
    if (o.showTimes) {
      font(ctx, 13 * unit);
      ctx.fillStyle = muted;
      ctx.fillText(`${Math.floor(m / 60)}`.padStart(2, '0') + ':00', margin, y - 7 * unit);
    }
  }
  for (let day = 0; day < 7; day++)
    for (const placed of layoutDay(events.filter((e) => e.date === addDate(start, day)))) {
      const event = placed.occurrence,
        item = map.get(event.workItemId);
      if (!item) continue;
      const code = codes.get(event.id)!;
      const inactive = event.status === 'cancelled' || event.status === 'skipped';
      const color = inactive ? '#7c8581' : itemColor(item, settings.colorMode);
      const x = left + day * colWidth + (placed.column / placed.columns) * colWidth + 4 * unit,
        y = top + (timeMinutes(event.startTime) - min) * px;
      const w = Math.max(1, colWidth / placed.columns - 8 * unit),
        h = (timeMinutes(event.endTime) - timeMinutes(event.startTime)) * px;
      const textLines = [`${code} · ${item.title}`];
      if (o.showTimes) textLines.push(`${event.startTime} – ${event.endTime}`);
      if (o.showLocation && item.location) textLines.push(item.location);
      if (event.status !== 'upcoming') textLines.push(STATUS[event.status].short);
      if (o.showNotes) {
        if (item.description) textLines.push(item.description);
        if (event.note) textLines.push(event.note);
      }
      const fullText = textLines.join('\n');
      ctx.save();
      rounded(ctx, x, y, w, Math.max(1, h), o.style === 'minimal' ? 0 : 7 * unit);
      ctx.fillStyle = monochrome ? '#ffffff' : o.style === 'minimal' ? '#f0f4f2' : color;
      ctx.fill();
      ctx.strokeStyle = monochrome ? '#333333' : color;
      ctx.lineWidth = monochrome ? 1.4 * unit : unit;
      ctx.stroke();
      ctx.clip();
      if (monochrome) {
        ctx.strokeStyle = '#777777';
        ctx.lineWidth = unit * 0.5;
        for (let a = x - h; a < x + w; a += 8 * unit) {
          ctx.beginPath();
          ctx.moveTo(a, y + 5 * unit);
          ctx.lineTo(a + 5 * unit, y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = monochrome
        ? '#171717'
        : o.style === 'minimal'
          ? '#172f2b'
          : contrastText(color);
      font(ctx, size, true);
      const innerWidth = Math.max(1, w - 16 * unit),
        lineHeight = size * 1.32;
      const wrapped = textLines.flatMap((line, index) => {
        font(ctx, size, index === 0);
        return wrap(ctx, line, innerWidth).map((text) => ({ text, bold: index === 0 }));
      });
      const slots = Math.floor((h - 12 * unit) / lineHeight);
      if (slots < wrapped.length || w < 55 * unit) {
        details.push({
          code,
          text: `${WEEKDAYS[day]}${o.showDates ? ' ' + shortDate(event.date) : ''} · ${fullText}`,
        });
        if (slots >= 1 && w >= 35 * unit) {
          font(ctx, Math.min(size, w / 2), true);
          ctx.fillText(`#${code}`, x + 6 * unit, y + 6 * unit);
        }
      } else {
        for (let i = 0; i < wrapped.length; i++) {
          font(ctx, size, wrapped[i].bold);
          ctx.fillText(wrapped[i].text, x + 8 * unit, y + 6 * unit + i * lineHeight);
        }
      }
      if (inactive) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = unit;
        ctx.beginPath();
        ctx.moveTo(x + 5 * unit, y + h / 2);
        ctx.lineTo(x + w - 5 * unit, y + h / 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  font(ctx, 13 * unit);
  ctx.fillStyle = muted;
  ctx.fillText(
    details.length
      ? '# = ca có nội dung chi tiết ở ảnh bổ sung. Vị trí và chiều cao vẫn đúng theo thời gian.'
      : 'Teacher Workspace · Lịch cá nhân',
    margin,
    height - margin - 16 * unit,
  );
  if (details.length) {
    let pageCtx = ctx;
    let y = height;
    let detailPage = 0;
    const lineHeight = 23 * unit;
    const contentWidth = width - 2 * margin;
    for (const detail of details) {
      // Break every overflowing record across companion pages; never silently omit a note.
      font(ctx, 17 * unit);
      const lines = wrap(ctx, detail.text, contentWidth - 20 * unit);
      for (let i = 0; i < lines.length; i++) {
        if (y + lineHeight > height - margin - 30 * unit) {
          detailPage++;
          pageCtx = create(`Chi tiết ${detailPage}`);
          pageCtx.fillStyle = fg;
          font(pageCtx, 30 * unit, true);
          pageCtx.fillText(`Chi tiết ca · ${detailPage}`, margin, margin);
          y = margin + 60 * unit;
        }
        pageCtx.fillStyle = fg;
        font(pageCtx, 17 * unit, i === 0);
        pageCtx.fillText(lines[i], margin + 10 * unit, y);
        y += lineHeight;
      }
      y += 18 * unit;
      pageCtx.strokeStyle = gridColor;
      pageCtx.beginPath();
      pageCtx.moveTo(margin, y - 8 * unit);
      pageCtx.lineTo(width - margin, y - 8 * unit);
      pageCtx.stroke();
    }
  }
  return pages;
}
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
/** Tag PNG with 300 dpi; A4 presets carry exact requested pixel dimensions. */
export function withPngDpi(bytes: Uint8Array, dpi = 300): Uint8Array {
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1;
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  const parts: Uint8Array[] = [bytes.slice(0, 8)];
  let offset = 8;
  while (offset < bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const part = bytes.slice(offset, offset + length + 12);
    if (type !== 'pHYs') parts.push(part);
    if (type === 'IHDR') parts.push(chunk);
    offset += length + 12;
  }
  const output = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of parts) {
    output.set(p, at);
    at += p.length;
  }
  return output;
}
export async function canvasPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Không tạo được ảnh PNG.'))),
      'image/png',
    ),
  );
  return withPngDpi(new Uint8Array(await blob.arrayBuffer()));
}
