import { useState } from 'react';
import { Trash2, Download } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { useToasts } from '../../../components/feedback';
import { errorText } from '../../../app/store';
import { saveFile } from '../../../services/files';
import { KINDS, type HistoryEntry } from '../domain/model';
import { saveAiState } from '../services/state';
import { ReportView } from './ReportView';
export function ReviewHistory({ entries }: { entries: HistoryEntry[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToasts((s) => s.push);
  const entry = entries.find((e) => e.id === selected);
  return (
    <section>
      <div className="ai-toolbar">
        <h2>Lịch sử cục bộ</h2>
        <button className="button" disabled={!entries.length} onClick={() => setRemove('all')}>
          <Trash2 size={16} />
          Xóa lịch sử
        </button>
      </div>
      <p>Lưu tối đa 20 báo cáo trong giới hạn dung lượng. Không lưu toàn bộ tài liệu đầu vào.</p>
      {!entries.length && <p>Chưa có báo cáo được lưu.</p>}
      {entries.map((item) => (
        <div className="ai-history-row" key={item.id}>
          <button className="button" onClick={() => setSelected(item.id)}>
            {item.title} • {new Date(item.createdAt).toLocaleString('vi-VN')}
          </button>
          <span>
            {KINDS[item.mode]} • {item.result.issues.length} vấn đề
          </span>
          <button
            className="icon-button"
            title="Xóa báo cáo"
            aria-label="Xóa báo cáo"
            onClick={() => setRemove(item.id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {entry && (
        <Modal
          wide
          title={entry.title}
          subtitle={`${entry.provider} • ${entry.model}`}
          onClose={() => setSelected(null)}
        >
          <ReportView report={entry.result} />
          <button
            className="button"
            onClick={() =>
              void saveFile(
                'ai-report.json',
                new TextEncoder().encode(JSON.stringify(entry, null, 2)),
                'application/json',
              ).catch((e: unknown) => toast(errorText(e), 'error'))
            }
          >
            <Download size={16} />
            Xuất báo cáo
          </button>
        </Modal>
      )}
      {remove && (
        <Modal
          title={remove === 'all' ? 'Xóa toàn bộ lịch sử AI?' : 'Xóa báo cáo này?'}
          onClose={() => setRemove(null)}
        >
          <p>Thao tác này không thể hoàn tác.</p>
          <button className="button" onClick={() => setRemove(null)}>
            Giữ lại
          </button>
          <button
            className="button danger"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void saveAiState((s) => ({
                ...s,
                history: remove === 'all' ? [] : s.history.filter((h) => h.id !== remove),
              }))
                .then(() => setRemove(null))
                .catch((e: unknown) => toast(errorText(e), 'error'))
                .finally(() => setBusy(false));
            }}
          >
            Xóa
          </button>
        </Modal>
      )}
    </section>
  );
}
