import { parseExTest } from '../domain/parser';
import { useMemo, useState } from 'react';
import { Modal } from '../../../components/Modal';
import { useToasts } from '../../../components/feedback';
import { errorText } from '../../../app/store';
import { buildClassificationCode, nextQuestionId } from '../domain/ids';
import { normalizeQuestionSource, questionHash } from '../domain/normalize';
import {
  LEVEL_LABELS,
  QUESTION_TYPE_LABELS,
  STATUS_LABELS,
  questionSchema,
  type CurriculumNode,
  type Question,
} from '../domain/model';
import { useQuestionBank } from '../store';
import { QuestionPreview } from './QuestionPreview';

function blankQuestion(): Question {
  const now = new Date().toISOString();
  const rawSource = '\\begin{ex}\n\t\n\t\\loigiai{\n\t}\n\\end{ex}';
  return {
    id: crypto.randomUUID(),
    displayId: '',
    classificationCode: '',
    sequenceNumber: null,
    rawSource,
    normalizedSource: normalizeQuestionSource(rawSource),
    contentHash: questionHash(rawSource),
    questionType: 'essay',
    answer: '',
    solution: '',
    level: 'N',
    gradeNodeId: null,
    domainNodeId: null,
    chapterNodeId: null,
    lessonNodeId: null,
    formNodeId: null,
    primaryOutcomeId: null,
    secondaryOutcomeIds: [],
    tags: [],
    source: '',
    status: 'draft',
    confidence: null,
    reasoning: '',
    warnings: [],
    hasImage: false,
    usageCount: 0,
    idLocked: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function QuestionEditor({
  question,
  onClose,
}: {
  question?: Question;
  onClose: () => void;
}) {
  const data = useQuestionBank((state) => state.data);
  const commit = useQuestionBank((state) => state.commit);
  const busy = useQuestionBank((state) => state.busy);
  const toast = useToasts((state) => state.push);
  const [draft, setDraft] = useState<Question>(() => structuredClone(question ?? blankQuestion()));
  const [preview, setPreview] = useState(false);
  const children = (parentId: string | null, kind: CurriculumNode['kind']) =>
    data.curriculumNodes
      .filter((node) => node.parentId === parentId && node.kind === kind && !node.archived)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  const grades = children(null, 'grade');
  const domains = children(draft.gradeNodeId, 'domain');
  const chapters = children(draft.domainNodeId, 'chapter');
  const lessons = children(draft.chapterNodeId, 'lesson');
  const forms = children(draft.lessonNodeId, 'form');
  const outcomes = data.learningOutcomes.filter((outcome) => outcome.active);
  const classificationCode = useMemo(
    () => buildClassificationCode(data.curriculumNodes, draft),
    [data.curriculumNodes, draft],
  );
  const setNode = (
    field: keyof Pick<
      Question,
      'gradeNodeId' | 'domainNodeId' | 'chapterNodeId' | 'lessonNodeId' | 'formNodeId'
    >,
    value: string,
  ) => {
    const patch: Partial<Question> = { [field]: value || null };
    if (field === 'gradeNodeId')
      Object.assign(patch, {
        domainNodeId: null,
        chapterNodeId: null,
        lessonNodeId: null,
        formNodeId: null,
      });
    if (field === 'domainNodeId')
      Object.assign(patch, { chapterNodeId: null, lessonNodeId: null, formNodeId: null });
    if (field === 'chapterNodeId') Object.assign(patch, { lessonNodeId: null, formNodeId: null });
    if (field === 'lessonNodeId') Object.assign(patch, { formNodeId: null });
    setDraft((current) => ({ ...current, ...patch }));
  };

  function readSource() {
    try {
      const rows = parseExTest(draft.rawSource);
      if (rows.length !== 1)
        throw new Error('Trình sửa chỉ nhận một câu; hãy dùng Nhập .tex cho nhiều câu.');
      const parsed = rows[0];
      if (
        !window.confirm(
          'Đọc lại loại câu, đáp án và lời giải từ mã LaTeX? Các ô thông tin này sẽ được thay thế trong bản đang sửa.',
        )
      )
        return;
      setDraft((current) => ({
        ...current,
        questionType: parsed.questionType,
        answer: parsed.answer,
        solution: parsed.solution,
        hasImage: parsed.hasImage,
        warnings: parsed.warnings,
      }));
      toast('Đã đọc lại nội dung. Kiểm tra các ô thông tin rồi bấm Lưu câu hỏi.');
    } catch (error) {
      toast(errorText(error), 'error');
    }
  }

  async function save() {
    try {
      if (!draft.rawSource.trim()) throw new Error('Nội dung câu hỏi không được để trống.');
      if (question?.idLocked && classificationCode !== question.classificationCode)
        throw new Error(
          'ID đã khóa vì câu từng được dùng trong đề. Hãy nhân bản câu nếu cần phân loại khác.',
        );
      let displayId = draft.displayId;
      let sequenceNumber = draft.sequenceNumber;
      if (
        classificationCode &&
        (!question || classificationCode !== question.classificationCode || !displayId)
      ) {
        const next = nextQuestionId(
          data.questions.filter((item) => item.id !== draft.id),
          classificationCode,
        );
        displayId = next.displayId;
        sequenceNumber = next.sequenceNumber;
      }
      const now = new Date().toISOString();
      const saved = questionSchema.parse({
        ...draft,
        displayId,
        classificationCode: classificationCode || draft.classificationCode,
        sequenceNumber,
        normalizedSource: normalizeQuestionSource(draft.rawSource),
        contentHash: questionHash(draft.rawSource),
        hasImage: /\\includegraphics|\\begin\{tikzpicture\}|\\begin\{axis\}/.test(draft.rawSource),
        updatedAt: now,
      });
      await commit((snapshot) => ({
        ...snapshot,
        questions: question
          ? snapshot.questions.map((item) => (item.id === saved.id ? saved : item))
          : [...snapshot.questions, saved],
        revisions: question
          ? [
              ...snapshot.revisions,
              {
                id: crypto.randomUUID(),
                questionId: question.id,
                snapshot: JSON.stringify(question),
                reason: 'Chỉnh sửa thủ công',
                createdAt: now,
              },
            ]
          : snapshot.revisions,
      }));
      toast(question ? 'Đã lưu phiên bản câu hỏi.' : 'Đã thêm câu hỏi.');
      useQuestionBank.getState().select(saved.id);
      onClose();
    } catch (error) {
      toast(errorText(error), 'error');
    }
  }

  const select = (label: string, field: keyof Question, rows: CurriculumNode[]) => (
    <label className="field">
      {label}
      <select
        value={String(draft[field] ?? '')}
        onChange={(event) => setNode(field as never, event.target.value)}
      >
        <option value="">— Chưa chọn —</option>
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {row.code} · {row.name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Modal
      title={question ? `Sửa ${question.displayId || 'câu nháp'}` : 'Thêm câu hỏi'}
      subtitle="Nội dung gốc luôn được giữ để xuất lại chính xác."
      onClose={onClose}
      wide
    >
      <div className="modal-body qb-editor-modal">
        <div className="qb-editor-grid">
          <div>
            <div className="qb-editor-tabs">
              <button
                className={`button small ${!preview ? 'primary' : 'secondary'}`}
                onClick={() => setPreview(false)}
              >
                Mã LaTeX
              </button>
              <button
                className={`button small ${preview ? 'primary' : 'secondary'}`}
                onClick={() => setPreview(true)}
              >
                Xem trước
              </button>
            </div>
            <button type="button" className="button secondary" disabled={busy} onClick={readSource}>
              Đọc thông tin từ LaTeX
            </button>
            {preview ? (
              <QuestionPreview source={draft.rawSource} />
            ) : (
              <textarea
                className="qb-source-editor"
                aria-label="Mã LaTeX"
                spellCheck={false}
                value={draft.rawSource}
                onChange={(event) => setDraft({ ...draft, rawSource: event.target.value })}
              />
            )}
            <details className="qb-editor-optional">
              <summary>Đáp án và lời giải đã nhận diện · mở để chỉnh</summary>
              <div className="form-grid">
                <label className="field">
                  Đáp án
                  <textarea
                    rows={3}
                    value={draft.answer}
                    onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
                  />
                </label>
                <label className="field">
                  Lời giải
                  <textarea
                    rows={3}
                    value={draft.solution}
                    onChange={(event) => setDraft({ ...draft, solution: event.target.value })}
                  />
                </label>
              </div>
            </details>
          </div>
          <div className="qb-metadata-fields">
            <label className="field">
              Loại câu
              <select
                value={draft.questionType}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    questionType: event.target.value as Question['questionType'],
                  })
                }
              >
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Mức độ
              <select
                value={draft.level}
                onChange={(event) =>
                  setDraft({ ...draft, level: event.target.value as Question['level'] })
                }
              >
                {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <details className="qb-editor-optional" open={!question || Boolean(draft.gradeNodeId)}>
              <summary>
                Phân loại theo cây KNTT{' '}
                {classificationCode ? `· ${classificationCode}` : '· chưa chọn'}
              </summary>
              {select('Lớp', 'gradeNodeId', grades)}
              {select('Mạch kiến thức', 'domainNodeId', domains)}
              {select('Chương', 'chapterNodeId', chapters)}
              {select('Bài', 'lessonNodeId', lessons)}
              {select('Dạng', 'formNodeId', forms)}
            </details>
            <details className="qb-editor-optional">
              <summary>Thông tin bổ sung · yêu cầu cần đạt, nguồn, nhãn</summary>
              <label className="field">
                Yêu cầu cần đạt
                <select
                  value={draft.primaryOutcomeId ?? ''}
                  onChange={(event) =>
                    setDraft({ ...draft, primaryOutcomeId: event.target.value || null })
                  }
                >
                  <option value="">— Chưa chọn —</option>
                  {outcomes.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.code} · {row.content}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Nguồn
                <input
                  value={draft.source}
                  maxLength={1000}
                  onChange={(event) => setDraft({ ...draft, source: event.target.value })}
                />
              </label>
              <label className="field">
                Nhãn, phân cách bằng dấu phẩy
                <input
                  value={draft.tags.join(', ')}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      tags: event.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .slice(0, 100),
                    })
                  }
                />
              </label>
              <label className="field">
                Trạng thái
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft({ ...draft, status: event.target.value as Question['status'] })
                  }
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </details>
            <div className="qb-id-preview">
              <span>Mã sẽ lưu</span>
              <strong>
                {classificationCode
                  ? `${classificationCode}-${String(draft.sequenceNumber ?? 'TỰ ĐỘNG').padStart(3, '0')}`
                  : 'Chưa đủ cây phân loại'}
              </strong>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="button secondary" onClick={onClose}>
          Hủy
        </button>
        <button className="button primary" disabled={busy} onClick={() => void save()}>
          {busy ? 'Đang lưu…' : 'Lưu câu hỏi'}
        </button>
      </div>
    </Modal>
  );
}
