import { Component, lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react';
import { LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react';
import { useWorkspace } from './store';
import { useUi } from './ui';
import { AppShell } from '../layouts/AppShell';
import { ToastHost } from '../components/ToastHost';
import { WorkEditor } from '../modules/schedule/components/WorkEditor';
import { OccurrenceEditor } from '../modules/schedule/components/OccurrenceEditor';
import { WorkspaceManager } from '../modules/settings/WorkspaceManager';
import { UpdateOverlay } from '../modules/updates/UpdatePanel';
import { useUpdates, isUpdating } from '../modules/updates/store';
const SchedulePage = lazy(() => import('../modules/schedule/SchedulePage'));
const WorkItemsPage = lazy(() => import('../modules/schedule/WorkItemsPage'));
const StatisticsPage = lazy(() => import('../modules/statistics/StatisticsPage'));
const DashboardPage = lazy(() => import('../modules/statistics/DashboardPage'));
const SettingsPage = lazy(() => import('../modules/settings/SettingsPage'));
const QuestionBankPage = lazy(() => import('../modules/question-bank/QuestionBankPage'));
const AiToolsPage = lazy(() => import('../modules/ai-tools/AiToolsPage'));
const ExportDialog = lazy(() =>
  import('../modules/schedule/components/ExportDialog').then((m) => ({ default: m.ExportDialog })),
);
const SCREENS: Record<string, ComponentType> = {
  schedule: SchedulePage,
  work: WorkItemsPage,
  statistics: StatisticsPage,
  dashboard: DashboardPage,
  settings: SettingsPage,
  'question-bank': QuestionBankPage,
  'ai-tools': AiToolsPage,
};
class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error)
      return (
        <div className="startup">
          <TriangleAlert size={30} />
          <h1>Giao diện gặp lỗi</h1>
          <p>{this.state.error}</p>
          <p>Dữ liệu đã lưu vẫn nằm trên thiết bị.</p>
          <button className="button primary" onClick={() => window.location.reload()}>
            Tải lại ứng dụng
          </button>
        </div>
      );
    return this.props.children;
  }
}
function WorkspaceApp() {
  const updating = useUpdates((s) => isUpdating(s.phase));
  const initialize = useWorkspace((s) => s.initialize);
  const ready = useWorkspace((s) => s.ready);
  const error = useWorkspace((s) => s.error);
  const theme = useWorkspace((s) => s.data.settings.theme);
  const page = useUi((s) => s.page);
  const work = useUi((s) => s.workEditor);
  const occurrence = useUi((s) => s.occurrenceEditor);
  const exportOpen = useUi((s) => s.exportOpen);
  const manager = useUi((s) => s.workspaceManager);
  useEffect(() => {
    void initialize();
  }, [initialize]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [theme]);
  if (!ready)
    return (
      <div className="startup">
        {error ? (
          <>
            <TriangleAlert size={32} />
            <h1>Không mở được dữ liệu</h1>
            <p>{error}</p>
            <p>Ứng dụng sẽ không tạo đè lên dữ liệu đang có.</p>
            <button className="button primary" onClick={() => void initialize()}>
              <RefreshCw size={16} />
              Thử lại
            </button>
          </>
        ) : (
          <>
            <LoaderCircle size={30} className="spin" />
            <h2>Đang mở Teacher Workspace…</h2>
          </>
        )}
      </div>
    );
  const Screen = SCREENS[page] ?? SchedulePage;
  return (
    <>
      <div inert={updating}>
        <AppShell>
          <Suspense
            fallback={
              <div className="page-loading">
                <LoaderCircle className="spin" />
                Đang mở…
              </div>
            }
          >
            <Screen key={useWorkspace.getState().data.settings.activeWorkspaceId} />
          </Suspense>
        </AppShell>
        {work && <WorkEditor request={work} />}{' '}
        {occurrence && <OccurrenceEditor request={occurrence} />} {manager && <WorkspaceManager />}
        {exportOpen && (
          <Suspense fallback={null}>
            <ExportDialog />
          </Suspense>
        )}
        <ToastHost />
      </div>
      <UpdateOverlay />
    </>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceApp />
    </ErrorBoundary>
  );
}
