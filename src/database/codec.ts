import { emptySnapshot, snapshotSchema, type Snapshot } from '../modules/schedule/domain/model';
export const TABLES = [
  'workspaces',
  'work_items',
  'schedule_rules',
  'schedule_exceptions',
  'settings',
] as const;
export type TableName = (typeof TABLES)[number];
export type SqlValue = string | number | null;
export type DbRow = Record<string, SqlValue>;
export type DbTables = Record<TableName, DbRow[]>;
export interface DbState {
  revision: number;
  tables: DbTables;
}
export interface Mutation {
  table: TableName;
  id: string;
  row: DbRow | null;
}
export function encode(data: Snapshot): DbTables {
  return {
    workspaces: data.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      created_at: w.createdAt,
      archived: +w.archived,
    })),
    work_items: data.workItems.map((w) => ({
      id: w.id,
      workspace_id: w.workspaceId,
      title: w.title,
      description: w.description,
      category: w.category,
      location: w.location,
      color: w.color,
      created_at: w.createdAt,
      updated_at: w.updatedAt,
      archived: +w.archived,
    })),
    schedule_rules: data.rules.map((r) => ({
      id: r.id,
      series_id: r.seriesId,
      work_item_id: r.workItemId,
      weekdays: JSON.stringify(r.weekdays),
      start_time: r.startTime,
      end_time: r.endTime,
      start_date: r.startDate,
      end_date: r.endDate,
      anchor_date: r.anchorDate,
      recurrence_type: r.recurrenceType,
      interval_weeks: r.intervalWeeks,
      active: +r.active,
    })),
    schedule_exceptions: data.exceptions.map((e) => ({
      id: e.id,
      rule_id: e.ruleId,
      original_date: e.originalDate,
      kind: e.kind,
      target_date: e.targetDate,
      start_time: e.startTime,
      end_time: e.endTime,
      status: e.status,
      note: e.note,
      deleted: +e.deleted,
    })),
    settings: [{ id: 'app', value: JSON.stringify(data.settings) }],
  };
}
export function decode(t: DbTables): Snapshot {
  return snapshotSchema.parse({
    schemaVersion: 1,
    workspaces: t.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      createdAt: w.created_at,
      archived: !!w.archived,
    })),
    workItems: t.work_items.map((w) => ({
      id: w.id,
      workspaceId: w.workspace_id,
      title: w.title,
      description: w.description,
      category: w.category,
      location: w.location,
      color: w.color,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
      archived: !!w.archived,
    })),
    rules: t.schedule_rules.map((r) => ({
      id: r.id,
      seriesId: r.series_id,
      workItemId: r.work_item_id,
      weekdays: JSON.parse(String(r.weekdays)) as unknown,
      startTime: r.start_time,
      endTime: r.end_time,
      startDate: r.start_date,
      endDate: r.end_date,
      anchorDate: r.anchor_date,
      recurrenceType: r.recurrence_type,
      intervalWeeks: r.interval_weeks,
      active: !!r.active,
    })),
    exceptions: t.schedule_exceptions.map((e) => ({
      id: e.id,
      ruleId: e.rule_id,
      originalDate: e.original_date,
      kind: e.kind,
      targetDate: e.target_date,
      startTime: e.start_time,
      endTime: e.end_time,
      status: e.status,
      note: e.note,
      deleted: !!e.deleted,
    })),
    settings: t.settings.length
      ? (JSON.parse(String(t.settings[0].value)) as unknown)
      : emptySnapshot().settings,
  });
}
export function diff(before: Snapshot, after: Snapshot): Mutation[] {
  const a = encode(before),
    b = encode(after);
  const output: Mutation[] = [];
  // Deletions child -> parent. UPSERT (not REPLACE) must never cascade-delete exceptions.
  for (const table of [...TABLES].reverse()) {
    const ids = new Set(b[table].map((r) => r.id));
    for (const row of a[table])
      if (!ids.has(row.id)) output.push({ table, id: String(row.id), row: null });
  }
  for (const table of TABLES) {
    const old = new Map(a[table].map((r) => [r.id, JSON.stringify(r)]));
    for (const row of b[table])
      if (old.get(row.id) !== JSON.stringify(row)) output.push({ table, id: String(row.id), row });
  }
  return output;
}
export function mutationSql(m: Mutation): { sql: string; params: SqlValue[] } {
  if (!m.row) return { sql: `DELETE FROM ${m.table} WHERE id = ?`, params: [m.id] };
  const keys = Object.keys(m.row);
  return {
    sql: `INSERT INTO ${m.table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${keys
      .filter((k) => k !== 'id')
      .map((k) => `${k}=excluded.${k}`)
      .join(',')}`,
    params: keys.map((k) => m.row![k]),
  };
}
