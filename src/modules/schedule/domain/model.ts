import { z } from 'zod';
import { ruleOccursOn } from './predicate';
import { duration, validDate } from '../../../core/time';

const id = z.string().min(1).max(100);
const date = z.string().refine(validDate, 'Ngày không hợp lệ (1900–2100).');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ phải có dạng HH:mm.');
const timestamp = z.string().datetime();
export const STATUS = {
  upcoming: { label: 'Chưa hoàn tất', short: 'Dự kiến' },
  completed: { label: 'Đã hoàn thành', short: 'Đã dạy' },
  cancelled: { label: 'Đã hủy', short: 'Đã hủy' },
  skipped: { label: 'Nghỉ buổi', short: 'Nghỉ' },
  rescheduled: { label: 'Đổi lịch', short: 'Đổi lịch' },
  makeup: { label: 'Dạy bù', short: 'Dạy bù' },
} as const;
export const statusSchema = z.enum([
  'upcoming',
  'completed',
  'cancelled',
  'skipped',
  'rescheduled',
  'makeup',
]);
export type OccurrenceStatus = z.infer<typeof statusSchema>;
export const workspaceSchema = z.object({
  id,
  name: z.string().trim().min(1).max(100),
  description: z.string().max(1000),
  createdAt: timestamp,
  archived: z.boolean(),
});
export const workItemSchema = z.object({
  id,
  workspaceId: id,
  title: z.string().trim().min(1, 'Hãy nhập tên công việc.').max(120),
  description: z.string().max(2000),
  category: z.enum(['teaching', 'meeting', 'planning', 'personal']),
  location: z.string().max(150),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  createdAt: timestamp,
  updatedAt: timestamp,
  archived: z.boolean(),
});
export const ruleSchema = z
  .object({
    id,
    seriesId: id,
    workItemId: id,
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    startTime: time,
    endTime: time,
    startDate: date,
    endDate: date.nullable(),
    anchorDate: date,
    recurrenceType: z.enum(['weekly', 'once']),
    intervalWeeks: z.number().int().min(1).max(52),
    active: z.boolean(),
  })
  .superRefine((r, ctx) => {
    if (r.endTime <= r.startTime)
      ctx.addIssue({
        code: 'custom',
        message: 'Giờ kết thúc phải sau giờ bắt đầu; ca không đi qua nửa đêm.',
        path: ['endTime'],
      });
    if (r.endDate && r.endDate < r.startDate)
      ctx.addIssue({
        code: 'custom',
        message: 'Ngày kết thúc phải từ ngày bắt đầu trở đi.',
        path: ['endDate'],
      });
    if (new Set(r.weekdays).size !== r.weekdays.length)
      ctx.addIssue({ code: 'custom', message: 'Thứ trong tuần bị trùng.' });
  });
export const exceptionSchema = z
  .object({
    id,
    ruleId: id,
    originalDate: date,
    kind: z.enum(['override', 'cancelled', 'skipped', 'rescheduled', 'makeup']),
    targetDate: date.nullable(),
    startTime: time.nullable(),
    endTime: time.nullable(),
    status: statusSchema.nullable(),
    note: z.string().max(2000),
    deleted: z.boolean(),
  })
  .superRefine((e, ctx) => {
    if ((e.startTime === null) !== (e.endTime === null))
      ctx.addIssue({ code: 'custom', message: 'Ngoại lệ phải có đủ giờ bắt đầu và kết thúc.' });
    if (e.startTime && e.endTime && duration(e.startTime, e.endTime) <= 0)
      ctx.addIssue({ code: 'custom', message: 'Thời lượng ngoại lệ phải lớn hơn 0.' });
    if ((e.kind === 'makeup' || e.kind === 'rescheduled') && !e.targetDate)
      ctx.addIssue({ code: 'custom', message: 'Ca đổi lịch hoặc dạy bù cần ngày đích.' });
    if (e.kind === 'makeup' && !e.startTime)
      ctx.addIssue({ code: 'custom', message: 'Ca dạy bù cần giờ riêng.' });
  });
export const settingsSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']),
    snapMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]),
    dayStart: z.number().int().min(0).max(23),
    dayEnd: z.number().int().min(1).max(24),
    hourHeight: z.number().min(48).max(120),
    colorMode: z.enum(['auto', 'class', 'category', 'location', 'custom']),
    activeWorkspaceId: id.nullable(),
    moduleState: z.record(z.string().max(80), z.string().max(200000)).optional(),
  })
  .refine((s) => s.dayStart < s.dayEnd, 'Giờ cuối phải sau giờ đầu của khung lịch.');
export const snapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    workspaces: z.array(workspaceSchema).max(200),
    workItems: z.array(workItemSchema).max(20000),
    rules: z.array(ruleSchema).max(50000),
    exceptions: z.array(exceptionSchema).max(200000),
    settings: settingsSchema,
  })
  .superRefine((s, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    for (const rows of [s.workspaces, s.workItems, s.rules, s.exceptions])
      if (new Set(rows.map((r) => r.id)).size !== rows.length) fail('ID dữ liệu bị trùng.');
    const workspaces = new Set(s.workspaces.map((w) => w.id));
    const items = new Set(s.workItems.map((w) => w.id));
    const rules = new Map(s.rules.map((r) => [r.id, r]));
    if (s.workItems.some((w) => !workspaces.has(w.workspaceId)))
      fail('Công việc tham chiếu workspace không tồn tại.');
    if (s.rules.some((r) => !items.has(r.workItemId)))
      fail('Quy luật tham chiếu công việc không tồn tại.');
    if (s.exceptions.some((e) => !rules.has(e.ruleId)))
      fail('Ngoại lệ tham chiếu quy luật không tồn tại.');
    if (
      s.exceptions.some((e) => {
        const r = rules.get(e.ruleId);
        return r && e.kind !== 'makeup' && !ruleOccursOn({ ...r, active: true }, e.originalDate);
      })
    )
      fail('Ngoại lệ không trỏ đến một ca gốc hợp lệ.');
    const seriesOwners = new Map<string, string>();
    for (const r of s.rules) {
      if (seriesOwners.has(r.seriesId) && seriesOwners.get(r.seriesId) !== r.workItemId)
        fail('Một chuỗi lịch không thể thuộc nhiều công việc.');
      seriesOwners.set(r.seriesId, r.workItemId);
    }
    const keys = s.exceptions
      .filter((e) => e.kind !== 'makeup')
      .map((e) => `${e.ruleId}/${e.originalDate}`);
    if (new Set(keys).size !== keys.length) fail('Một ca có nhiều ngoại lệ thay thế.');
    if (s.settings.activeWorkspaceId && !workspaces.has(s.settings.activeWorkspaceId))
      fail('Workspace đang chọn không tồn tại.');
  });
export type ScheduleWorkspace = z.infer<typeof workspaceSchema>;
export type WorkItem = z.infer<typeof workItemSchema>;
export type ScheduleRule = z.infer<typeof ruleSchema>;
export type ScheduleException = z.infer<typeof exceptionSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export interface ScheduleOccurrence {
  id: string;
  ruleId: string;
  workItemId: string;
  originalDate: string;
  date: string;
  startTime: string;
  endTime: string;
  status: OccurrenceStatus;
  isMakeup: boolean;
  exceptionId: string | null;
  note: string;
}
export const CATEGORIES: Record<WorkItem['category'], string> = {
  teaching: 'Giảng dạy',
  meeting: 'Họp',
  planning: 'Soạn bài',
  personal: 'Cá nhân',
};
export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  snapMinutes: 15,
  dayStart: 6,
  dayEnd: 22,
  hourHeight: 68,
  colorMode: 'class',
  activeWorkspaceId: null,
};
export const newId = () => crypto.randomUUID();
export function emptySnapshot(): Snapshot {
  return {
    schemaVersion: 1,
    workspaces: [],
    workItems: [],
    rules: [],
    exceptions: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
