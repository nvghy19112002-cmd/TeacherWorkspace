import { useState } from 'react';
import { UpdatePanel } from '../updates/UpdatePanel';
import { Download, Upload, ShieldCheck, Settings2, HardDrive, FolderHeart } from 'lucide-react';
import { useWorkspace, errorText } from '../../app/store';
import { useUi } from '../../app/ui';
import { useMutation, useToasts } from '../../components/feedback';
import { Modal } from '../../components/Modal';
import { parseBackup, serializeBackup } from '../../services/backup';
import { openBackupFile, saveFile } from '../../services/files';
import { today } from '../../core/time';
import { isDesktop } from '../../database/driver';
import type { Settings, Snapshot } from '../schedule/domain/model';
import { ProviderSettings } from '../ai-tools/components/ProviderSettings';
import { readAiState } from '../ai-tools/services/state';
import { useQuestionBank } from '../question-bank/store';
import { bankSnapshotSchema } from '../question-bank/domain/model';
export default function SettingsPage() {
  const data = useWorkspace((s) => s.data);
  const busy = useWorkspace((s) => s.busy);
  const mutate = useMutation();
  const push = useToasts((s) => s.push);
  const [incoming, setIncoming] = useState<Snapshot | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const bank = useQuestionBank((s) => s.data);
  const bankCommit = useQuestionBank((s) => s.commit);
  const bankInitialize = useQuestionBank((s) => s.initialize);
  const aiModel = readAiState(data.settings.moduleState?.aiTools).model;
  const bankBackup = async () => {
    await bankInitialize();
    if (
      await saveFile(
        `TeacherWorkspace-question-bank-${today()}.json`,
        new TextEncoder().encode(
          JSON.stringify(
            {
              type: 'teacher-workspace-question-bank',
              version: 1,
              data: useQuestionBank.getState().data,
            },
            null,
            2,
          ),
        ),
        'application/json',
      )
    )
      push('Đã xuất backup Ngân hàng câu hỏi.');
  };
  const bankRestore = async () => {
    try {
      const text = await openBackupFile();
      if (!text) return;
      const parsed = JSON.parse(text) as { type?: string; data?: unknown };
      if (parsed.type !== 'teacher-workspace-question-bank')
        throw new Error('Đây không phải backup Ngân hàng câu hỏi.');
      const incomingBank = bankSnapshotSchema.parse(parsed.data);
      if (
        !window.confirm(
          `Thay thế ngân hàng hiện tại (${bank.questions.length} câu) bằng backup (${incomingBank.questions.length} câu)?`,
        )
      )
        return;
      await bankCommit(() => incomingBank);
      push('Đã khôi phục Ngân hàng câu hỏi.');
    } catch (e) {
      push(errorText(e), 'error');
    }
  };
  const patch = (settings: Partial<Settings>) =>
    void mutate((s) => ({ ...s, settings: { ...s.settings, ...settings } }), 'Đã lưu cài đặt.');
  const backup = async () => {
    setFileBusy(true);
    try {
      if (
        await saveFile(
          `TeacherWorkspace-backup-${today()}.json`,
          new TextEncoder().encode(serializeBackup(data)),
          'application/json',
        )
      )
        push('Đã xuất bản sao lưu.');
    } catch (e) {
      push(errorText(e), 'error');
    } finally {
      setFileBusy(false);
    }
  };
  const choose = async () => {
    setFileBusy(true);
    try {
      const text = await openBackupFile();
      if (text !== null) setIncoming(parseBackup(text));
    } catch (e) {
      push(errorText(e), 'error');
    } finally {
      setFileBusy(false);
    }
  };
  const restore = async () => {
    if (!incoming) return;
    setFileBusy(true);
    try {
      const saved = await saveFile(
        `TeacherWorkspace-before-restore-${today()}.json`,
        new TextEncoder().encode(serializeBackup(data)),
        'application/json',
      );
      if (!saved) {
        push('Đã dừng nhập backup vì bản sao dữ liệu hiện tại chưa được lưu.', 'info');
        return;
      }
      if (await mutate(() => incoming, 'Đã khôi phục dữ liệu từ bản sao lưu.')) setIncoming(null);
    } catch (e) {
      push(errorText(e), 'error');
    } finally {
      setFileBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE IT YOURS</div>
          <h1>Không gian theo cách anh.</h1>
          <p>Điều chỉnh cách hiển thị và giữ dữ liệu luôn trong tầm tay.</p>
        </div>
      </div>
      <div className="settings-grid">
        <UpdatePanel />
        <section className="panel">
          <h2>
            <ShieldCheck size={20} /> Gemini API key
          </h2>
          <p>
            Dùng chung cho Phản biện đề và AI phân loại câu hỏi. Key được lưu trong vùng credential
            của Windows.
          </p>
          <ProviderSettings model={aiModel} compact />
        </section>
        <section className="panel">
          <h2>
            <Settings2 size={20} />
            Giao diện và lịch
          </h2>
          <div className="settings-fields">
            <label className="field">
              Giao diện
              <select
                value={data.settings.theme}
                onChange={(e) => patch({ theme: e.target.value as Settings['theme'] })}
              >
                <option value="light">Light · Sáng</option>
                <option value="dark">Dark · Tối</option>
                <option value="system">Theo hệ thống</option>
              </select>
            </label>
            <label className="field">
              Bước kéo / thay đổi thời lượng
              <select
                value={data.settings.snapMinutes}
                onChange={(e) =>
                  patch({ snapMinutes: Number(e.target.value) as Settings['snapMinutes'] })
                }
              >
                {[5, 10, 15, 30].map((v) => (
                  <option key={v} value={v}>
                    {v} phút
                  </option>
                ))}
              </select>
              <small>Giờ nhập bằng bàn phím vẫn chính xác đến từng phút.</small>
            </label>
            <label className="field">
              Chế độ màu
              <select
                value={data.settings.colorMode}
                onChange={(e) => patch({ colorMode: e.target.value as Settings['colorMode'] })}
              >
                <option value="auto">Auto · Theo công việc</option>
                <option value="class">Theo lớp / tên công việc</option>
                <option value="category">Theo nhóm công việc</option>
                <option value="location">Theo địa điểm</option>
                <option value="custom">Custom · Màu tự chọn trong công việc</option>
              </select>
            </label>
            <div className="form-grid">
              <label className="field">
                Khung lịch từ
                <select
                  value={data.settings.dayStart}
                  onChange={(e) => patch({ dayStart: Number(e.target.value) })}
                >
                  {Array.from({ length: data.settings.dayEnd }, (_, i) => (
                    <option key={i} value={i}>
                      {`${i}`.padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Đến
                <select
                  value={data.settings.dayEnd}
                  onChange={(e) => patch({ dayEnd: Number(e.target.value) })}
                >
                  {Array.from(
                    { length: 24 - data.settings.dayStart },
                    (_, i) => i + data.settings.dayStart + 1,
                  ).map((i) => (
                    <option key={i} value={i}>
                      {`${i}`.padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              Mật độ lịch
              <select
                value={data.settings.hourHeight}
                onChange={(e) => patch({ hourHeight: Number(e.target.value) })}
              >
                <option value={48}>Gọn · 48 px / giờ</option>
                <option value={68}>Cân bằng · 68 px / giờ</option>
                <option value={96}>Thoáng · 96 px / giờ</option>
                <option value={120}>Lớn · 120 px / giờ</option>
              </select>
              <small>Khung giờ tự mở rộng nếu có ca nằm ngoài khoảng đã chọn.</small>
            </label>
          </div>
        </section>
        <div className="settings-stack">
          <section className="panel">
            <h2>
              <ShieldCheck size={20} />
              Sao lưu và khôi phục
            </h2>
            <p>
              Backup JSON có phiên bản, gồm tất cả thời khóa biểu, công việc, lịch lặp, ngoại lệ và
              cài đặt.
            </p>
            <div className="backup-actions">
              <button
                className="button primary"
                disabled={busy || fileBusy}
                onClick={() => void backup()}
              >
                <Download size={17} />
                Xuất backup
              </button>
              <button
                className="button secondary"
                disabled={busy || fileBusy}
                onClick={() => void choose()}
              >
                <Upload size={17} />
                Nhập backup
              </button>
            </div>
            <hr />
            <p>
              <strong>Ngân hàng câu hỏi</strong> được sao lưu riêng để tránh đưa API key vào tệp.
            </p>
            <div className="backup-actions">
              <button className="button secondary" onClick={() => void bankBackup()}>
                <Download size={17} /> Xuất ngân hàng
              </button>
              <button className="button secondary" onClick={() => void bankRestore()}>
                <Upload size={17} /> Nhập ngân hàng
              </button>
            </div>
            <div className="report-note">
              Khi nhập backup, ứng dụng yêu cầu lưu bản sao dữ liệu hiện tại trước rồi mới thay thế
              bằng một giao dịch.
            </div>
          </section>
          <section className="panel">
            <h2>
              <FolderHeart size={20} />
              Nhiều thời khóa biểu
            </h2>
            <p>Tạo, đổi tên, nhân bản và lưu trữ lịch riêng cho mỗi nơi dạy hoặc học kỳ.</p>
            <button
              className="button secondary"
              onClick={() => useUi.getState().setWorkspaceManager(true)}
            >
              Quản lý thời khóa biểu
            </button>
          </section>
          <section className="panel local-panel">
            <h2>
              <HardDrive size={20} />
              Dữ liệu của anh
            </h2>
            <p>
              {isDesktop
                ? 'SQLite trên máy tính. Ứng dụng hoạt động hoàn toàn offline.'
                : 'Chế độ phát triển trong trình duyệt: SQLite được lưu trong IndexedDB của trình duyệt này.'}
            </p>
            <dl>
              <div>
                <dt>Thời khóa biểu</dt>
                <dd>{data.workspaces.length}</dd>
              </div>
              <div>
                <dt>Công việc</dt>
                <dd>{data.workItems.length}</dd>
              </div>
              <div>
                <dt>Quy luật / ngoại lệ</dt>
                <dd>
                  {data.rules.length} / {data.exceptions.length}
                </dd>
              </div>
            </dl>
            <small>
              Giờ lịch là giờ địa phương trên thiết bị. Các ca qua nửa đêm cần tách thành hai ca.
            </small>
          </section>
        </div>
      </div>
      {incoming && (
        <Modal
          title="Khôi phục từ backup?"
          subtitle="Dữ liệu hiện tại sẽ được thay thế toàn bộ bằng dữ liệu trong tệp."
          onClose={() => setIncoming(null)}
        >
          <div className="modal-body">
            <div className="restore-summary">
              <strong>{incoming.workspaces.length} thời khóa biểu</strong>
              <span>
                {incoming.workItems.length} công việc · {incoming.rules.length} quy luật ·{' '}
                {incoming.exceptions.length} ngoại lệ
              </span>
            </div>
            <p>
              Trước khi thay thế, anh sẽ được chọn nơi lưu bản sao của dữ liệu đang có. Hủy lưu bản
              sao sẽ dừng việc khôi phục.
            </p>
          </div>
          <div className="modal-footer">
            <button className="button secondary" onClick={() => setIncoming(null)}>
              Giữ dữ liệu hiện tại
            </button>
            <button
              className="button danger"
              disabled={busy || fileBusy}
              onClick={() => void restore()}
            >
              {fileBusy ? 'Đang xử lý…' : 'Sao lưu và thay thế'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
