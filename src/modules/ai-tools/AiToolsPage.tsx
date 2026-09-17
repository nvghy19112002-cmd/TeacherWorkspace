import { useState } from 'react';
import { useWorkspace } from '../../app/store';
import { readAiState } from './services/state';
import { ProviderSettings } from './components/ProviderSettings';
import { PromptStudio } from './components/PromptStudio';
import { ReviewHistory } from './components/ReviewHistory';
import { LatexWorkbench } from './components/LatexWorkbench';
import './aiTools.css';
const TABS = ['LaTeX Doctor', 'Phản biện đề', 'Prompt Studio', 'Lịch sử', 'Provider'];
export default function AiToolsPage() {
  const raw = useWorkspace((s) => s.data.settings.moduleState?.aiTools);
  const [tab, setTab] = useState(TABS[0]);
  let state;
  try {
    state = readAiState(raw);
  } catch {
    return (
      <section className="ai-tools">
        <h1>Không đọc được dữ liệu AI Tools</h1>
        <p>Dữ liệu chưa bị ghi đè. Hãy xuất backup trong Cài đặt để kiểm tra và khôi phục.</p>
      </section>
    );
  }
  return (
    <div className="ai-tools">
      <header>
        <h1>AI Tools</h1>
        <p>Kiểm tra tài liệu, tùy chỉnh prompt và phản biện đề Toán.</p>
      </header>
      <nav className="ai-tabs" aria-label="Công cụ AI">
        {TABS.map((name) => (
          <button
            key={name}
            aria-current={tab === name ? 'page' : undefined}
            className={`button ${tab === name ? 'primary' : ''}`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      {(tab === TABS[0] || tab === TABS[1]) && (
        <LatexWorkbench state={state} review={tab === TABS[1]} />
      )}
      {tab === TABS[2] && <PromptStudio custom={state.prompts} />}
      {tab === TABS[3] && <ReviewHistory entries={state.history} />}
      {tab === TABS[4] && <ProviderSettings model={state.model} />}
    </div>
  );
}
