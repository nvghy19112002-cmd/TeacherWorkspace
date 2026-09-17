import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { useToasts } from './feedback';
export function ToastHost() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="toast-host" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.tone}`}
          role={t.tone === 'error' ? 'alert' : 'status'}
        >
          {t.tone === 'error' ? <CircleAlert size={20} /> : <CheckCircle2 size={20} />}
          <span>{t.message}</span>
          <button className="icon-button" aria-label="Đóng thông báo" onClick={() => dismiss(t.id)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
