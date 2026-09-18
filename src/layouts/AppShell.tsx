import {
  ChevronDown,
  ChevronsUpDown,
  Plus,
  ArrowUpRight,
  Moon,
  Sun,
  HardDrive,
  Check,
  LoaderCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import pkg from '../../package.json';
import { NAVIGATION } from '../app/navigation';
import { useWorkspace } from '../app/store';
import { useUi } from '../app/ui';
import { useMutation } from '../components/feedback';

export function AppShell({ children }: { children: ReactNode }) {
  const data = useWorkspace((s) => s.data);
  const busy = useWorkspace((s) => s.busy);
  const page = useUi((s) => s.page);
  const navigate = useUi((s) => s.navigate);
  const setManager = useUi((s) => s.setWorkspaceManager);
  const openWork = useUi((s) => s.openWork);
  const mutate = useMutation();
  const workspace = data.workspaces.find((w) => w.id === data.settings.activeWorkspaceId);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="mac-window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="brand">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            teacher<span>workspace</span>
          </div>
        </div>
        <div className="sidebar-label">KHÔNG GIAN CÁ NHÂN</div>
        <button className="workspace-picker" onClick={() => setManager(true)}>
          <span className="workspace-avatar">{workspace?.name.charAt(0).toUpperCase() ?? 'T'}</span>
          <span className="truncate">{workspace?.name ?? 'Chọn thời khóa biểu'}</span>
          <ChevronsUpDown size={15} />
        </button>
        <nav aria-label="Điều hướng chính">
          {NAVIGATION.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => navigate(n.id)}
              aria-current={page === n.id ? 'page' : undefined}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {page === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workflow-card">
            <span className="eyebrow">THÊM NHANH, DẠY THẢNH THƠI</span>
            <p>
              Nhập một lần.
              <br />
              Sắp xếp cả tuần.
            </p>
            <button onClick={() => openWork()} disabled={!workspace || workspace.archived}>
              Tạo công việc <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="local-info">
            <HardDrive size={17} />
            <div>
              Dữ liệu trên thiết bị<span>Hoạt động offline</span>
            </div>
            <span className="status-dot" />
          </div>
          <div className="sidebar-version">
            Teacher Workspace <span>v{pkg.version}</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Không gian cá nhân <span>/</span>
            <strong>{NAVIGATION.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className="save-indicator">
              {busy ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />}{' '}
              {busy ? 'Đang lưu…' : 'Đã lưu trên thiết bị'}
            </span>
            <button
              className="icon-button"
              title="Đổi giao diện sáng/tối"
              aria-label="Đổi giao diện sáng/tối"
              onClick={() =>
                void mutate(
                  (s) => ({
                    ...s,
                    settings: {
                      ...s.settings,
                      theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
                    },
                  }),
                  'Đã đổi giao diện.',
                )
              }
            >
              {data.settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="profile-button" onClick={() => navigate('settings')} title="Cài đặt">
              GV <ChevronDown size={12} />
            </button>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
export function AddWorkButton() {
  const open = useUi((s) => s.openWork);
  const workspaceId = useWorkspace((s) => s.data.settings.activeWorkspaceId);
  return (
    <button className="button primary" onClick={() => open()} disabled={!workspaceId}>
      <Plus size={18} />
      Thêm công việc
    </button>
  );
}
