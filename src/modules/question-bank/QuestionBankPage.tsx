import { AiIdScan } from './components/AiIdScan';
import { TexLivePreview } from './components/TexLivePreview';
import { uniqueImports } from './domain/importReview';
import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  CopyCheck,
  Eye,
  FileOutput,
  FilePlus2,
  ImageIcon,
  ListChecks,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { errorText } from '../../app/store';
import { isDesktop } from '../../database/driver';
import { Modal } from '../../components/Modal';
import { useToasts } from '../../components/feedback';
import { saveFile } from '../../services/files';
import { QuestionEditor } from './components/QuestionEditor';
import { QuestionPreview } from './components/QuestionPreview';
import { curriculumPath } from './domain/curriculum';
import { findDuplicateCandidates, type DuplicateCandidate } from './domain/duplicates';
import { createExam, examToLatex } from './domain/exams';
import {
  LEVEL_LABELS,
  QUESTION_TYPE_LABELS,
  type BankSnapshot,
  type Question,
} from './domain/model';
import { parsedToQuestion, parseExTest } from './domain/parser';
import {
  DEFAULT_TEX_PREVIEW_SETTINGS,
  findUnsupportedLatex,
  type TexPreviewSettings,
  type TexSupportIssue,
} from './domain/texPreview';
import { useQuestionBank } from './store';
import './questionBank.css';

const PAGE_SIZE = 50;

function downloadText(name: string, text: string, mime = 'application/x-tex') {
  return saveFile(name, new TextEncoder().encode(text), mime);
}

function exactDuplicateCandidates(questions: Question[]): DuplicateCandidate[] {
  const groups = new Map<string, Question[]>();
  const output: DuplicateCandidate[] = [];
  for (const question of questions) {
    const group = groups.get(question.contentHash) ?? [];
    for (const previous of group)
      output.push({ left: previous, right: question, score: 100, method: 'hash' });
    group.push(question);
    groups.set(question.contentHash, group);
  }
  return output;
}

export default function QuestionBankPage() {
  const data = useQuestionBank((state) => state.data);
  const loadError = useQuestionBank((state) => state.error);
  const ready = useQuestionBank((state) => state.ready);
  const busy = useQuestionBank((state) => state.busy);
  const selectedId = useQuestionBank((state) => state.selectedId);
  const initialize = useQuestionBank((state) => state.initialize);
  const commit = useQuestionBank((state) => state.commit);
  const select = useQuestionBank((state) => state.select);
  const toast = useToasts((state) => state.push);

  const [aiQuestions, setAiQuestions] = useState<Question[] | null>(null);
  const [texSource, setTexSource] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<Question[] | null>(null);
  const [importIssues, setImportIssues] = useState<TexSupportIssue[]>([]);
  const [importDeclarationStep, setImportDeclarationStep] = useState(false);
  const [importDeclarationDraft, setImportDeclarationDraft] = useState('');
  const [importTexSettings, setImportTexSettings] = useState<TexPreviewSettings | null>(null);
  const [skipIdentical, setSkipIdentical] = useState(true);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashPage, setTrashPage] = useState(1);
  const [readingFiles, setReadingFiles] = useState(false);
  const [idQuery, setIdQuery] = useState('');
  const [contentQuery, setContentQuery] = useState('');
  const [level, setLevel] = useState('');
  const [type, setType] = useState('');
  const [imageFilter, setImageFilter] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [domainId, setDomainId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [formId, setFormId] = useState('');
  const [editor, setEditor] = useState<Question | 'new' | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [detailTab, setDetailTab] = useState<'preview' | 'source'>('preview');
  const [zoom, setZoom] = useState(100);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    setPage(1);
  }, [
    idQuery,
    contentQuery,
    level,
    type,
    imageFilter,
    gradeId,
    domainId,
    chapterId,
    lessonId,
    formId,
  ]);

  const curriculum = useMemo(
    () =>
      data.curriculumNodes
        .filter((node) => !node.archived)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [data.curriculumNodes],
  );
  const children = (
    parentId: string | null,
    kind: 'grade' | 'domain' | 'chapter' | 'lesson' | 'form',
  ) => curriculum.filter((node) => node.parentId === parentId && node.kind === kind);
  const grades = children(null, 'grade');
  const domains = children(gradeId || null, 'domain');
  const chapters = children(domainId || null, 'chapter');
  const lessons = children(chapterId || null, 'lesson');
  const forms = children(lessonId || null, 'form');

  const visible = useMemo(
    () =>
      data.questions.filter((question) => {
        if (question.deletedAt) return false;
        const idNeedle = idQuery.trim().toLocaleLowerCase('vi');
        const contentNeedle = contentQuery.trim().toLocaleLowerCase('vi');
        return (
          (!idNeedle ||
            `${question.displayId} ${question.classificationCode}`
              .toLocaleLowerCase('vi')
              .includes(idNeedle)) &&
          (!contentNeedle ||
            `${question.rawSource} ${question.tags.join(' ')} ${question.source}`
              .toLocaleLowerCase('vi')
              .includes(contentNeedle)) &&
          (!gradeId || question.gradeNodeId === gradeId) &&
          (!domainId || question.domainNodeId === domainId) &&
          (!chapterId || question.chapterNodeId === chapterId) &&
          (!lessonId || question.lessonNodeId === lessonId) &&
          (!formId || question.formNodeId === formId) &&
          (!level || question.level === level) &&
          (!type || question.questionType === type) &&
          (!imageFilter || (imageFilter === 'with' ? question.hasImage : !question.hasImage))
        );
      }),
    [
      data.questions,
      idQuery,
      contentQuery,
      gradeId,
      domainId,
      chapterId,
      lessonId,
      formId,
      level,
      type,
      imageFilter,
    ],
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selected = data.questions.find((question) => question.id === selectedId) ?? null;
  const hasFilters = Boolean(
    idQuery ||
    contentQuery ||
    gradeId ||
    domainId ||
    chapterId ||
    lessonId ||
    formId ||
    level ||
    type ||
    imageFilter,
  );
  const allPageChecked =
    pageRows.length > 0 && pageRows.every((question) => checked.includes(question.id));

  function resetFilters() {
    setIdQuery('');
    setContentQuery('');
    setGradeId('');
    setDomainId('');
    setChapterId('');
    setLessonId('');
    setFormId('');
    setLevel('');
    setType('');
    setImageFilter('');
  }

  function togglePage(shouldCheck: boolean) {
    const ids = pageRows.map((question) => question.id);
    setChecked((current) =>
      shouldCheck
        ? Array.from(new Set([...current, ...ids]))
        : current.filter((id) => !ids.includes(id)),
    );
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setReadingFiles(true);
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
      if (!imported.length) {
        toast('Không tìm thấy câu hỏi trong file.', 'error');
        return;
      }
      let texSettings = DEFAULT_TEX_PREVIEW_SETTINGS;
      if (isDesktop)
        try {
          texSettings = await invoke<TexPreviewSettings>('tex_preview_settings');
        } catch {
          // Import remains available; compilation will show the native configuration error later.
        }
      const issues = imported
        .flatMap((question) =>
          findUnsupportedLatex(question.rawSource, texSettings.additionalPreamble),
        )
        .filter(
          (issue, index, rows) =>
            rows.findIndex((row) => row.kind === issue.kind && row.token === issue.token) === index,
        );
      const withWarnings = issues.length
        ? imported.map((question) => {
            const questionIssues = findUnsupportedLatex(
              question.rawSource,
              texSettings.additionalPreamble,
            );
            return {
              ...question,
              warnings: [
                ...question.warnings,
                ...questionIssues.map((issue) => `Khai báo LaTeX: ${issue.message}`),
              ],
            };
          })
        : imported;
      setSkipIdentical(true);
      setPendingImport(withWarnings);
      setImportTexSettings(texSettings);
      setImportIssues(issues);
      setImportDeclarationStep(issues.length > 0);
      setImportDeclarationDraft(
        issues
          .map((issue) => issue.suggestion)
          .filter((value, index, rows) => rows.indexOf(value) === index)
          .join('\n'),
      );
    } catch (error) {
      toast(errorText(error), 'error');
    } finally {
      setReadingFiles(false);
    }
  }

  async function saveImportDeclarations() {
    if (!importTexSettings || !isDesktop) {
      setImportDeclarationStep(false);
      return;
    }
    const addition = importDeclarationDraft.trim();
    if (!addition) return;
    try {
      const next = {
        ...importTexSettings,
        additionalPreamble: [importTexSettings.additionalPreamble.trim(), addition]
          .filter(Boolean)
          .join('\n'),
      };
      await invoke('tex_preview_save_settings', { settings: next });
      setImportTexSettings(next);
      setImportDeclarationStep(false);
      toast('Đã lưu khai báo LaTeX bổ sung. Nội dung câu hỏi không bị thay đổi.');
    } catch (error) {
      toast(errorText(error), 'error');
    }
  }

  const importReview = useMemo(
    () => uniqueImports(pendingImport ?? [], data.questions),
    [pendingImport, data.questions],
  );
  const trash = useMemo(
    () => data.questions.filter((question) => question.deletedAt),
    [data.questions],
  );
  const safeTrashPage = Math.min(trashPage, Math.max(1, Math.ceil(trash.length / PAGE_SIZE)));

  async function confirmImport() {
    if (!pendingImport) return;
    try {
      let count = 0;
      await commit((snapshot) => {
        const rows = skipIdentical
          ? uniqueImports(pendingImport, snapshot.questions).questions
          : pendingImport;
        count = rows.length;
        return { ...snapshot, questions: [...snapshot.questions, ...rows] };
      });
      setPendingImport(null);
      toast(`Đã lưu ${count} câu. Câu trùng trong thùng rác có thể khôi phục từ nút Thùng rác.`);
    } catch (error) {
      toast(errorText(error), 'error');
    }
  }

  async function restoreQuestion(id: string) {
    try {
      await commit((snapshot) => ({
        ...snapshot,
        questions: snapshot.questions.map((question) =>
          question.id === id
            ? { ...question, deletedAt: null, updatedAt: new Date().toISOString() }
            : question,
        ),
      }));
      toast('Đã khôi phục câu hỏi, giữ nguyên ID và lịch sử.');
    } catch (error) {
      toast(errorText(error), 'error');
    }
  }

  async function reportAction(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (error) {
      toast(errorText(error), 'error');
    }
  }

  async function moveToTrash(ids: string[]) {
    if (!ids.length) return;
    if (!window.confirm(`Chuyển ${ids.length} câu đã chọn vào thùng rác?`)) return;
    const now = new Date().toISOString();
    await commit((snapshot) => ({
      ...snapshot,
      questions: snapshot.questions.map((question) =>
        ids.includes(question.id) ? { ...question, deletedAt: now } : question,
      ),
    }));
    setChecked((current) => current.filter((id) => !ids.includes(id)));
    if (selectedId && ids.includes(selectedId)) select(null);
    toast(`Đã chuyển ${ids.length} câu vào thùng rác.`);
  }

  async function copyQuestions(ids: string[]) {
    const source = data.questions
      .filter((question) => ids.includes(question.id))
      .map((question) => question.rawSource.trim())
      .join('\n\n');
    if (!source) return;
    try {
      await navigator.clipboard.writeText(source);
      toast(`Đã chép mã LaTeX của ${ids.length} câu.`);
    } catch {
      toast('Không thể truy cập bộ nhớ tạm trên thiết bị này.', 'error');
    }
  }

  async function buildExamFromSelection() {
    const questions = data.questions.filter((question) => checked.includes(question.id));
    if (!questions.length) return;
    const title = window.prompt('Tên đề:', 'Đề kiểm tra')?.trim();
    if (!title) return;
    const durationInput = window.prompt('Thời gian làm bài (phút):', '45');
    if (durationInput == null) return;
    const duration = Number(durationInput);
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440)
      return toast('Thời gian làm bài không hợp lệ.', 'error');
    const now = new Date().toISOString();
    const created = createExam(title, duration, questions, String(Date.now()));
    const next: BankSnapshot = {
      ...data,
      exams: [...data.exams, created.exam],
      examItems: [...data.examItems, ...created.items],
      questions: data.questions.map((question) =>
        checked.includes(question.id)
          ? {
              ...question,
              idLocked: true,
              usageCount: question.usageCount + 1,
              updatedAt: now,
            }
          : question,
      ),
    };
    await commit(() => next);
    await downloadText(`${title}.tex`, examToLatex(next, created.exam));
    toast(`Đã tạo đề gồm ${questions.length} câu và xuất tệp LaTeX.`);
  }

  function scanDuplicates() {
    const rows =
      visible.length > 2000 ? exactDuplicateCandidates(visible) : findDuplicateCandidates(visible);
    setDuplicates(rows);
  }

  if (!ready && loadError)
    return (
      <div className="page-loading" role="alert">
        <p>Không mở được ngân hàng: {loadError}</p>
        <button className="button secondary" onClick={() => void initialize()}>
          Thử lại
        </button>
      </div>
    );

  if (!ready)
    return (
      <div className="page-loading">
        <LoaderCircle className="spin" /> Đang mở ngân hàng câu hỏi…
      </div>
    );

  return (
    <div className="qb-page qb-mathhub-layout">
      <header className="qb-command-header">
        <div className="qb-title-block">
          <span>QUESTION BANK</span>
          <h1>Ngân hàng câu hỏi</h1>
          <small>{visible.length.toLocaleString('vi-VN')} câu hỏi</small>
        </div>
        <div className="qb-command-actions">
          {checked.length > 0 && (
            <div className="qb-selection-tools" aria-label="Thao tác với câu đã chọn">
              <strong>{checked.length} đã chọn</strong>
              <button
                onClick={() =>
                  setAiQuestions(
                    data.questions.filter((q) => !q.deletedAt && checked.includes(q.id)),
                  )
                }
              >
                <Sparkles size={15} /> Quét ID bằng AI
              </button>
              <button onClick={() => setChecked([])}>
                <X size={15} /> Bỏ chọn
              </button>
              <button onClick={() => void copyQuestions(checked)}>
                <Copy size={15} /> Chép code
              </button>
              <button
                onClick={() => {
                  select(checked[0]);
                  setDetailTab('preview');
                }}
              >
                <Eye size={15} /> Xem trước
              </button>
              <button className="accent" onClick={() => void reportAction(buildExamFromSelection)}>
                <FileOutput size={15} /> Tạo đề
              </button>
              <button
                className="danger"
                onClick={() => void reportAction(() => moveToTrash(checked))}
              >
                <Trash2 size={15} /> Xóa
              </button>
            </div>
          )}
          <button
            disabled={busy}
            onClick={() => {
              setTrashPage(1);
              setTrashOpen(true);
            }}
          >
            <Trash2 size={16} /> Thùng rác ({trash.length})
          </button>
          <button className="qb-duplicate-button" onClick={scanDuplicates}>
            <CopyCheck size={16} /> Quét trùng
          </button>
          <label className="button secondary qb-import-button">
            <FilePlus2 size={16} /> Nhập .tex
            <input
              hidden
              multiple
              type="file"
              accept=".tex,.txt"
              disabled={busy || readingFiles}
              onChange={(event) => {
                const files = event.target.files;
                void importFiles(files);
                event.target.value = '';
              }}
            />
          </label>
          <button className="button primary" onClick={() => setEditor('new')}>
            <Plus size={16} /> Thêm câu
          </button>
        </div>
      </header>

      <div className="qb-mathhub-shell">
        <aside className="qb-mathhub-filters" aria-label="Bộ lọc câu hỏi">
          <FilterSelect
            label="Lớp"
            value={gradeId}
            placeholder="— Tất cả lớp —"
            rows={grades}
            onChange={(value) => {
              setGradeId(value);
              setDomainId('');
              setChapterId('');
              setLessonId('');
              setFormId('');
            }}
          />
          <FilterSelect
            label="Cấp 2 / Phân môn"
            value={domainId}
            placeholder="— Tất cả —"
            rows={domains}
            disabled={!gradeId}
            onChange={(value) => {
              setDomainId(value);
              setChapterId('');
              setLessonId('');
              setFormId('');
            }}
          />
          <FilterSelect
            label="Chương"
            value={chapterId}
            placeholder="— Tất cả chương —"
            rows={chapters}
            disabled={!domainId}
            onChange={(value) => {
              setChapterId(value);
              setLessonId('');
              setFormId('');
            }}
          />
          <FilterSelect
            label="Bài"
            value={lessonId}
            placeholder="— Tất cả bài —"
            rows={lessons}
            disabled={!chapterId}
            onChange={(value) => {
              setLessonId(value);
              setFormId('');
            }}
          />
          <FilterSelect
            label="Dạng"
            value={formId}
            placeholder="— Tất cả dạng —"
            rows={forms}
            disabled={!lessonId}
            onChange={setFormId}
          />
          <label className="qb-filter-field">
            <span>Mức độ</span>
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              <option value="">— Tất cả mức độ —</option>
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="qb-filter-field">
            <span>Loại câu hỏi</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">— Tất cả loại —</option>
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="qb-filter-field">
            <span>Hình ảnh</span>
            <select value={imageFilter} onChange={(event) => setImageFilter(event.target.value)}>
              <option value="">— Có/Không có hình —</option>
              <option value="with">Có hình</option>
              <option value="without">Không có hình</option>
            </select>
          </label>
          <button className="qb-reset-button" disabled={!hasFilters} onClick={resetFilters}>
            <RotateCcw size={15} /> Xóa bộ lọc
          </button>
          <div className="qb-filter-count">
            Hiển thị {visible.length.toLocaleString('vi-VN')} câu
          </div>
        </aside>

        <main className="qb-bank-main">
          <div className="qb-search-row">
            <label>
              <Search size={15} />
              <input
                value={idQuery}
                onChange={(event) => setIdQuery(event.target.value)}
                placeholder="Tìm ID (VD: 0D1H3-1)"
              />
            </label>
            <label className="content-search">
              <Search size={15} />
              <input
                value={contentQuery}
                onChange={(event) => setContentQuery(event.target.value)}
                placeholder="Tìm theo nội dung…"
              />
            </label>
            <span className="qb-search-mode">Toàn văn</span>
          </div>
          <div className="qb-page-controls">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft size={15} />
            </button>
            <span>
              Trang {safePage}/{totalPages}
            </span>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="qb-table-wrap">
            <table className="qb-question-table">
              <thead>
                <tr>
                  <th className="check-column">
                    <input
                      aria-label="Chọn toàn bộ trang"
                      type="checkbox"
                      checked={allPageChecked}
                      onChange={(event) => togglePage(event.target.checked)}
                    />
                  </th>
                  <th className="number-column">TT</th>
                  <th>Mã ID</th>
                  <th>Mức độ</th>
                  <th>Loại câu</th>
                  <th>Đáp án</th>
                  <th className="image-column">
                    <ImageIcon size={14} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((question, index) => (
                  <tr
                    key={question.id}
                    className={selectedId === question.id ? 'active' : ''}
                    onClick={() => select(question.id)}
                  >
                    <td onClick={(event) => event.stopPropagation()}>
                      <input
                        aria-label={`Chọn ${question.displayId || 'câu nháp'}`}
                        type="checkbox"
                        checked={checked.includes(question.id)}
                        onChange={(event) =>
                          setChecked((current) =>
                            event.target.checked
                              ? [...current, question.id]
                              : current.filter((id) => id !== question.id),
                          )
                        }
                      />
                    </td>
                    <td>{(safePage - 1) * PAGE_SIZE + index + 1}</td>
                    <td
                      className="id-cell"
                      title={curriculumPath(data, question.formNodeId || question.lessonNodeId)}
                    >
                      {question.displayId ||
                        (question.classificationCode
                          ? `${question.classificationCode} · nguồn`
                          : 'CHƯA CÓ ID')}
                    </td>
                    <td>
                      <span className={`qb-badge level-${question.level.toLowerCase()}`}>
                        {LEVEL_LABELS[question.level]}
                      </span>
                    </td>
                    <td>
                      <span className={`qb-badge type-${question.questionType}`}>
                        {QUESTION_TYPE_LABELS[question.questionType]}
                      </span>
                    </td>
                    <td className="answer-cell">{question.answer || '—'}</td>
                    <td>{question.hasImage ? <ImageIcon size={14} /> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!pageRows.length && (
              <div className="qb-empty-table">
                <ListChecks size={24} />
                <strong>Không có câu hỏi khớp bộ lọc</strong>
                <button onClick={resetFilters}>Xóa bộ lọc</button>
              </div>
            )}
          </div>
        </main>

        <aside className="qb-question-detail">
          {selected && !selected.deletedAt ? (
            <>
              <div className="qb-detail-toolbar">
                <div className="qb-detail-tabs">
                  <button
                    className={detailTab === 'preview' ? 'active' : ''}
                    onClick={() => setDetailTab('preview')}
                  >
                    <Eye size={14} /> Xem trước
                  </button>
                  <button
                    className={detailTab === 'source' ? 'active' : ''}
                    onClick={() => setDetailTab('source')}
                  >
                    <Code2 size={14} /> Xem code
                  </button>
                </div>
                <div className="qb-detail-buttons">
                  <button onClick={() => setAiQuestions([selected])}>
                    <Sparkles size={14} /> Quét ID
                  </button>
                  <button onClick={() => setTexSource(selected.rawSource)}>
                    <Play size={14} /> Biên dịch
                  </button>
                  <button onClick={() => setEditor(selected)}>
                    <Pencil size={14} /> Sửa
                  </button>
                  <button
                    className="danger"
                    onClick={() => void reportAction(() => moveToTrash([selected.id]))}
                  >
                    <Trash2 size={14} /> Xóa
                  </button>
                  <button className="copy" onClick={() => void copyQuestions([selected.id])}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
              </div>
              <div className="qb-detail-identity">
                <strong>
                  {selected.displayId ||
                    (selected.classificationCode
                      ? `${selected.classificationCode} · ID nguồn chưa duyệt`
                      : 'Câu chưa có ID')}
                </strong>
                <span>{selected.source || 'Không ghi nguồn'}</span>
              </div>
              <div className="qb-detail-meta-row">
                <span className={`qb-badge type-${selected.questionType}`}>
                  {QUESTION_TYPE_LABELS[selected.questionType]}
                </span>
                <span className={`qb-badge level-${selected.level.toLowerCase()}`}>
                  {LEVEL_LABELS[selected.level]}
                </span>
                <span className="qb-path-label">
                  {curriculumPath(data, selected.formNodeId || selected.lessonNodeId) ||
                    'Chưa phân loại'}
                </span>
                <label className="qb-zoom-control">
                  A−
                  <input
                    type="range"
                    min="50"
                    max="140"
                    step="10"
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                  />
                  A+ <b>{zoom}%</b>
                </label>
              </div>
              {selected.warnings.length > 0 && (
                <details className="qb-question-warnings">
                  <summary>Cần kiểm tra ({selected.warnings.length})</summary>
                  {selected.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </details>
              )}
              <div className="qb-detail-content" style={{ fontSize: `${zoom}%` }}>
                {detailTab === 'preview' ? (
                  <QuestionPreview
                    source={selected.rawSource}
                    answer={selected.answer}
                    solution={selected.solution}
                  />
                ) : (
                  <pre className="qb-source-view">{selected.rawSource}</pre>
                )}
              </div>
            </>
          ) : (
            <div className="qb-empty-detail">
              <Eye size={28} />
              <span>Chọn một câu ở bảng để xem chi tiết.</span>
            </div>
          )}
        </aside>
      </div>

      <footer className="qb-statusbar">
        <span>{visible.length.toLocaleString('vi-VN')} câu theo bộ lọc hiện tại</span>
        <span>{hasFilters ? 'Đang áp dụng bộ lọc' : 'Bộ lọc: 0'}</span>
        <span>Ngân hàng: dữ liệu trên thiết bị</span>
        <span className="backend-ok">Backend: OK</span>
      </footer>

      {aiQuestions && <AiIdScan questions={aiQuestions} onClose={() => setAiQuestions(null)} />}
      {texSource !== null && (
        <TexLivePreview source={texSource} onClose={() => setTexSource(null)} />
      )}
      {pendingImport && (
        <Modal
          title={importDeclarationStep ? 'Bổ sung khai báo LaTeX' : 'Kiểm tra trước khi nhập'}
          subtitle={
            importDeclarationStep
              ? 'Phát hiện lệnh hoặc môi trường chưa có trong bộ tích hợp.'
              : 'Giữ nguyên mã LaTeX nguồn. ID đọc được chưa tự gán sang cây KNTT.'
          }
          onClose={() => !busy && setPendingImport(null)}
          wide
        >
          {importDeclarationStep ? (
            <div className="modal-body qb-tex-diagnostics">
              <h3>{importIssues.length} thành phần cần kiểm tra</h3>
              {importIssues.map((issue) => (
                <p key={`${issue.kind}:${issue.token}`}>{issue.message}</p>
              ))}
              <label className="field">
                Khai báo bổ sung
                <textarea
                  rows={10}
                  spellCheck={false}
                  value={importDeclarationDraft}
                  onChange={(event) => setImportDeclarationDraft(event.target.value)}
                />
              </label>
              <p className="muted">
                App không tự đoán số tham số của macro riêng. Hãy dán khai báo gốc nếu phần gợi ý
                mới chỉ là chú thích. Có thể tiếp tục nhập và bổ sung sau trong Cài đặt.
              </p>
            </div>
          ) : (
            <div className="modal-body">
              <p>
                {pendingImport.length} câu ·{' '}
                {pendingImport.filter((q) => q.classificationCode).length} có ID nguồn ·{' '}
                {pendingImport.filter((q) => q.warnings.length).length} cần xem lại.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={skipIdentical}
                  disabled={busy}
                  onChange={(e) => setSkipIdentical(e.target.checked)}
                />{' '}
                Bỏ qua {importReview.skipped} câu có mã LaTeX giống hệt (kể cả trong thùng rác).
              </label>
              <p>
                Sẽ lưu {skipIdentical ? importReview.questions.length : pendingImport.length} câu.
                Hiển thị tối đa 50 câu đầu bên dưới.
              </p>
              <div className="qb-import-review">
                {pendingImport.slice(0, 50).map((q, i) => (
                  <div key={q.id}>
                    <strong>
                      {i + 1}. {q.classificationCode || 'Chưa có ID'} ·{' '}
                      {QUESTION_TYPE_LABELS[q.questionType]}
                    </strong>
                    <small>
                      {q.source} · Đáp án: {q.answer || 'Chưa nhận diện'}
                    </small>
                    {q.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="modal-footer">
            {importDeclarationStep ? (
              <>
                <button className="button secondary" onClick={() => setPendingImport(null)}>
                  Hủy nhập
                </button>
                <button
                  className="button secondary"
                  onClick={() => setImportDeclarationStep(false)}
                >
                  Bỏ qua cảnh báo
                </button>
                <button
                  className="button primary"
                  disabled={isDesktop && !importDeclarationDraft.trim()}
                  onClick={() => void saveImportDeclarations()}
                >
                  {isDesktop ? 'Lưu khai báo và tiếp tục' : 'Tiếp tục kiểm tra'}
                </button>
              </>
            ) : (
              <>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setPendingImport(null)}
                >
                  Hủy nhập
                </button>
                {importIssues.length > 0 && (
                  <button
                    className="button secondary"
                    onClick={() => setImportDeclarationStep(true)}
                  >
                    Xem khai báo thiếu ({importIssues.length})
                  </button>
                )}
                <button
                  className="button primary"
                  disabled={busy || (skipIdentical && !importReview.questions.length)}
                  onClick={() => void confirmImport()}
                >
                  Xác nhận nhập
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
      {trashOpen && (
        <Modal
          title="Thùng rác câu hỏi"
          subtitle={`${trash.length} câu có thể khôi phục; không xóa vĩnh viễn.`}
          onClose={() => setTrashOpen(false)}
          wide
        >
          <div className="modal-body qb-import-review">
            {trash.slice((safeTrashPage - 1) * PAGE_SIZE, safeTrashPage * PAGE_SIZE).map((q) => (
              <div key={q.id}>
                <strong>{q.displayId || q.classificationCode || 'Câu chưa có ID'}</strong>
                <small>{q.source}</small>
                <p>{q.rawSource.slice(0, 180)}</p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void restoreQuestion(q.id)}
                >
                  Khôi phục
                </button>
              </div>
            ))}
            {!trash.length && <p>Thùng rác trống.</p>}
          </div>
          <div className="modal-footer">
            <button disabled={safeTrashPage <= 1} onClick={() => setTrashPage(safeTrashPage - 1)}>
              Trang trước
            </button>
            <span>Trang {safeTrashPage}</span>
            <button
              disabled={safeTrashPage * PAGE_SIZE >= trash.length}
              onClick={() => setTrashPage(safeTrashPage + 1)}
            >
              Trang sau
            </button>
          </div>
        </Modal>
      )}
      {editor && (
        <QuestionEditor
          question={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
      {duplicates !== null && (
        <DuplicateResults
          rows={duplicates}
          scanned={visible.length}
          onClose={() => setDuplicates(null)}
          onOpen={(id) => {
            select(id);
            setDuplicates(null);
          }}
        />
      )}
      {(busy || readingFiles) && (
        <div className="qb-saving">{busy ? 'Đang lưu…' : 'Đang đọc file…'}</div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  placeholder,
  rows,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  rows: Array<{ id: string; code: string; name: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="qb-filter-field">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {row.code ? `${row.code} · ` : ''}
            {row.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function DuplicateResults({
  rows,
  scanned,
  onClose,
  onOpen,
}: {
  rows: DuplicateCandidate[];
  scanned: number;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <Modal
      title="Quét câu trùng"
      subtitle={`Đã quét ${scanned.toLocaleString('vi-VN')} câu trong kết quả hiện tại.`}
      onClose={onClose}
      wide
    >
      <div className="modal-body qb-duplicate-modal">
        <div className="qb-duplicate-summary">
          <CopyCheck size={20} />
          <strong>{rows.length} cặp nghi trùng</strong>
          <span>Nhấn vào một cặp để mở câu thứ nhất và kiểm tra thủ công.</span>
        </div>
        <div className="qb-duplicate-results">
          {rows.map((pair) => (
            <button key={`${pair.left.id}-${pair.right.id}`} onClick={() => onOpen(pair.left.id)}>
              <b>{pair.score}%</b>
              <span>
                {pair.left.displayId || 'Câu nháp'} ↔ {pair.right.displayId || 'Câu nháp'}
              </span>
              <small>{pair.method === 'hash' ? 'Trùng chính xác' : 'Tương đồng nội dung'}</small>
            </button>
          ))}
          {!rows.length && (
            <div className="qb-empty-table">
              <CopyCheck size={24} />
              <strong>Không phát hiện câu trùng</strong>
            </div>
          )}
        </div>
      </div>
      <div className="modal-footer">
        <button className="button secondary" onClick={onClose}>
          Đóng
        </button>
      </div>
    </Modal>
  );
}
