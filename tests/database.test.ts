import { beforeAll, describe, expect, it } from 'vitest';
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { initializeSqlite, commitSqlite, readState } from '../src/database/webSqlite';
import { decode, diff, type Mutation } from '../src/database/codec';
import { emptySnapshot, snapshotSchema } from '../src/modules/schedule/domain/model';
import { editOccurrence, markStatus } from '../src/modules/schedule/domain/commands';
import { generateOccurrences } from '../src/modules/schedule/domain/recurrence';
import { fixture } from './fixtures';
let SQL: SqlJsStatic;
beforeAll(async () => {
  SQL = await initSqlJs();
});
describe('real SQLite migrations and atomic writes', () => {
  it('migrates a new database and reopens persisted bytes', () => {
    const db = initializeSqlite(SQL);
    const state = fixture();
    commitSqlite(db, diff(emptySnapshot(), state), 0);
    const saved = db.export();
    db.close();
    const reopened = initializeSqlite(SQL, saved);
    expect(decode(readState(reopened).tables)).toEqual(state);
    expect(readState(reopened).revision).toBe(1);
    reopened.close();
  });
  it('rejects stale revisions without changing data', () => {
    const db = initializeSqlite(SQL);
    const state = fixture();
    commitSqlite(db, diff(emptySnapshot(), state), 0);
    expect(() => commitSqlite(db, [], 0)).toThrow();
    expect(decode(readState(db).tables)).toEqual(state);
    expect(readState(db).revision).toBe(1);
    db.close();
  });
  it('rolls back the entire batch on a foreign key violation', () => {
    const db = initializeSqlite(SQL);
    const state = fixture();
    const changes = diff(emptySnapshot(), state);
    changes.push({
      table: 'schedule_rules',
      id: 'bad',
      row: {
        ...changes.find((m) => m.table === 'schedule_rules')!.row!,
        id: 'bad',
        work_item_id: 'missing',
      },
    });
    expect(() => commitSqlite(db, changes, 0)).toThrow();
    expect(readState(db).tables.workspaces).toHaveLength(0);
    expect(readState(db).revision).toBe(0);
    db.close();
  });
  it('enforces time constraints even below the domain layer', () => {
    const db = initializeSqlite(SQL);
    const changes = diff(emptySnapshot(), fixture());
    const rule = changes.find((m) => m.table === 'schedule_rules')!;
    rule.row!.end_time = '10:00';
    expect(() => commitSqlite(db, changes, 0)).toThrow();
    expect(readState(db).tables.work_items).toHaveLength(0);
    db.close();
  });
  it('does not cascade-delete exceptions on parent UPSERT', () => {
    const db = initializeSqlite(SQL);
    let state = fixture();
    const o = generateOccurrences(state, state.settings.activeWorkspaceId!, {
      start: '2026-09-07',
      end: '2026-09-13',
    })[0];
    state = markStatus(state, o, 'completed');
    commitSqlite(db, diff(emptySnapshot(), state), 0);
    const updated = structuredClone(state);
    updated.workItems[0].title = '10A1 renamed';
    commitSqlite(db, diff(state, updated), 1);
    expect(readState(db).tables.schedule_exceptions).toHaveLength(1);
    db.close();
  });
  it('persists a split and reparents an exception atomically', () => {
    const db = initializeSqlite(SQL);
    let state = fixture();
    const list = generateOccurrences(state, state.settings.activeWorkspaceId!, {
      start: '2026-09-07',
      end: '2026-09-13',
    });
    state = markStatus(state, list[2], 'completed');
    commitSqlite(db, diff(emptySnapshot(), state), 0);
    const updated = editOccurrence(
      state,
      list[0],
      { date: '2026-09-07', startTime: '18:00', endTime: '19:30' },
      'future',
    );
    expect(updated.rules[0].id).not.toBe(state.rules[0].id);
    commitSqlite(db, diff(state, updated), 1);
    expect(decode(readState(db).tables)).toEqual(snapshotSchema.parse(updated));
    expect(readState(db).tables.schedule_exceptions).toHaveLength(1);
    db.close();
  });
  it('enforces one override per occurrence and permits multiple makeups', () => {
    const db = initializeSqlite(SQL);
    let state = fixture();
    const o = generateOccurrences(state, state.settings.activeWorkspaceId!, {
      start: '2026-09-07',
      end: '2026-09-13',
    })[0];
    state = markStatus(state, o, 'completed');
    commitSqlite(db, diff(emptySnapshot(), state), 0);
    const row = readState(db).tables.schedule_exceptions[0];
    const duplicate: Mutation = {
      table: 'schedule_exceptions',
      id: 'duplicate',
      row: { ...row, id: 'duplicate' },
    };
    expect(() => commitSqlite(db, [duplicate], 1)).toThrow();
    expect(readState(db).revision).toBe(1);
    db.close();
  });
  it('refuses future schema versions', () => {
    const db = initializeSqlite(SQL);
    db.run('PRAGMA user_version=99');
    const bytes = db.export();
    db.close();
    expect(() => initializeSqlite(SQL, bytes)).toThrow(/newer|mới hơn/);
  });
});
