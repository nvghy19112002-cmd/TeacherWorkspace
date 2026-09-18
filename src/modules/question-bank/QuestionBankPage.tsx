import { useEffect, useMemo, useState } from 'react';
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
  Trash2,
  X,
} from 'lucide-react';
import { errorText } from '../../app/store';
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
  const ready = useQuestionBank((state) => state.ready);
  const busy = useQuestionBank((state) => state.busy);
  const selectedId = useQuestionBank((state) => state.selectedId);
  const initialize = useQuestionBank((state) => state.initialize);
  const commit = useQuestionBank((state) => state.commit);
  const select = useQuestionBank((state) => state.select);
  const toast = useToasts((state) => state.push);

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
          (!idNeedle || question.displayId.toLocaleLowerCase('vi').includes(idNeedle)) &&
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
      toast(`Đã nhập ${imported.length} câu vào ngân hàng.`);
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
              <button className="accent" onClick={() => void buildExamFromSelection()}>
                <FileOutput size={15} /> Tạo đề
              </button>
              <button className="danger" onClick={() => void moveToTrash(checked)}>
                <Trash2 size={15} /> Xóa
              </button>
            </div>
          )}
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
              onChange={(event) => void importFiles(event.target.files)}
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
                      {question.displayId || 'CHƯA CÓ ID'}
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
                  <button onClick={() => setEditor(selected)}>
                    <Pencil size={14} /> Sửa
                  </button>
                  <button className="danger" onClick={() => void moveToTrash([selected.id])}>
                    <Trash2 size={14} /> Xóa
                  </button>
                  <button className="copy" onClick={() => void copyQuestions([selected.id])}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
              </div>
              <div className="qb-detail-identity">
                <strong>{selected.displayId || 'Câu chưa có ID'}</strong>
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
      {busy && <div className="qb-saving">Đang lưu…</div>}
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
