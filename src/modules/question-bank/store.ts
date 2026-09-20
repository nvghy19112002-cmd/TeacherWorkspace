import { create } from 'zustand';
import { errorText } from '../../app/store';
import { getDriver } from '../../database/driver';
import { bankSnapshotSchema, emptyBankSnapshot, type BankSnapshot } from './domain/model';
import { decodeBank, diffBank } from './database/codec';
import { createKnttMath1011Curriculum } from './domain/knttMath1011';

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
        const data = decoded.curriculumNodes.length
          ? decoded
          : { ...decoded, curriculumNodes: createKnttMath1011Curriculum() };
        const revision =
          data === decoded
            ? loaded.revision
            : await (await getDriver()).commitBank(diffBank(decoded, data), loaded.revision);
        set({
          data,
          revision,
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
      const proposed = recipe(before);
      const after = bankSnapshotSchema.parse(proposed);
      const mutations = diffBank(before, after, proposed);
      if (mutations.length) {
        const revision = await (await getDriver()).commitBank(mutations, get().revision);
        set({ data: after, revision });
      }
    } finally {
      set({ busy: false });
    }
  },
  select: (selectedId) => set({ selectedId }),
}));
