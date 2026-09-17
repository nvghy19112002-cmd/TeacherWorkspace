import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const repo = process.env.GITHUB_REPOSITORY;
if (repo !== 'nvghy19112002-cmd/TeacherWorkspace') throw new Error('Wrong release repository.');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const cargo = readFileSync('src-tauri/Cargo.toml', 'utf8');
if (
  !/^\d+\.\d+\.\d+$/.test(pkg.version) ||
  config.version !== pkg.version ||
  !cargo.includes(`version = "${pkg.version}"`)
)
  throw new Error('Package, Tauri and Cargo versions must match.');
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${pkg.version}`)
  throw new Error('Tag does not match source version.');
if (
  !config.bundle.createUpdaterArtifacts ||
  !config.plugins.updater.pubkey ||
  config.plugins.updater.endpoints[0] !==
    `https://github.com/${repo}/releases/latest/download/latest.json`
)
  throw new Error('Updater configuration is incomplete.');
if (!process.env.TAURI_SIGNING_PRIVATE_KEY?.trim())
  throw new Error(
    'Add the existing updater key to the TAURI_SIGNING_PRIVATE_KEY repository secret. Do not generate a replacement key.',
  );
try {
  const release = JSON.parse(
    execFileSync('gh', ['api', `repos/${repo}/releases/tags/v${pkg.version}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
  if (!release.draft)
    throw new Error(
      'This version is already published. Increase the version instead of overwriting an installed update.',
    );
} catch (error) {
  if (!String(error.stderr ?? '').includes('HTTP 404')) throw error;
}
try {
  const latest = JSON.parse(
    execFileSync('gh', ['api', `repos/${repo}/releases/latest`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
  const previous = latest.tag_name.replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(previous))
    throw new Error('Latest release has an unrecognized version; review the release channel.');
  const before = previous.split('.').map(BigInt);
  const after = pkg.version.split('.').map(BigInt);
  const different = after.findIndex((part, index) => part !== before[index]);
  if (different < 0 || after[different] < before[different])
    throw new Error('New release must be newer than the current latest release.');
} catch (error) {
  if (!String(error.stderr ?? '').includes('HTTP 404')) throw error;
}
console.log(`Release preflight passed for v${pkg.version}.`);
