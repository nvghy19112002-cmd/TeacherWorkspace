import { create } from 'zustand';
import { ZodError } from 'zod';
import { getDriver } from '../database/driver';
import { decode, diff } from '../database/codec';
import { initialSnapshot } from '../core/workspaces';
import { emptySnapshot, snapshotSchema, type Snapshot } from '../modules/schedule/domain/model';
interface WorkspaceStore {
  data: Snapshot;
  revision: number;
  ready: boolean;
  busy: boolean;
  error: string | null;
  savedAt: string | null;
  initialize: () => Promise<void>;
  commit: (recipe: (current: Snapshot) => Snapshot) => Promise<void>;
}
export function errorText(error: unknown): string {
  if (error instanceof ZodError)
    return [...new Set(error.issues.map((i) => i.message))].slice(0, 6).join(' ');
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Có lỗi xảy ra. Hãy thử lại.';
}
let startup: Promise<void> | undefined;
export const useWorkspace = create<WorkspaceStore>((set, get) => ({
  data: emptySnapshot(),
  revision: 0,
  ready: false,
  busy: false,
  error: null,
  savedAt: null,
  initialize: async () => {
    startup ??= (async () => {
      set({ error: null });
      try {
        const driver = await getDriver();
        const loaded = await driver.load();
        let data = decode(loaded.tables);
        let revision = loaded.revision;
        if (!loaded.tables.settings.length) {
          const initial = initialSnapshot();
          revision = await driver.commit(diff(data, initial), revision);
          data = initial;
        }
        set({ data, revision, ready: true, busy: false });
      } catch (error) {
        set({ error: errorText(error), ready: false });
      }
    })();
    await startup;
    startup = undefined;
  },
  commit: async (recipe) => {
    if (get().busy) throw new Error('Đang lưu thay đổi trước. Vui lòng đợi một chút.');
    set({ busy: true });
    try {
      const before = get().data;
      const after = snapshotSchema.parse(recipe(before));
      const mutations = diff(before, after);
      if (mutations.length) {
        const revision = await (await getDriver()).commit(mutations, get().revision);
        set({ data: after, revision, savedAt: new Date().toISOString() });
      }
    } finally {
      set({ busy: false });
    }
  },
}));
