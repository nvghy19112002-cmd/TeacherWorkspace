import { invoke } from '@tauri-apps/api/core';
import { isDesktop } from '../../../database/driver';
import { readKeyPool, orderedKeys } from '../domain/keyPool';
import { useWorkspace } from '../../../app/store';
const sessionKeys = new Map<string, string>();
export async function readKey(id = 'default'): Promise<string> {
  return isDesktop ? invoke<string>('ai_read_key', { id }) : (sessionKeys.get(id) ?? '');
}
export async function storeKey(key: string, id = 'default'): Promise<void> {
  const clean = key.trim();
  if (clean && (clean.length < 10 || clean.length > 300 || /\s/.test(clean)))
    throw new Error('API key không hợp lệ.');
  if (isDesktop) await invoke('ai_store_key', { key: clean, id });
  else if (clean) sessionKeys.set(id, clean);
  else sessionKeys.delete(id);
}
export async function deleteKey(id: string): Promise<void> {
  if (isDesktop) await invoke('ai_delete_key', { id });
  else sessionKeys.delete(id);
}
export async function readPreferredKey(): Promise<{ id: string; key: string }> {
  const raw = useWorkspace.getState().data.settings.moduleState?.aiKeyPool;
  const pool = readKeyPool(raw);
  const ordered = orderedKeys(pool);
  const selected = ordered.find((item) => item.id === pool.activeId) ?? ordered[0];
  if (selected) {
    const key = await readKey(selected.id);
    if (key) return { id: selected.id, key };
  }
  const legacy = await readKey('default');
  if (legacy) return { id: 'default', key: legacy };
  throw new Error('Chưa có API key. Hãy mở Cài đặt → API key.');
}
export function redact(text: string, key: string): string {
  return key ? text.split(key).join('[REDACTED]') : text;
}
