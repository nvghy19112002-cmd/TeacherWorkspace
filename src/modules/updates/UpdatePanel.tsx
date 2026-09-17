import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { exit, relaunch } from '@tauri-apps/plugin-process';
import { useUpdates, isUpdating } from './store';
import { isDesktop } from '../../database/driver';
import { Modal } from '../../components/Modal';
import { errorText, useWorkspace } from '../../app/store';
import pkg from '../../../package.json';

interface ManualUpdateInfo {
  path: string;
  fileName: string;
  version: string;
  currentVersion: string;
  sizeBytes: number;
  sha256: string;
}

type ManualPhase = 'idle' | 'checking' | 'ready' | 'backup' | 'launching' | 'error';

export function UpdatePanel() {
  const s = useUpdates();
  const [confirm, setConfirm] = useState(false);
  const [restartError, setRestartError] = useState('');
  const [manual, setManual] = useState<ManualUpdateInfo | null>(null);
  const [manualPhase, setManualPhase] = useState<ManualPhase>('idle');
  const [manualError, setManualError] = useState('');
  const [manualBackupPath, setManualBackupPath] = useState('');
  const [manualConfirm, setManualConfirm] = useState(false);

  async function chooseManualUpdate() {
    if (!isDesktop) return;
    setManualError('');
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        title: 'Chọn bản cập nhật Teacher Workspace',
        filters: [{ name: 'Teacher Workspace installer', extensions: ['exe'] }],
      });
      if (typeof selected !== 'string') return;
      setManualPhase('checking');
      const info = await invoke<Omit<ManualUpdateInfo, 'path'>>('inspect_manual_update', {
        path: selected,
      });
      setManual({ ...info, path: selected });
      setManualPhase('ready');
    } catch (error) {
      setManual(null);
      setManualPhase('error');
      setManualError(errorText(error));
    }
  }

  async function installManualUpdate() {
    if (!manual || manualPhase !== 'ready') return;
    if (useWorkspace.getState().busy) {
      setManualError('Ứng dụng đang lưu dữ liệu. Hãy đợi vài giây rồi thử lại.');
      setManualPhase('error');
      return;
    }
    setManualConfirm(false);
    setManualError('');
    try {
      setManualPhase('backup');
      const backupPath = await invoke<string>('backup_before_update');
      setManualBackupPath(backupPath);
      setManualPhase('launching');
      await invoke('launch_manual_update', {
        path: manual.path,
        expectedSha256: manual.sha256,
      });
      await exit(0);
    } catch (error) {
      setManualPhase('error');
      setManualError(errorText(error));
    }
  }
  return (
    <section className="panel">
      <h2>Cập nhật Teacher Workspace</h2>
      <p>
        Phiên bản đang dùng: <strong>{pkg.version}</strong>
      </p>
      <p>Bản mới được kiểm tra chữ ký. Ứng dụng tự sao lưu dữ liệu trước khi cài.</p>
      {!isDesktop && <p>Cập nhật ứng dụng chỉ dùng trên bản Windows đã cài đặt.</p>}
      {s.phase === 'unconfigured' && (
        <p role="status">
          Bản này chưa được kết nối kênh phát hành. Cần cấu hình địa chỉ cập nhật và khóa xác minh
          trong bản cài đầu tiên.
        </p>
      )}
      {s.phase === 'current' && (
        <p role="status">Anh đang dùng phiên bản mới nhất trên kênh phát hành.</p>
      )}
      {s.checkedAt && <p>Lần kiểm tra: {s.checkedAt}</p>}
      {s.error && (
        <p role="alert">
          Không hoàn tất cập nhật: {s.error}. Dữ liệu hiện tại được giữ lại. Hãy kiểm tra kết nối và
          thử lại.
        </p>
      )}
      {s.phase === 'available' && s.update && (
        <div>
          <h3>Có phiên bản {s.update.version}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>
            {s.update.body || 'Bản cải tiến Teacher Workspace.'}
          </p>
          <button className="button primary" onClick={() => setConfirm(true)}>
            Tải và cập nhật
          </button>
        </div>
      )}
      <button
        className="button"
        disabled={
          !isDesktop || s.phase === 'checking' || isUpdating(s.phase) || s.phase === 'installed'
        }
        onClick={() => void s.checkNow()}
      >
        {s.phase === 'checking' ? 'Đang kiểm tra…' : 'Kiểm tra cập nhật'}
      </button>
      {s.phase === 'installed' && (
        <button
          className="button primary"
          onClick={() => void relaunch().catch((e) => setRestartError(errorText(e)))}
        >
          Khởi động lại ứng dụng
        </button>
      )}
      {restartError && <p role="alert">{restartError}. Hãy đóng và mở lại ứng dụng.</p>}
      {s.backupPath && <p style={{ overflowWrap: 'anywhere' }}>Bản sao lưu: {s.backupPath}</p>}
      <hr />
      <h3>Cập nhật từ file đã tải</h3>
      <p>
        Chọn installer do Teacher Workspace phát hành. Ứng dụng kiểm tra tên, phiên bản, định dạng
        Windows và tính toàn vẹn của file trước khi mở trình cài đặt.
      </p>
      <button
        className="button secondary"
        disabled={
          !isDesktop ||
          manualPhase === 'checking' ||
          manualPhase === 'backup' ||
          manualPhase === 'launching'
        }
        onClick={() => void chooseManualUpdate()}
      >
        {manualPhase === 'checking' ? 'Đang kiểm tra file…' : 'Chọn file cập nhật (.exe)'}
      </button>
      {manual && manualPhase === 'ready' && (
        <div className="manual-update-card">
          <strong>{manual.fileName}</strong>
          <span>
            Phiên bản {manual.version} · {(manual.sizeBytes / 1048576).toFixed(1)} MB
          </span>
          <small title={manual.sha256}>SHA-256: {manual.sha256}</small>
          <button className="button primary" onClick={() => setManualConfirm(true)}>
            Cập nhật lên {manual.version}
          </button>
        </div>
      )}
      {(manualPhase === 'backup' || manualPhase === 'launching') && (
        <p role="status">
          {manualPhase === 'backup'
            ? 'Đang sao lưu toàn bộ dữ liệu…'
            : 'Đang mở trình cài đặt. Ứng dụng sẽ tự đóng…'}
        </p>
      )}
      {manualError && <p role="alert">Không thể cập nhật từ file: {manualError}</p>}
      {manualBackupPath && (
        <p style={{ overflowWrap: 'anywhere' }}>Bản sao lưu thủ công: {manualBackupPath}</p>
      )}
      {confirm && (
        <Modal title="Cập nhật ứng dụng" onClose={() => setConfirm(false)}>
          <p>
            Ứng dụng sẽ tạm khóa thao tác, tải bản mới, sao lưu dữ liệu và chạy trình cài đặt. Hãy
            lưu công việc đang mở trước khi tiếp tục.
          </p>
          <button className="button" onClick={() => setConfirm(false)}>
            Để sau
          </button>
          <button
            className="button primary"
            onClick={() => {
              setConfirm(false);
              void s.install();
            }}
          >
            Cập nhật ngay
          </button>
        </Modal>
      )}
      {manualConfirm && manual && (
        <Modal title={`Cập nhật lên ${manual.version}?`} onClose={() => setManualConfirm(false)}>
          <p>
            Ứng dụng sẽ sao lưu toàn bộ thời khóa biểu và Ngân hàng câu hỏi, mở installer đã chọn
            rồi tự đóng. Hãy chỉ tiếp tục nếu file này đến từ nguồn phát hành Teacher Workspace của
            anh.
          </p>
          <p>
            <strong>{manual.fileName}</strong>
          </p>
          <button className="button secondary" onClick={() => setManualConfirm(false)}>
            Hủy
          </button>
          <button className="button primary" onClick={() => void installManualUpdate()}>
            Sao lưu và cập nhật
          </button>
        </Modal>
      )}
    </section>
  );
}

export function UpdateOverlay() {
  const s = useUpdates();
  if (!isUpdating(s.phase)) return null;
  const progress = s.total ? Math.min(100, (100 * s.downloaded) / s.total) : undefined;
  return (
    <div className="update-overlay" role="dialog" aria-modal="true" aria-label="Đang cập nhật">
      <section className="panel">
        <h2>
          {s.phase === 'downloading'
            ? 'Đang tải bản cập nhật…'
            : s.phase === 'backup'
              ? 'Đang sao lưu dữ liệu…'
              : 'Đang cài đặt bản mới…'}
        </h2>
        <progress max={100} value={progress} />
        <p>
          {progress === undefined
            ? `${(s.downloaded / 1048576).toFixed(1)} MB`
            : `${Math.round(progress)}%`}
        </p>
        <p>Vui lòng giữ ứng dụng mở cho đến khi trình cài đặt tiếp quản.</p>
      </section>
    </div>
  );
}
