import { create } from 'zustand';
import { today } from '../core/time';
import type { ScheduleOccurrence } from '../modules/schedule/domain/model';
import type { OccurrenceEdit } from '../modules/schedule/domain/commands';
export interface WorkEditorRequest {
  date?: string;
  startTime?: string;
  workItemId?: string;
  metadataId?: string;
}
export interface OccurrenceRequest {
  occurrence: ScheduleOccurrence;
  edit?: OccurrenceEdit;
  mode?: 'edit' | 'makeup' | 'delete';
}
interface UiState {
  navigationGuard: (() => boolean) | null;
  page: string;
  focusDate: string;
  workEditor: WorkEditorRequest | null;
  occurrenceEditor: OccurrenceRequest | null;
  exportOpen: boolean;
  workspaceManager: boolean;
  navigate: (page: string) => void;
  setDate: (date: string) => void;
  openWork: (request?: WorkEditorRequest) => void;
  closeWork: () => void;
  openOccurrence: (request: OccurrenceRequest) => void;
  closeOccurrence: () => void;
  setExport: (open: boolean) => void;
  setWorkspaceManager: (open: boolean) => void;
}
export const useUi = create<UiState>((set) => ({
  navigationGuard: null,
  page: 'schedule',
  focusDate: today(),
  workEditor: null,
  occurrenceEditor: null,
  exportOpen: false,
  workspaceManager: false,
  navigate: (page) => {
    if (useUi.getState().navigationGuard?.() === false) return;
    set({ page });
  },
  setDate: (focusDate) => set({ focusDate }),
  openWork: (workEditor = {}) => set({ workEditor }),
  closeWork: () => set({ workEditor: null }),
  openOccurrence: (occurrenceEditor) => set({ occurrenceEditor }),
  closeOccurrence: () => set({ occurrenceEditor: null }),
  setExport: (exportOpen) => set({ exportOpen }),
  setWorkspaceManager: (workspaceManager) => set({ workspaceManager }),
}));
