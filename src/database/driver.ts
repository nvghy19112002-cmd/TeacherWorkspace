import { isTauri, invoke } from '@tauri-apps/api/core';
import type { DbState, Mutation } from './codec';
import type { BankDbState, BankMutation } from '../modules/question-bank/database/codec';
export interface DatabaseDriver {
  load(): Promise<DbState>;
  commit(mutations: Mutation[], expectedRevision: number): Promise<number>;
  loadBank(): Promise<BankDbState>;
  commitBank(mutations: BankMutation[], expectedRevision: number): Promise<number>;
}
export const isDesktop = isTauri();
let instance: Promise<DatabaseDriver> | undefined;
export function getDriver(): Promise<DatabaseDriver> {
  instance ??= isDesktop
    ? Promise.resolve({
        load: () => invoke<DbState>('load_database'),
        commit: (mutations: Mutation[], expectedRevision: number) =>
          invoke<number>('commit_database', { mutations, expectedRevision }),
        loadBank: () => invoke<BankDbState>('load_question_bank'),
        commitBank: (mutations: BankMutation[], expectedRevision: number) =>
          invoke<number>('commit_question_bank', { mutations, expectedRevision }),
      })
    : import('./webSqlite').then((m) => m.createWebDriver());
  return instance;
}
