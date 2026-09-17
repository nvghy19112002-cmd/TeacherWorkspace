import { useState } from 'react';
import { Archive, ArchiveRestore, Copy, Pencil, Trash2, Plus, Check } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useWorkspace } from '../../app/store';
import { useUi } from '../../app/ui';
import { useMutation } from '../../components/feedback';
import { createWorkspace, deleteWorkspace, duplicateWorkspace } from '../../core/workspaces';
export function WorkspaceManager() {
  const data = useWorkspace((s) => s.data);
  const busy = useWorkspace((s) => s.busy);
  const close = () => useUi.getState().setWorkspaceManager(false);
  const mutate = useMutation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const create = async () => {
    if (await mutate((s) => createWorkspace(s, name, description), 'Đã tạo thời khóa biểu.')) {
      setName('');
      setDescription('');
    }
  };
  return (
    <Modal
      title="Các thời khóa biểu"
      subtitle="Tách lịch ở trường, trung tâm và lớp dạy thêm thành từng không gian."
      onClose={close}
      wide
    >
      <div className="modal-body">
        <div className="workspace-list">
          {data.workspaces.map((w) => (
            <div key={w.id} className={`workspace-row ${w.archived ? 'archived' : ''}`}>
              <button
                className="workspace-select"
                disabled={w.archived || busy}
                onClick={() =>
                  void mutate(
                    (s) => ({ ...s, settings: { ...s.settings, activeWorkspaceId: w.id } }),
                    'Đã chuyển thời khóa biểu.',
                  ).then((ok) => {
                    if (ok) close();
                  })
                }
              >
                <span className="workspace-avatar">{w.name.charAt(0).toUpperCase()}</span>
                <span>
                  <strong>{w.name}</strong>
                  <small>
                    {w.archived
                      ? 'Đã lưu trữ'
                      : w.description ||
                        `${data.workItems.filter((i) => i.workspaceId === w.id).length} công việc`}
                  </small>
                </span>
                {data.settings.activeWorkspaceId === w.id && <Check size={17} />}
              </button>
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label={`Đổi tên ${w.name}`}
                  title="Đổi tên"
                  onClick={() => {
                    setRenameId(w.id);
                    setNewName(w.name);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Nhân bản ${w.name}`}
                  title="Nhân bản"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      (s) => duplicateWorkspace(s, w.id),
                      'Đã nhân bản toàn bộ lịch và ngoại lệ.',
                    )
                  }
                >
                  <Copy size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={w.archived ? `Khôi phục ${w.name}` : `Lưu trữ ${w.name}`}
                  title={w.archived ? 'Khôi phục' : 'Lưu trữ'}
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      (s) => ({
                        ...s,
                        workspaces: s.workspaces.map((x) =>
                          x.id === w.id ? { ...x, archived: !x.archived } : x,
                        ),
                        settings: {
                          ...s.settings,
                          activeWorkspaceId:
                            !w.archived && s.settings.activeWorkspaceId === w.id
                              ? (s.workspaces.find((x) => x.id !== w.id && !x.archived)?.id ?? null)
                              : s.settings.activeWorkspaceId,
                        },
                      }),
                      w.archived ? 'Đã khôi phục.' : 'Đã lưu trữ, dữ liệu vẫn được giữ.',
                    )
                  }
                >
                  {w.archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}
                </button>
                <button
                  className="icon-button danger-text"
                  aria-label={`Xóa ${w.name}`}
                  title="Xóa"
                  onClick={() => setDeleteId(w.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {renameId === w.id && (
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void mutate(
                      (s) => ({
                        ...s,
                        workspaces: s.workspaces.map((x) =>
                          x.id === w.id ? { ...x, name: newName } : x,
                        ),
                      }),
                      'Đã đổi tên.',
                    ).then((ok) => {
                      if (ok) setRenameId(null);
                    });
                  }}
                >
                  <input
                    aria-label="Tên mới"
                    maxLength={100}
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <button className="button primary small" disabled={busy}>
                    Lưu tên
                  </button>
                  <button
                    type="button"
                    className="button ghost small"
                    onClick={() => setRenameId(null)}
                  >
                    Đóng
                  </button>
                </form>
              )}
              {deleteId === w.id && (
                <div className="delete-confirm">
                  <p>
                    Xóa “{w.name}” cùng toàn bộ công việc, quy luật và ngoại lệ? Thao tác này không
                    thể hoàn tác. Anh có thể xuất backup trong Cài đặt trước.
                  </p>
                  <button
                    className="button danger small"
                    disabled={busy}
                    onClick={() =>
                      void mutate((s) => deleteWorkspace(s, w.id), 'Đã xóa thời khóa biểu.').then(
                        (ok) => {
                          if (ok) setDeleteId(null);
                        },
                      )
                    }
                  >
                    Xác nhận xóa
                  </button>
                  <button className="button secondary small" onClick={() => setDeleteId(null)}>
                    Giữ lại
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <form
          className="create-workspace"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <h3>
            <Plus size={18} />
            Tạo thời khóa biểu mới
          </h3>
          <div className="form-grid">
            <label className="field">
              Tên thời khóa biểu
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Học kỳ I · 2026–2027"
              />
            </label>
            <label className="field">
              Mô tả
              <input
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ghi chú về không gian này"
              />
            </label>
          </div>
          <button className="button primary small" type="submit" disabled={busy || !name.trim()}>
            Tạo thời khóa biểu
          </button>
        </form>
      </div>
      <div className="modal-footer">
        <button className="button secondary" onClick={close}>
          Đóng
        </button>
      </div>
    </Modal>
  );
}
