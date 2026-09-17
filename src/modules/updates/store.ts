import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { isDesktop } from '../../database/driver';
import { useWorkspace, errorText } from '../../app/store';

type Phase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'current'
  | 'unconfigured'
  | 'downloading'
  | 'backup'
  | 'installing'
  | 'installed'
  | 'error';
interface UpdateState {
  phase: Phase;
  update: Update | null;
  downloaded: number;
  total?: number;
  error: string;
  backupPath: string;
  checkedAt: string;
  checkNow: () => Promise<void>;
  install: () => Promise<void>;
}
export const isUpdating = (p: Phase) => ['downloading', 'backup', 'installing'].includes(p);
export const useUpdates = create<UpdateState>((set, get) => ({
  phase: 'idle',
  update: null,
  downloaded: 0,
  error: '',
  backupPath: '',
  checkedAt: '',
  checkNow: async () => {
    if (get().phase === 'checking' || isUpdating(get().phase)) return;
    set({ phase: 'checking', error: '' });
    try {
      if (!isDesktop || !(await invoke<boolean>('updater_ready'))) {
        set({ phase: 'unconfigured' });
        return;
      }
      await get().update?.close();
      set({ update: null });
      const update = await check({ timeout: 20000 });
      set({
        update,
        phase: update ? 'available' : 'current',
        checkedAt: new Date().toLocaleString('vi-VN'),
      });
    } catch (e) {
      set({ phase: 'error', error: errorText(e) });
    }
  },
  install: async () => {
    const update = get().update;
    if (!update || get().phase !== 'available') return;
    if (useWorkspace.getState().busy) {
      set({ error: 'Đang lưu dữ liệu. Hãy chờ rồi bấm cập nhật lại.' });
      return;
    }
    set({ phase: 'downloading', error: '', downloaded: 0, total: undefined });
    try {
      await update.download((event) => {
        if (event.event === 'Started') set({ total: event.data.contentLength });
        if (event.event === 'Progress')
          set((s) => ({ downloaded: s.downloaded + event.data.chunkLength }));
      });
      set({ phase: 'backup' });
      // The global overlay blocks edits during download/backup/install.
      const backupPath = await invoke<string>('backup_before_update');
      set({ backupPath, phase: 'installing' });
      await update.install();
      set({ phase: 'installed' });
    } catch (e) {
      set({ phase: 'error', error: errorText(e) });
    }
  },
}));
