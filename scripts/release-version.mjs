import { readFileSync, writeFileSync } from 'node:fs';
const version = process.argv[2];
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version || ''))
  throw new Error('Nhập phiên bản x.y.z, ví dụ npm run release:version -- 1.1.1');
for (const name of ['package.json', 'package-lock.json', 'src-tauri/tauri.conf.json']) {
  const path = new URL('../' + name, import.meta.url);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  data.version = version;
  if (data.packages?.['']) data.packages[''].version = version;
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
const cargo = new URL('../src-tauri/Cargo.toml', import.meta.url);
writeFileSync(
  cargo,
  readFileSync(cargo, 'utf8').replace(/^version = "[^"]+"/m, `version = "${version}"`),
);
console.log(`Đã đồng bộ phiên bản ${version}.`);
