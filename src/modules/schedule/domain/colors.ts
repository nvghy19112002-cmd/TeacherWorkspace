import type { Settings, WorkItem } from './model';
export const PALETTE = [
  '#247568',
  '#4568ae',
  '#9b6745',
  '#8058a5',
  '#aa5069',
  '#58764a',
  '#58768d',
  '#a37722',
] as const;
const categoryColors = {
  teaching: '#247568',
  meeting: '#4568ae',
  planning: '#8058a5',
  personal: '#9b6745',
};
export function itemColor(item: WorkItem, mode: Settings['colorMode']): string {
  if (mode === 'custom') return item.color;
  if (mode === 'category') return categoryColors[item.category];
  const key =
    mode === 'location'
      ? item.location || 'Chưa có địa điểm'
      : mode === 'auto'
        ? item.id
        : item.title;
  let hash = 0;
  for (const c of key) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
/** Contrast-safe foreground on an arbitrary solid fill. */
export function contrastText(hex: string): '#000000' | '#ffffff' {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return (lum + 0.05) / 0.05 >= 1.05 / (lum + 0.05) ? '#000000' : '#ffffff';
}
