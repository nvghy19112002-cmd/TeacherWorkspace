import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, basename } from 'node:path';
const [installer, downloadUrl, notesFile, output = 'latest.json'] = process.argv.slice(2);
if (!installer || !downloadUrl)
  throw new Error(
    'npm run release:manifest -- path/setup.exe https://.../setup.exe [notes.txt] [latest.json]',
  );
const url = new URL(downloadUrl);
if (url.protocol !== 'https:' || url.username || url.password)
  throw new Error('Bản cập nhật cần URL HTTPS.');
if (!installer.endsWith('.exe') || statSync(installer).size === 0)
  throw new Error('Cần bộ cài NSIS .exe đã build.');
const signature = readFileSync(installer + '.sig', 'utf8').trim();
if (!signature || !Buffer.from(signature, 'base64').toString().startsWith('untrusted comment:'))
  throw new Error('Thiếu chữ ký Tauri hợp lệ cạnh bộ cài.');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const manifest = {
  version: pkg.version,
  notes: notesFile ? readFileSync(notesFile, 'utf8') : `Teacher Workspace ${pkg.version}`,
  pub_date: new Date().toISOString(),
  platforms: { 'windows-x86_64': { url: url.href, signature } },
};
writeFileSync(resolve(output), JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `Đã tạo ${basename(output)}. Đăng bộ cài và chữ ký trước, sau đó đăng manifest. Chỉ dùng script này với bản Windows x64.`,
);
