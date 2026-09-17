import { useState } from 'react';
import { Copy, Save, Trash2 } from 'lucide-react';
import { BUILTINS, validateTemplate } from '../domain/prompts';
import { KINDS, promptSchema, type Prompt } from '../domain/model';
import { saveAiState } from '../services/state';
import { useToasts } from '../../../components/feedback';
import { errorText } from '../../../app/store';
import { Modal } from '../../../components/Modal';
export function PromptStudio({ custom }: { custom: Prompt[] }) {
  const [draft, setDraft] = useState<Prompt>(BUILTINS[0]);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToasts((s) => s.push);
  const builtin = draft.id.startsWith('builtin-');
  const prompts = [...BUILTINS, ...custom];
  async function save(remove = false) {
    setBusy(true);
    try {
      if (remove)
        await saveAiState((s) => ({ ...s, prompts: s.prompts.filter((p) => p.id !== draft.id) }));
      else {
        validateTemplate(draft.userTemplate);
        const value = promptSchema.parse({ ...draft, updatedAt: new Date().toISOString() });
        await saveAiState((s) => ({
          ...s,
          prompts: [...s.prompts.filter((p) => p.id !== value.id), value],
        }));
      }
      toast(remove ? 'Đã xóa prompt.' : 'Đã lưu prompt.');
      if (remove) setDraft(BUILTINS[0]);
      setDeleting(false);
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ai-settings">
      <div className="ai-toolbar">
        <select
          aria-label="Chọn prompt"
          value={prompts.some((p) => p.id === draft.id) ? draft.id : ''}
          onChange={(e) => setDraft(prompts.find((p) => p.id === e.target.value)!)}
        >
          <option disabled value="">
            Bản sao chưa lưu
          </option>
          {prompts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.id.startsWith('builtin-') ? ' • Mặc định' : ''}
            </option>
          ))}
        </select>
        <button
          className="button"
          onClick={() =>
            setDraft({
              ...draft,
              id: crypto.randomUUID(),
              name: `${draft.name} (bản sao)`.slice(0, 100),
            })
          }
        >
          <Copy size={16} />
          Nhân bản
        </button>
      </div>
      <label>
        Tên prompt
        <input
          value={draft.name}
          readOnly={builtin}
          maxLength={100}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </label>
      <label>
        Chức năng
        <select
          value={draft.kind}
          disabled={builtin}
          onChange={(e) =>
            setDraft({ ...draft, kind: promptSchema.shape.kind.parse(e.target.value) })
          }
        >
          {Object.entries(KINDS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        System prompt
        <textarea
          rows={8}
          value={draft.systemPrompt}
          readOnly={builtin}
          maxLength={8000}
          onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
        />
      </label>
      <label>
        User template
        <textarea
          rows={7}
          value={draft.userTemplate}
          readOnly={builtin}
          maxLength={8000}
          onChange={(e) => setDraft({ ...draft, userTemplate: e.target.value })}
        />
      </label>
      <p>
        Biến: {'{{source}}, {{grade}}, {{chapter}}, {{target}}, {{rules}}'}. Prompt mặc định chỉ
        đọc; nhân bản để tùy chỉnh.
      </p>
      <div className="ai-toolbar">
        <button className="button primary" disabled={builtin || busy} onClick={() => void save()}>
          <Save size={16} />
          Lưu prompt
        </button>
        <button
          className="button"
          disabled={builtin || busy || !custom.some((p) => p.id === draft.id)}
          onClick={() => setDeleting(true)}
        >
          <Trash2 size={16} />
          Xóa
        </button>
      </div>
      {deleting && (
        <Modal title="Xóa prompt này?" onClose={() => setDeleting(false)}>
          <button className="button" onClick={() => setDeleting(false)}>
            Giữ lại
          </button>
          <button className="button danger" disabled={busy} onClick={() => void save(true)}>
            Xóa prompt
          </button>
        </Modal>
      )}
    </section>
  );
}
