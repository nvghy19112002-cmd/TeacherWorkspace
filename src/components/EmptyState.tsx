import { CalendarPlus } from 'lucide-react';
export function EmptyState({
  title,
  description,
  action,
  label = 'Thêm công việc',
}: {
  title: string;
  description: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <CalendarPlus size={28} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="button primary" onClick={action}>
          {label}
        </button>
      )}
    </div>
  );
}
