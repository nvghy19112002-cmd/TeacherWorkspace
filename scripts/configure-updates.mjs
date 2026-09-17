import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export function validateUpdateConfig(endpoint, pubkey) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash)
    throw new Error('Cần URL HTTPS không chứa mật khẩu hoặc fragment.');
  const decoded = Buffer.from(pubkey.trim(), 'base64').toString('utf8');
  if (!decoded.startsWith('untrusted comment:') || decoded.trim().split('\n').length !== 2)
    throw new Error(
      'Khóa công khai không đúng định dạng Tauri. Chọn file .pub do tauri signer generate tạo.',
    );
  const keyLine = decoded.trim().split('\n')[1].trim();
  if (Buffer.from(keyLine, 'base64').length !== 42) throw new Error('Khóa công khai không hợp lệ.');
  return { pubkey: pubkey.trim(), endpoints: [url.href], windows: { installMode: 'passive' } };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [endpoint, pubkeyFile] = process.argv.slice(2);
  if (!endpoint || !pubkeyFile)
    throw new Error(
      'Cách dùng: npm run release:configure -- https://.../latest.json C:/.../updater.key.pub',
    );
  const updater = validateUpdateConfig(endpoint, readFileSync(pubkeyFile, 'utf8'));
  const path = new URL('../src-tauri/tauri.conf.json', import.meta.url);
  const config = JSON.parse(readFileSync(path, 'utf8'));
  if (config.plugins?.updater?.pubkey && config.plugins.updater.pubkey !== updater.pubkey)
    throw new Error(
      'Không tự thay khóa đang phát hành. Việc đổi khóa cần kế hoạch chuyển đổi cho các bản đã cài.',
    );
  config.plugins = { ...config.plugins, updater };
  config.bundle.createUpdaterArtifacts = true;
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
  console.log(
    'Đã cấu hình kênh cập nhật và bật ký bản phát hành. Khóa riêng không được chép vào project.',
  );
}
