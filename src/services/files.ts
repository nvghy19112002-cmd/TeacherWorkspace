import { isDesktop } from '../database/driver';
export async function saveFile(name: string, bytes: Uint8Array, mime: string): Promise<boolean> {
  if (isDesktop) {
    const [{ save }, { writeFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ]);
    const path = await save({
      defaultPath: name,
      filters: [
        {
          name: mime.includes('png') ? 'PNG' : mime === 'application/x-tex' ? 'LaTeX' : 'JSON',
          extensions: [
            mime.includes('png') ? 'png' : mime === 'application/x-tex' ? 'tex' : 'json',
          ],
        },
      ],
    });
    if (!path) return false;
    await writeFile(path, bytes);
    return true;
  }
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
export async function openBackupFile(): Promise<string | null> {
  if (isDesktop) {
    const [{ open }, { readTextFile, stat }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ]);
    const path = await open({
      multiple: false,
      filters: [{ name: 'Teacher Workspace backup', extensions: ['json'] }],
    });
    if (!path) return null;
    if ((await stat(path)).size > 50 * 1024 * 1024) throw new Error('Backup vượt quá 50 MB.');
    return readTextFile(path);
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.oncancel = () => resolve(null);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > 50 * 1024 * 1024) return reject(new Error('Backup vượt quá 50 MB.'));
      void file.text().then(resolve, reject);
    };
    input.click();
  });
}
