import { beforeEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), check: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: mocks.check }));
vi.mock('../src/database/driver', () => ({ isDesktop: true }));
import { useUpdates } from '../src/modules/updates/store';
import { useWorkspace } from '../src/app/store';
describe('updater state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdates.setState({
      phase: 'idle',
      update: null,
      downloaded: 0,
      total: undefined,
      error: '',
      backupPath: '',
      checkedAt: '',
    });
    useWorkspace.setState({ busy: false });
  });
  it('does not falsely claim latest when no release channel exists', async () => {
    mocks.invoke.mockResolvedValue(false);
    await useUpdates.getState().checkNow();
    expect(useUpdates.getState().phase).toBe('unconfigured');
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it('reports network errors without installing', async () => {
    mocks.invoke.mockResolvedValue(true);
    mocks.check.mockRejectedValue(new Error('offline'));
    await useUpdates.getState().checkNow();
    expect(useUpdates.getState().phase).toBe('error');
  });
  it('downloads, backs up, then installs in that order', async () => {
    const order: string[] = [];
    mocks.invoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'updater_ready') return true;
      order.push('backup');
      return 'backup.sqlite3';
    });
    const update = {
      version: '1.2.0',
      download: vi.fn(async () => {
        order.push('download');
      }),
      install: vi.fn(async () => {
        order.push('install');
      }),
      close: vi.fn(),
    };
    mocks.check.mockResolvedValue(update);
    await useUpdates.getState().checkNow();
    await useUpdates.getState().install();
    expect(order).toEqual(['download', 'backup', 'install']);
    expect(useUpdates.getState().phase).toBe('installed');
  });
  it('backup failure prevents installation', async () => {
    mocks.invoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'updater_ready') return true;
      throw new Error('disk full');
    });
    const update = { version: '1.2.0', download: vi.fn(), install: vi.fn(), close: vi.fn() };
    mocks.check.mockResolvedValue(update);
    await useUpdates.getState().checkNow();
    await useUpdates.getState().install();
    expect(update.install).not.toHaveBeenCalled();
    expect(useUpdates.getState().phase).toBe('error');
  });
  it('failed download or signature verification prevents backup and install', async () => {
    mocks.invoke.mockResolvedValue(true);
    const update = {
      version: '1.2.0',
      download: vi.fn().mockRejectedValue(new Error('signature invalid')),
      install: vi.fn(),
      close: vi.fn(),
    };
    mocks.check.mockResolvedValue(update);
    await useUpdates.getState().checkNow();
    await useUpdates.getState().install();
    expect(update.install).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
  it('blocks installation while data is being committed', async () => {
    mocks.invoke.mockResolvedValue(true);
    const update = { version: '1.2.0', download: vi.fn(), install: vi.fn(), close: vi.fn() };
    mocks.check.mockResolvedValue(update);
    await useUpdates.getState().checkNow();
    useWorkspace.setState({ busy: true });
    await useUpdates.getState().install();
    expect(update.download).not.toHaveBeenCalled();
  });
});
