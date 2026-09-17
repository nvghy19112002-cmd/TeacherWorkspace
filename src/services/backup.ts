import { snapshotSchema, type Snapshot } from '../modules/schedule/domain/model';
export function serializeBackup(data: Snapshot): string {
  return JSON.stringify(
    {
      application: 'TeacherWorkspace',
      exportedAt: new Date().toISOString(),
      ...snapshotSchema.parse(data),
    },
    null,
    2,
  );
}
export function parseBackup(text: string): Snapshot {
  if (new TextEncoder().encode(text).length > 50 * 1024 * 1024)
    throw new Error('Backup vượt quá 50 MB.');
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Không đọc được JSON. Tệp backup bị lỗi.');
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== 1
  )
    throw new Error('Phiên bản backup chưa được hỗ trợ. Không có dữ liệu nào bị thay đổi.');
  return snapshotSchema.parse(value);
}
