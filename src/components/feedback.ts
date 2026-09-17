import { create } from 'zustand';
import { errorText, useWorkspace } from '../app/store';
import type { Snapshot } from '../modules/schedule/domain/model';
interface Toast {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
}
export const useToasts = create<{
  toasts: Toast[];
  push: (message: string, tone?: Toast['tone']) => void;
  dismiss: (id: string) => void;
}>((set) => ({
  toasts: [],
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  push: (message, tone = 'success') => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts.slice(-1), { id, message, tone }] }));
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      tone === 'error' ? 12000 : 6000,
    );
  },
}));
export function useMutation() {
  const commit = useWorkspace((s) => s.commit);
  const push = useToasts((s) => s.push);
  return async (
    recipe: (s: Snapshot) => Snapshot,
    message = 'Đã lưu thay đổi.',
  ): Promise<boolean> => {
    try {
      await commit(recipe);
      push(message);
      return true;
    } catch (e) {
      push(errorText(e), 'error');
      return false;
    }
  };
}
