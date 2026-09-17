import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { isDesktop } from '../../../database/driver';
import { useWorkspace, errorText } from '../../../app/store';
import { useToasts } from '../../../components/feedback';
import { deleteKey, readKey, storeKey } from '../services/credentials';
import { geminiProvider } from '../services/aiProvider';
import { saveAiState } from '../services/state';
import { modelNameSchema } from '../domain/model';
import { readKeyPool, saveKeyPool, type KeyMeta, type KeyPool } from '../domain/keyPool';

const STATUS: Record<KeyMeta['status'], string> = {
  unchecked: 'Chưa kiểm tra',
  active: 'Hoạt động',
  auth_error: 'Lỗi xác thực',
  quota: 'Hết hạn mức',
  network_error: 'Lỗi mạng',
};

function statusFromError(error: unknown): KeyMeta['status'] {
  const text = errorText(error).toLocaleLowerCase('vi');
  if (text.includes('hạn mức') || text.includes('quá nhiều')) return 'quota';
  if (text.includes('không hợp lệ') || text.includes('không có quyền')) return 'auth_error';
  return 'network_error';
}

export function ProviderSettings({ model, compact = false }: { model: string; compact?: boolean }) {
  const raw = useWorkspace((state) => state.data.settings.moduleState?.aiKeyPool);
  const pool = useMemo(() => readKeyPool(raw), [raw]);
  const [draft, setDraft] = useState('');
  const [label, setLabel] = useState('');
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [name, setName] = useState(model);
  const [models, setModels] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const toast = useToasts((state) => state.push);

  useEffect(() => {
    let active = true;
    if (pool.keys.length) return () => undefined;
    void readKey('default').then(async (legacy) => {
      if (!active || !legacy) return;
      const meta: KeyMeta = {
        id: 'default',
        label: 'Key V1.3',
        masked: `••••${legacy.slice(-4)}`,
        priority: 0,
        enabled: true,
        status: 'unchecked',
        lastCheckedAt: null,
      };
      await saveKeyPool(() => ({
        version: 1,
        automatic: false,
        activeId: 'default',
        keys: [meta],
      }));
    });
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, [pool.keys.length]);

  async function update(recipe: (current: KeyPool) => KeyPool) {
    try {
      await saveKeyPool(recipe);
    } catch (error) {
      toast(errorText(error), 'error');
    }
  }

  async function add() {
    const clean = draft.trim();
    if (!clean) return;
    setBusyId('new');
    try {
      const id = crypto.randomUUID();
      await storeKey(clean, id);
      const meta: KeyMeta = {
        id,
        label: label.trim() || `Gemini #${pool.keys.length + 1}`,
        masked: `••••${clean.slice(-4)}`,
        priority: pool.keys.length,
        enabled: true,
        status: 'unchecked',
        lastCheckedAt: null,
      };
      await saveKeyPool((current) => ({
        ...current,
        activeId: current.activeId ?? id,
        keys: [...current.keys, meta],
      }));
      setDraft('');
      setLabel('');
      toast('Đã lưu API key an toàn.');
    } catch (error) {
      toast(errorText(error), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(meta: KeyMeta) {
    if (!window.confirm(`Xóa ${meta.label}? API key sẽ bị xóa khỏi kho khóa an toàn.`)) return;
    setBusyId(meta.id);
    try {
      await deleteKey(meta.id);
      await saveKeyPool((current) => {
        const keys = current.keys
          .filter((item) => item.id !== meta.id)
          .map((item, index) => ({ ...item, priority: index }));
        return {
          ...current,
          keys,
          activeId: current.activeId === meta.id ? (keys[0]?.id ?? null) : current.activeId,
        };
      });
      setRevealed((value) => {
        const next = { ...value };
        delete next[meta.id];
        return next;
      });
      toast('Đã xóa API key.');
    } catch (error) {
      toast(errorText(error), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function test(meta: KeyMeta) {
    setBusyId(meta.id);
    controller.current = new AbortController();
    try {
      const list = await geminiProvider.testConnection(
        await readKey(meta.id),
        controller.current.signal,
      );
      setModels((current) => [...new Set([...current, ...list])]);
      await saveKeyPool((current) => ({
        ...current,
        keys: current.keys.map((item) =>
          item.id === meta.id
            ? { ...item, status: 'active', lastCheckedAt: new Date().toISOString() }
            : item,
        ),
      }));
      toast(`Kết nối thành công: ${meta.label} · ${list.length} model.`);
    } catch (error) {
      await saveKeyPool((current) => ({
        ...current,
        keys: current.keys.map((item) =>
          item.id === meta.id
            ? { ...item, status: statusFromError(error), lastCheckedAt: new Date().toISOString() }
            : item,
        ),
      }));
      toast(errorText(error), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= pool.keys.length) return;
    await update((current) => {
      const keys = [...current.keys];
      [keys[index], keys[target]] = [keys[target], keys[index]];
      return { ...current, keys: keys.map((item, priority) => ({ ...item, priority })) };
    });
  }

  return (
    <section className={`ai-settings key-pool ${compact ? 'compact' : ''}`}>
      <h2>Gemini API key</h2>
      <p>
        {isDesktop
          ? 'Key được lưu trong Windows Credential Manager và không nằm trong backup.'
          : 'Bản trình duyệt chỉ giữ key trong phiên hiện tại.'}
      </p>
      <div className="key-add-row">
        <input
          type="text"
          value={label}
          maxLength={100}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Nhãn, ví dụ: Key chính"
        />
        <input
          type="password"
          value={draft}
          maxLength={300}
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Nhập Gemini API key"
        />
        <button
          className="button primary"
          disabled={!draft.trim() || busyId !== null}
          onClick={() => void add()}
        >
          <Plus size={16} /> Thêm key
        </button>
      </div>
      <div className="key-list">
        {pool.keys.length === 0 && <div className="qb-empty-inline">Chưa có API key.</div>}
        {pool.keys.map((meta, index) => (
          <div className="key-row" key={meta.id}>
            <input
              type="radio"
              name="active-api-key"
              checked={pool.activeId === meta.id}
              onChange={() => void update((current) => ({ ...current, activeId: meta.id }))}
              aria-label={`Dùng ${meta.label}`}
            />
            <span className="key-number">#{index + 1}</span>
            <input
              value={meta.label}
              maxLength={100}
              onChange={(event) => {
                const value = event.target.value;
                void update((current) => ({
                  ...current,
                  keys: current.keys.map((item) =>
                    item.id === meta.id ? { ...item, label: value || meta.label } : item,
                  ),
                }));
              }}
            />
            <code>{revealed[meta.id] ?? meta.masked}</code>
            <span className={`key-status ${meta.status}`}>{STATUS[meta.status]}</span>
            <button
              className="icon-button"
              title={revealed[meta.id] ? 'Ẩn key' : 'Hiện key'}
              onClick={() =>
                void (async () => {
                  if (revealed[meta.id]) {
                    setRevealed((value) => ({ ...value, [meta.id]: '' }));
                  } else {
                    const value = await readKey(meta.id);
                    setRevealed((current) => ({ ...current, [meta.id]: value }));
                  }
                })()
              }
            >
              {revealed[meta.id] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              className="icon-button"
              title="Đưa lên"
              disabled={index === 0}
              onClick={() => void move(index, -1)}
            >
              <ArrowUp size={16} />
            </button>
            <button
              className="icon-button"
              title="Đưa xuống"
              disabled={index === pool.keys.length - 1}
              onClick={() => void move(index, 1)}
            >
              <ArrowDown size={16} />
            </button>
            <button
              className="icon-button"
              title="Kiểm tra"
              disabled={busyId !== null}
              onClick={() => void test(meta)}
            >
              <RefreshCw className={busyId === meta.id ? 'spin' : ''} size={16} />
            </button>
            <button
              className="icon-button danger-text"
              title="Xóa key"
              disabled={busyId !== null}
              onClick={() => void remove(meta)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={pool.automatic}
          onChange={(event) =>
            void update((current) => ({ ...current, automatic: event.target.checked }))
          }
        />
        Tự chuyển sang key tiếp theo khi provider báo hết hạn mức
      </label>
      <div className="key-model-row">
        <label>
          Model dùng chung
          <input
            list="ai-models"
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            placeholder="Kiểm tra key rồi chọn model"
          />
        </label>
        <datalist id="ai-models">
          {models.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <button
          className="button secondary"
          disabled={!name.trim()}
          onClick={() =>
            void (async () => {
              try {
                const value = modelNameSchema.parse(name);
                await saveAiState((state) => ({ ...state, model: value }));
                toast('Đã lưu model.');
              } catch (error) {
                toast(errorText(error), 'error');
              }
            })()
          }
        >
          Lưu model
        </button>
      </div>
      <small>
        Chỉ gửi nội dung khi anh xác nhận chạy AI. Yêu cầu có thể phát sinh phí theo tài khoản API.
      </small>
    </section>
  );
}
