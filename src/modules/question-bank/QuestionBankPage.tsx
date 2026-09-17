import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArchiveRestore,
  Bot,
  Check,
  CopyCheck,
  Download,
  FilePlus2,
  FolderTree,
  ListChecks,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { errorText } from '../../app/store';
import { useToasts } from '../../components/feedback';
import { saveFile } from '../../services/files';
import { CurriculumManager } from './components/CurriculumManager';
import { QuestionEditor } from './components/QuestionEditor';
import { QuestionPreview } from './components/QuestionPreview';
import { classifyQuestionOnline } from './services/classificationProvider';
import { findDuplicateCandidates } from './domain/duplicates';
import { chooseByMatrix, createExam, examToLatex } from './domain/exams';
import { parsedToQuestion, parseExTest } from './domain/parser';
import {
  LEVEL_LABELS,
  QUESTION_TYPE_LABELS,
  STATUS_LABELS,
  type ClassificationRun,
  type Question,
} from './domain/model';
import { useQuestionBank } from './store';
import './questionBank.css';

type Tab = 'library' | 'curriculum' | 'duplicates' | 'ai' | 'exams' | 'trash';

const TABS: Array<[Tab, string]> = [
  ['library', 'Kho câu hỏi'],
  ['curriculum', 'Cây chương trình'],
  ['duplicates', 'Quét trùng'],
  ['ai', 'AI phân loại'],
  ['exams', 'Tạo đề'],
  ['trash', 'Thùng rác'],
];

function downloadText(name: string, text: string, mime = 'application/x-tex') {
  return saveFile(name, new TextEncoder().encode(text), mime);
}

export default function QuestionBankPage() {
  const data = useQuestionBank((s) => s.data);
  const ready = useQuestionBank((s) => s.ready);
  const busy = useQuestionBank((s) => s.busy);
  const selectedId = useQuestionBank((s) => s.selectedId);
  const initialize = useQuestionBank((s) => s.initialize);
  const commit = useQuestionBank((s) => s.commit);
  const select = useQuestionBank((s) => s.select);
  const toast = useToasts((s) => s.push);
  const [tab, setTab] = useState<Tab>('library');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [type, setType] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [domainId, setDomainId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [formId, setFormId] = useState('');
  const [imageFilter, setImageFilter] = useState('');
  const [editor, setEditor] = useState<Question | 'new' | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState({ done: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);
  const selected = data.questions.find((q) => q.id === selectedId) ?? null;
  const visible = useMemo(
    () =>
      data.questions.filter((q) => {
        if (tab === 'trash' ? !q.deletedAt : q.deletedAt) return false;
        const needle = query.trim().toLocaleLowerCase('vi');
        const matchesText =
          !needle ||
          `${q.displayId} ${q.rawSource} ${q.tags.join(' ')}`
            .toLocaleLowerCase('vi')
            .includes(needle);
        const matchesTree = (!gradeId || q.gradeNodeId === gradeId) && (!domainId || q.domainNodeId === domainId) && (!chapterId || q.chapterNodeId === chapterId) && (!lessonId || q.lessonNodeId === lessonId) && (!formId || q.formNodeId === formId);
        return (
          matchesText &&
          (!level || q.level === level) &&
          (!type || q.questionType === type) &&
          matchesTree && (!imageFilter || (imageFilter === 'with' ? q.hasImage : !q.hasImage))
        );
      }),
    [chapterId, data.questions, domainId, formId, gradeId, imageFilter, level, lessonId, query, tab, type],
  );

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    try {
      const imported: Question[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name} vượt quá 50 MB.`);
        if (!/\.(tex|txt)$/i.test(file.name))
          throw new Error(`${file.name}: hiện chỉ nhận .tex hoặc .txt.`);
        imported.push(
          ...parseExTest(await file.text()).map((item) => parsedToQuestion(item, file.name)),
        );
      }
      await commit((snapshot) => ({
        ...snapshot,
        questions: [...snapshot.questions, ...imported],
      }));
      toast(`Đã nhập ${imported.length} câu ở trạng thái nháp.`);
    } catch (error) {
      toast(errorText(error), 'error');
    }
  }

  async function softDelete(question: Question) {
    const now = new Date().toISOString();
    await commit((snapshot) => ({
      ...snapshot,
      questions: snapshot.questions.map((q) =>
        q.id === question.id ? { ...q, deletedAt: now } : q,
      ),
    }));
    select(null);
  }

  async function restore(question: Question) {
    await commit((snapshot) => ({
      ...snapshot,
      questions: snapshot.questions.map((q) =>
        q.id === question.id ? { ...q, deletedAt: null } : q,
      ),
    }));
  }

  async function runAi() {
    const ids = checked.length ? checked : selected ? [selected.id] : [];
    if (!ids.length) return toast('Hãy chọn ít nhất một câu để phân loại.', 'info');
    if (!window.confirm(`Gửi nội dung ${ids.length} câu đã chọn lên Gemini để phân loại?`)) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setAiBusy(true);
    setAiProgress({ done: 0, total: ids.length });
    for (let index = 0; index < ids.length; index += 1) {
      if (controller.signal.aborted) break;
      const question = useQuestionBank.getState().data.questions.find((q) => q.id === ids[index]);
      if (!question) continue;
      try {
        const snapshot = useQuestionBank.getState().data;
        const response = await classifyQuestionOnline(snapshot, question, controller.signal);
        const run: ClassificationRun = {
          id: crypto.randomUUID(),
          questionId: question.id,
          provider: 'gemini',
          model: response.model,
          resultJson: JSON.stringify(response.result),
          accepted: false,
          createdAt: new Date().toISOString(),
        };
        await useQuestionBank
          .getState()
          .commit((current) => ({
            ...current,
            classificationRuns: [...current.classificationRuns, run],
          }));
      } catch (error) {
        if (!controller.signal.aborted)
          toast(`${question.displayId || 'Câu nháp'}: ${errorText(error)}`, 'error');
      }
      setAiProgress({ done: index + 1, total: ids.length });
    }
    setAiBusy(false);
    abortRef.current = null;
  }

  async function acceptRun(run: ClassificationRun) {
    try {
      const result = JSON.parse(run.resultJson) as {
        level: Question['level'];
        lessonId: string | null;
        formId: string | null;
        primaryLearningOutcomeId: string | null;
        secondaryLearningOutcomeIds: string[];
        confidence: number;
        reasoningSummary: string;
        warnings: string[];
      };
      await commit((snapshot) => ({
        ...snapshot,
        questions: snapshot.questions.map((q) =>
          q.id === run.questionId
            ? {
                ...q,
                level: result.level,
                lessonNodeId: result.lessonId,
                formNodeId: result.formId,
                primaryOutcomeId: result.primaryLearningOutcomeId,
                secondaryOutcomeIds: result.secondaryLearningOutcomeIds,
                confidence: Math.round(result.confidence * 100),
                reasoning: result.reasoningSummary,
                warnings: result.warnings,
                status: 'review',
                updatedAt: new Date().toISOString(),
              }
            : q,
        ),
        classificationRuns: snapshot.classificationRuns.map((item) =>
          item.id === run.id ? { ...item, accepted: true } : item,
        ),
      }));
      toast('Đã áp dụng đề xuất AI và chuyển câu sang Chờ duyệt.');
    } catch (error) {
      toast(errorText(error), 'error');
    }
  }

  if (!ready)
    return (
      <div className="page-loading">
        <LoaderCircle className="spin" /> Đang mở ngân hàng câu hỏi…
      </div>
    );
  const duplicates = tab === 'duplicates' ? findDuplicateCandidates(data.questions) : [];
  const pendingRuns = data.classificationRuns
    .filter((run) => !run.accepted)
    .slice()
    .reverse();
  const activeNodes = data.curriculumNodes.filter((node) => !node.archived);
  const grades = activeNodes.filter((node) => node.kind === 'grade');
  const domains = activeNodes.filter((node) => node.kind === 'domain' && (!gradeId || node.parentId === gradeId));
  const chapters = activeNodes.filter((node) => node.kind === 'chapter' && (!domainId || node.parentId === domainId));
  const lessons = activeNodes.filter((node) => node.kind === 'lesson' && (!chapterId || node.parentId === chapterId));
  const forms = activeNodes.filter((node) => node.kind === 'form' && (!lessonId || node.parentId === lessonId));

  return (
    <div className="qb-page">
      <div className="page-heading qb-heading">
        <div>
          <div className="eyebrow">QUESTION BANK · V1.4</div>
          <h1>Ngân hàng câu hỏi</h1>
          <p>Phân loại theo Yêu cầu cần đạt 2018, quản lý LaTeX và tạo đề có kiểm soát.</p>
        </div>
        <div className="qb-heading-actions">
          <label className="button secondary">
            <FilePlus2 size={17} /> Nhập .tex
            <input
              hidden
              multiple
              type="file"
              accept=".tex,.txt"
              onChange={(e) => void importFiles(e.target.files)}
            />
          </label>
          <button className="button primary" onClick={() => setEditor('new')}>
            <Plus size={17} /> Thêm câu
          </button>
        </div>
      </div>
      <nav className="qb-tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      {tab === 'curriculum' ? (
        <CurriculumManager />
      ) : tab === 'duplicates' ? (
        <section className="panel">
          <h2>
            <CopyCheck size={19} /> Kết quả quét trùng offline
          </h2>
          <p>So khớp nội dung chuẩn hóa; không gửi dữ liệu ra ngoài.</p>
          {duplicates.length ? (
            <div className="qb-duplicate-list">
              {duplicates.map((pair) => (
                <div key={`${pair.left.id}-${pair.right.id}`}>
                  <strong>{pair.score}%</strong>
                  <span>
                    {pair.left.displayId || 'Câu nháp'} ↔ {pair.right.displayId || 'Câu nháp'}
                  </span>
                  <small>
                    {pair.method === 'hash' ? 'Trùng chính xác' : 'Tương đồng nội dung'}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <div className="qb-empty-inline">Không phát hiện cặp trùng từ ngưỡng 82%.</div>
          )}
        </section>
      ) : tab === 'ai' ? (
        <section className="panel">
          <h2>
            <Bot size={19} /> Hàng đợi AI phân loại
          </h2>
          <p>AI chỉ đề xuất. Giáo viên duyệt trước khi thay đổi câu hỏi.</p>
          <div className="qb-ai-actions">
            <button className="button primary" disabled={aiBusy} onClick={() => void runAi()}>
              <Bot size={16} /> Phân loại {checked.length || (selected ? 1 : 0)} câu
            </button>
            {aiBusy && (
              <>
                <span>
                  {aiProgress.done}/{aiProgress.total}
                </span>
                <button className="button secondary" onClick={() => abortRef.current?.abort()}>
                  <X size={16} /> Dừng sau câu hiện tại
                </button>
              </>
            )}
          </div>
          <div className="qb-run-list">
            {pendingRuns.map((run) => {
              const q = data.questions.find((item) => item.id === run.questionId);
              const result = JSON.parse(run.resultJson) as {
                level?: string;
                confidence?: number;
                reasoningSummary?: string;
              };
              return (
                <article key={run.id}>
                  <div>
                    <strong>
                      {q?.displayId || 'Câu nháp'} · {result.level || '?'}
                    </strong>
                    <span>Độ tin cậy {Math.round((result.confidence ?? 0) * 100)}%</span>
                  </div>
                  <p>{result.reasoningSummary}</p>
                  <button className="button small primary" onClick={() => void acceptRun(run)}>
                    <Check size={15} /> Áp dụng để duyệt
                  </button>
                </article>
              );
            })}
            {!pendingRuns.length && (
              <div className="qb-empty-inline">Chưa có kết quả AI chờ duyệt.</div>
            )}
          </div>
        </section>
      ) : tab === 'exams' ? (
        <ExamPanel />
      ) : (
        <div className="qb-workspace">
          <aside className="panel qb-filters">
            <h2>
              <FolderTree size={18} /> Bộ lọc
            </h2>
            <label className="field">
              Tìm kiếm
              <div className="qb-search">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ID, nội dung, nhãn…"
                />
              </div>
            </label>
            <div className="qb-filter-caption">Phân loại chương trình</div>
            <label className="field">Lớp<select value={gradeId} onChange={(e) => { setGradeId(e.target.value); setDomainId(''); setChapterId(''); setLessonId(''); setFormId(''); }}><option value="">— Tất cả lớp —</option>{grades.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
            <label className="field">Cấp 2<select value={domainId} onChange={(e) => { setDomainId(e.target.value); setChapterId(''); setLessonId(''); setFormId(''); }}><option value="">— Tất cả cấp 2 —</option>{domains.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
            <label className="field">Chương<select value={chapterId} onChange={(e) => { setChapterId(e.target.value); setLessonId(''); setFormId(''); }}><option value="">— Tất cả chương —</option>{chapters.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
            <label className="field">Bài<select value={lessonId} onChange={(e) => { setLessonId(e.target.value); setFormId(''); }}><option value="">— Tất cả bài —</option>{lessons.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
            <label className="field">Dạng<select value={formId} onChange={(e) => setFormId(e.target.value)}><option value="">— Tất cả dạng —</option>{forms.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
            <label className="field">
              Mức độ
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">Tất cả</option>
                {Object.entries(LEVEL_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">Hình ảnh<select value={imageFilter} onChange={(e) => setImageFilter(e.target.value)}><option value="">— Có/Không có hình —</option><option value="with">Có hình</option><option value="without">Không có hình</option></select></label>
            <button className="qb-clear-filters" onClick={() => { setQuery(''); setGradeId(''); setDomainId(''); setChapterId(''); setLessonId(''); setFormId(''); setLevel(''); setType(''); setImageFilter(''); }}><Trash2 size={14} /> Xóa bộ lọc</button>
            <label className="field">
              Loại câu
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Tất cả</option>
                {Object.entries(QUESTION_TYPE_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <small>
              {visible.length} câu phù hợp · {checked.length} đã chọn
            </small>
          </aside>
          <section className="panel qb-list">
            <div className="qb-panel-title">
              <div>
                <h2>
                  <ListChecks size={18} /> Danh sách câu
                </h2>
                <p>Chọn nhiều câu để chạy AI hoặc tạo đề.</p>
              </div>
            </div>
            {visible.map((q) => (
              <button
                key={q.id}
                className={`qb-question-row ${selectedId === q.id ? 'active' : ''}`}
                onClick={() => select(q.id)}
              >
                <input
                  aria-label="Chọn câu"
                  type="checkbox"
                  checked={checked.includes(q.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    setChecked((rows) =>
                      e.target.checked ? [...rows, q.id] : rows.filter((id) => id !== q.id),
                    )
                  }
                />
                <span>
                  <strong>{q.displayId || 'CHƯA CÓ ID'}</strong>
                  <small>
                    {LEVEL_LABELS[q.level]} · {QUESTION_TYPE_LABELS[q.questionType]}
                  </small>
                </span>
                <em>{STATUS_LABELS[q.status]}</em>
              </button>
            ))}
            {!visible.length && (
              <div className="qb-empty-inline">Chưa có câu hỏi trong phạm vi này.</div>
            )}
          </section>
          <section className="panel qb-detail">
            {selected ? (
              <>
                <div className="qb-panel-title">
                  <div>
                    <h2>{selected.displayId || 'Câu nháp'}</h2>
                    <p>{selected.source || 'Không ghi nguồn'}</p>
                  </div>
                </div>
                <QuestionPreview source={selected.rawSource} />
                <dl className="qb-meta">
                  <div>
                    <dt>Mức độ</dt>
                    <dd>{LEVEL_LABELS[selected.level]}</dd>
                  </div>
                  <div>
                    <dt>Trạng thái</dt>
                    <dd>{STATUS_LABELS[selected.status]}</dd>
                  </div>
                  <div>
                    <dt>Độ tin cậy</dt>
                    <dd>{selected.confidence == null ? '—' : `${selected.confidence}%`}</dd>
                  </div>
                  <div>
                    <dt>Lượt dùng</dt>
                    <dd>{selected.usageCount}</dd>
                  </div>
                </dl>
                <div className="qb-detail-actions">
                  <button className="button primary" onClick={() => setEditor(selected)}>
                    Chỉnh sửa
                  </button>
                  {selected.deletedAt ? (
                    <button className="button secondary" onClick={() => void restore(selected)}>
                      <ArchiveRestore size={16} /> Khôi phục
                    </button>
                  ) : (
                    <button className="button danger" onClick={() => void softDelete(selected)}>
                      <Trash2 size={16} /> Thùng rác
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="qb-empty-detail">Chọn một câu để xem nội dung và lịch sử.</div>
            )}
          </section>
        </div>
      )}
      {editor && (
        <QuestionEditor
          question={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
      {busy && <div className="qb-saving">Đang lưu…</div>}
    </div>
  );
}

function ExamPanel() {
  const data = useQuestionBank((s) => s.data);
  const commit = useQuestionBank((s) => s.commit);
  const toast = useToasts((s) => s.push);
  const [title, setTitle] = useState('Đề kiểm tra');
  const [duration, setDuration] = useState(45);
  const [seed, setSeed] = useState(() => String(Date.now()));
  const [counts, setCounts] = useState({ N: 4, H: 3, V: 2, C: 1 });
  async function build() {
    const result = chooseByMatrix(data.questions, counts, seed);
    const missing = Object.values(result.shortages).reduce((a, b) => a + (b ?? 0), 0);
    if (missing) return toast(`Ngân hàng thiếu ${missing} câu đã duyệt theo ma trận.`, 'error');
    const created = createExam(title, duration, result.selected, seed);
    await commit((s) => ({
      ...s,
      exams: [...s.exams, created.exam],
      examItems: [...s.examItems, ...created.items],
      questions: s.questions.map((q) =>
        result.selected.some((x) => x.id === q.id)
          ? { ...q, idLocked: true, usageCount: q.usageCount + 1 }
          : q,
      ),
    }));
    toast('Đã tạo đề từ snapshot câu hỏi.');
  }
  return (
    <div className="qb-exam-grid">
      <section className="panel">
        <h2>Tạo đề theo ma trận</h2>
        <label className="field">
          Tên đề
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="form-grid">
          <label className="field">
            Thời gian
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>
          <label className="field">
            Seed trộn
            <input value={seed} onChange={(e) => setSeed(e.target.value)} />
          </label>
        </div>
        <div className="qb-matrix">
          {(['N', 'H', 'V', 'C'] as const).map((l) => (
            <label key={l}>
              {LEVEL_LABELS[l]}
              <input
                type="number"
                min={0}
                value={counts[l]}
                onChange={(e) => setCounts({ ...counts, [l]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
        <button className="button primary" onClick={() => void build()}>
          Tạo đề
        </button>
      </section>
      <section className="panel">
        <h2>Đề đã tạo</h2>
        {data.exams
          .slice()
          .reverse()
          .map((exam) => (
            <div className="qb-exam-row" key={exam.id}>
              <span>
                <strong>{exam.title}</strong>
                <small>
                  {exam.durationMinutes} phút ·{' '}
                  {data.examItems.filter((i) => i.examId === exam.id).length} câu
                </small>
              </span>
              <button
                className="button small secondary"
                onClick={() => void downloadText(`${exam.title}.tex`, examToLatex(data, exam))}
              >
                <Download size={15} /> Xuất .tex
              </button>
            </div>
          ))}
        {!data.exams.length && <div className="qb-empty-inline">Chưa có đề thi.</div>}
      </section>
    </div>
  );
}
