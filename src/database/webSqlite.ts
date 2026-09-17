import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import migration from './migrations/001_initial.sql?raw';
import bankMigration from './migrations/002_question_bank.sql?raw';
import {
  TABLES,
  mutationSql,
  type DbRow,
  type DbState,
  type DbTables,
  type Mutation,
} from './codec';
import type { DatabaseDriver } from './driver';
import {
  BANK_TABLES,
  bankMutationSql,
  type BankDbState,
  type BankDbTables,
  type BankMutation,
} from '../modules/question-bank/database/codec';

const DB_NAME = 'teacher-workspace-browser-sqlite-v1';
const CONFLICT = 'Dữ liệu đã thay đổi ở cửa sổ khác. Hãy tải lại trước khi tiếp tục.';
function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function readBytes(idb: IDBDatabase): Promise<Uint8Array | undefined> {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction('files', 'readonly');
    const req = tx.objectStore('files').get('main');
    req.onsuccess = () => resolve(req.result as Uint8Array | undefined);
    req.onerror = () => reject(req.error);
  });
}
function writeBytes(idb: IDBDatabase, bytes: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction('files', 'readwrite');
    tx.objectStore('files').put(bytes, 'main');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Lưu dữ liệu bị gián đoạn.'));
  });
}
export function initializeSqlite(SQL: SqlJsStatic, bytes?: Uint8Array): Database {
  const db = new SQL.Database(bytes);
  db.run('PRAGMA foreign_keys=ON');
  const version = Number(db.exec('PRAGMA user_version')[0].values[0][0]);
  if (version > 2) {
    db.close();
    throw new Error('Database được tạo bởi phiên bản mới hơn. Hãy cập nhật ứng dụng.');
  }
  if (version < 1) {
    db.run('BEGIN IMMEDIATE');
    try {
      db.run(migration);
      db.run('PRAGMA user_version=1');
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      db.close();
      throw error;
    }
  }
  if (version < 2) {
    db.run('BEGIN IMMEDIATE');
    try {
      db.run(bankMigration);
      db.run('PRAGMA user_version=2');
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      db.close();
      throw error;
    }
  }
  return db;
}

export function readBankState(db: Database): BankDbState {
  const tables = {} as BankDbTables;
  for (const table of BANK_TABLES) {
    const result = db.exec(`SELECT * FROM ${table}`)[0];
    tables[table] = result
      ? result.values.map(
          (row) => Object.fromEntries(result.columns.map((column, index) => [column, row[index]])) as DbRow,
        )
      : [];
  }
  return {
    tables,
    revision: Number(
      db.exec('SELECT revision FROM question_bank_meta WHERE id=1')[0].values[0][0],
    ),
  };
}

export function commitBankSqlite(
  db: Database,
  mutations: BankMutation[],
  expected: number,
): number {
  db.run('BEGIN IMMEDIATE');
  try {
    const revision = Number(
      db.exec('SELECT revision FROM question_bank_meta WHERE id=1')[0].values[0][0],
    );
    if (revision !== expected) throw new Error(CONFLICT);
    db.run('PRAGMA defer_foreign_keys=ON');
    for (const mutation of mutations) {
      const { sql, params } = bankMutationSql(mutation);
      db.run(sql, params);
    }
    db.run('UPDATE question_bank_meta SET revision=revision+1 WHERE id=1');
    db.run('COMMIT');
    return revision + 1;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}
export function readState(db: Database): DbState {
  const tables = {} as DbTables;
  for (const table of TABLES) {
    const result = db.exec(`SELECT * FROM ${table}`)[0];
    tables[table] = result
      ? result.values.map(
          (row) => Object.fromEntries(result.columns.map((c, i) => [c, row[i]])) as DbRow,
        )
      : [];
  }
  return {
    tables,
    revision: Number(db.exec('SELECT revision FROM app_meta WHERE id=1')[0].values[0][0]),
  };
}
export function commitSqlite(db: Database, mutations: Mutation[], expected: number): number {
  db.run('BEGIN IMMEDIATE');
  try {
    const revision = Number(db.exec('SELECT revision FROM app_meta WHERE id=1')[0].values[0][0]);
    if (revision !== expected) throw new Error(CONFLICT);
    // Reparenting on split may temporarily remove a referenced row inside this transaction.
    db.run('PRAGMA defer_foreign_keys=ON');
    // Remove changed exceptions first to permit swapping their unique occurrence keys.
    for (const m of mutations)
      if (m.table === 'schedule_exceptions' && m.row)
        db.run('DELETE FROM schedule_exceptions WHERE id=?', [m.id]);
    for (const m of mutations) {
      const { sql, params } = mutationSql(m);
      db.run(sql, params);
    }
    db.run('UPDATE app_meta SET revision=revision+1 WHERE id=1');
    db.run('COMMIT');
    return revision + 1;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}
export async function createWebDriver(): Promise<DatabaseDriver> {
  if (!navigator.locks)
    throw new Error('Trình duyệt cần hỗ trợ Web Locks. Hãy dùng Edge/Chrome hoặc bản desktop.');
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const idb = await openIdb();
  return {
    load: async () =>
      await navigator.locks.request(DB_NAME, async () => {
        const bytes = await readBytes(idb);
        const db = initializeSqlite(SQL, bytes);
        try {
          if (!bytes) await writeBytes(idb, db.export());
          return readState(db);
        } finally {
          db.close();
        }
      }),
    commit: async (mutations, expected) =>
      await navigator.locks.request(DB_NAME, async () => {
        const db = initializeSqlite(SQL, await readBytes(idb));
        try {
          const revision = commitSqlite(db, mutations, expected);
          await writeBytes(idb, db.export());
          return revision;
        } finally {
          db.close();
        }
      }),
    loadBank: async () =>
      await navigator.locks.request(DB_NAME, async () => {
        const db = initializeSqlite(SQL, await readBytes(idb));
        try {
          return readBankState(db);
        } finally {
          db.close();
        }
      }),
    commitBank: async (mutations, expected) =>
      await navigator.locks.request(DB_NAME, async () => {
        const db = initializeSqlite(SQL, await readBytes(idb));
        try {
          const revision = commitBankSqlite(db, mutations, expected);
          await writeBytes(idb, db.export());
          return revision;
        } finally {
          db.close();
        }
      }),
  };
}
