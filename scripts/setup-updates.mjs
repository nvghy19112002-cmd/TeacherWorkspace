import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const rl = createInterface({ input: stdin, output: stdout });
const repo = (await rl.question('Link kho GitHub phat hanh (https://github.com/ten/kho): ')).trim();
rl.close();
const match = /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/.exec(repo);
if (!match) throw new Error('Link kho GitHub khong hop le.');
const endpoint = `https://github.com/${match[1]}/${match[2]}/releases/latest/download/latest.json`;
const config = JSON.parse(readFileSync(join(root, 'src-tauri/tauri.conf.json'), 'utf8'));
if (config.plugins?.updater?.pubkey)
  throw new Error(
    'Project da co kenh cap nhat. Khong tu tao khoa moi. Su dung khoa phat hanh hien co.',
  );
if (!process.env.LOCALAPPDATA) throw new Error('Chay trinh thiet lap tren Windows.');
const keyDir = join(process.env.LOCALAPPDATA, 'TeacherWorkspacePublisher');
mkdirSync(keyDir, { recursive: true });
const key = join(keyDir, 'updater.key');
const run = (args) => {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Thiet lap chua hoan tat.');
};
if (!existsSync(key))
  run([join(root, 'node_modules/@tauri-apps/cli/tauri.js'), 'signer', 'generate', '-w', key]);
if (!existsSync(key + '.pub'))
  throw new Error('Thieu file khoa cong khai. Khong ghi de khoa rieng hien co.');
run([join(root, 'scripts/configure-updates.mjs'), endpoint, key + '.pub']);
console.log(`Khoa rieng duoc luu tren may: ${key}`);
console.log(
  'Giu ban sao khoa rieng va mat khau o noi rieng. Khong gui khoa rieng vao chat hay commit len GitHub.',
);
console.log(
  'Chua co ban nao duoc dang len Internet. Doc docs/CAP_NHAT_VA_SU_DUNG.md de build va phat hanh.',
);
