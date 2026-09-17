import { create } from 'zustand';
import { errorText } from '../../app/store';
import { getDriver } from '../../database/driver';
import { bankSnapshotSchema, emptyBankSnapshot, type BankSnapshot } from './domain/model';
import { decodeBank, diffBank } from './database/codec';
import { KNTT_MATH_10_11 } from './data/kntt-math-10-11';

interface QuestionBankStore {
  data: BankSnapshot;
  revision: number;
  ready: boolean;
  busy: boolean;
  error: string | null;
  selectedId: string | null;
  initialize: () => Promise<void>;
  commit: (recipe: (current: BankSnapshot) => BankSnapshot) => Promise<void>;
  select: (id: string | null) => void;
  seedKnttCurriculum: () => Promise<number>;
}

let startup: Promise<void> | undefined;
export const useQuestionBank = create<QuestionBankStore>((set, get) => ({
  data: emptyBankSnapshot(),
  revision: 0,
  ready: false,
  busy: false,
  error: null,
  selectedId: null,
  initialize: async () => {
    startup ??= (async () => {
      set({ error: null });
      try {
        const loaded = await (await getDriver()).loadBank();
        const decoded = decodeBank(loaded.tables);
        const initial = decoded.curriculumNodes.length === 0
          ? { ...decoded, curriculumNodes: KNTT_MATH_10_11 }
          : decoded;
        if (initial !== decoded) {
          const revision = await (await getDriver()).commitBank(diffBank(decoded, initial), loaded.revision);
          set({ data: initial, revision, ready: true, busy: false });
          return;
        }
        set({
          data: initial,
          revision: loaded.revision,
          ready: true,
          busy: false,
        });
      } catch (error) {
        set({ error: errorText(error), ready: false, busy: false });
      }
    })();
    await startup;
    startup = undefined;
  },
  commit: async (recipe) => {
    if (get().busy) throw new Error('Ngân hàng đang lưu thay đổi. Vui lòng đợi.');
    set({ busy: true });
    try {
      const before = get().data;
      const after = bankSnapshotSchema.parse(recipe(before));
      const mutations = diffBank(before, after);
      if (mutations.length) {
        const revision = await (await getDriver()).commitBank(mutations, get().revision);
        set({ data: after, revision });
      }
    } finally {
      set({ busy: false });
    }
  },
  select: (selectedId) => set({ selectedId }),
  seedKnttCurriculum: async () => {
    const current = get().data.curriculumNodes;
    const ids = new Set(current.map((node) => node.id));
    const missing = KNTT_MATH_10_11.filter((node) => !ids.has(node.id));
    if (!missing.length) return 0;
    await get().commit((snapshot) => ({ ...snapshot, curriculumNodes: [...snapshot.curriculumNodes, ...missing] }));
    return missing.length;
  },
}));
