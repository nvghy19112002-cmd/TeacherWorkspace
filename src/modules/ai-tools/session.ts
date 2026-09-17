import { create } from 'zustand';
import type { Report } from './domain/model';
interface Session {
  source: string;
  previous: string | null;
  report: Report | null;
  reviewedSource: string | null;
  promptId: string;
  grade: string;
  chapter: string;
  target: string;
  rules: string;
  setSource: (source: string) => void;
  undo: () => void;
}
// Drafts remain in memory when changing screens; only explicit reports enter SQLite.
export const useAiSession = create<Session>((set, get) => ({
  source: '',
  previous: null,
  report: null,
  reviewedSource: null,
  promptId: 'builtin-exam_review',
  grade: '10',
  chapter: '',
  target: '',
  rules: '',
  setSource: (source) => set({ previous: get().source, source }),
  undo: () => {
    const { source, previous } = get();
    if (previous !== null) set({ source: previous, previous: source });
  },
}));
