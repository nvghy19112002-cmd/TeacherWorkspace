import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../../components/Modal';
import { errorText, useWorkspace } from '../../../app/store';
import { readAiState } from '../../ai-tools/services/state';
import { classificationResultSchema, type ClassificationResult } from '../domain/classification';
import { LEVEL_LABELS, type Question } from '../domain/model';
import { classifyQuestionOnline } from '../services/classificationProvider';
import { useQuestionBank } from '../store';

export function AiIdScan({ questions, onClose }: { questions: Question[]; onClose: () => void }) {
  const data = useQuestionBank((state) => state.data);
  const settings = useWorkspace((state) => state.data.settings);
  const model = readAiState(settings.moduleState?.aiTools).model;
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const ids = new Set(questions.map((q) => q.id));
  const history = data.classificationRuns
    .filter((run) => ids.has(run.questionId))
    .slice(-50)
    .reverse();

  async function run() {
    if (controller.current || !consent || !model) return;
    const abort = new AbortController();
    controller.current = abort;
    setRunning(true);
    setError('');
    let completed = 0;
    try {
      for (const [index, question] of questions.entries()) {
        if (abort.signal.aborted) break;
        const snapshot = useQuestionBank.getState().data;
        const current = snapshot.questions.find((q) => q.id === question.id && !q.deletedAt);
        if (!current) continue;
        setProgress(`Đang phân tích ${index + 1}/${questions.length}…`);
        const response = await classifyQuestionOnline(snapshot, current, abort.signal);
        if (abort.signal.aborted) break;
        await useQuestionBank.getState().commit((latest) => ({
          ...latest,
          classificationRuns: [
            ...latest.classificationRuns,
            {
              id: crypto.randomUUID(),
              questionId: current.id,
              provider: 'gemini',
              model: response.model,
              resultJson: JSON.stringify(response.result),
              accepted: false,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        completed += 1;
      }
      setProgress(
        `${abort.signal.aborted ? 'Đã dừng' : 'Hoàn tất'}: lưu ${completed} đề xuất. Chưa thay đổi ID câu hỏi.`,
      );
    } catch (cause) {
      setError(abort.signal.aborted ? 'Đã hủy quét.' : errorText(cause));
      setProgress(`Đã lưu ${completed} đề xuất trước khi dừng.`);
    } finally {
      controller.current = null;
      setRunning(false);
    }
  }
  return (
    <Modal
      title="Quét ID bằng AI"
      subtitle="Bản thử nghiệm — cây mục lục đang hoàn thiện."
      onClose={() => {
        if (!running) onClose();
      }}
      wide
    >
      <div className="modal-body qb-ai-scan">
        <p>
          <strong>{questions.length} câu</strong> · Gemini · Model:{' '}
          <strong>{model || 'Chưa chọn'}</strong>
        </p>
        {!model && (
          <p role="alert">
            Vào Cài đặt → API key hoặc AI Tools → Provider để chọn model và kiểm tra key.
          </p>
        )}
        <p>
          AI chỉ đề xuất chương, bài, dạng và mức độ theo dữ liệu hiện có. Chưa có thao tác áp dụng
          ID; đề xuất được lưu riêng để xem lại.
        </p>
        <label>
          <input
            type="checkbox"
            checked={consent}
            disabled={running}
            onChange={(event) => setConsent(event.target.checked)}
          />{' '}
          Tôi đồng ý gửi nội dung, đáp án, lời giải và cây chương trình đến Gemini để phân tích; có
          thể phát sinh phí API.
        </label>
        <p role="status">{progress}</p>
        {error && <p role="alert">{error}</p>}
        <h3>Đề xuất gần đây ({history.length}, tối đa 50)</h3>
        {history.map((run) => {
          let result: ClassificationResult;
          try {
            result = classificationResultSchema.parse(JSON.parse(run.resultJson));
          } catch {
            return <p key={run.id}>Không đọc được đề xuất cũ.</p>;
          }
          const question = questions.find((q) => q.id === run.questionId);
          const nodeName = (id: string | null) =>
            id
              ? (data.curriculumNodes.find((n) => n.id === id)?.name ??
                `Nút không có trong cây: ${id}`)
              : 'Chưa xác định';
          return (
            <details key={run.id} className="qb-ai-result">
              <summary>
                {question?.displayId ||
                  question?.classificationCode ||
                  question?.source ||
                  'Câu chưa có ID'}{' '}
                · {result.proposedClassificationCode || 'Chưa đủ dữ liệu cấp mã'} ·{' '}
                {Math.round(result.confidence * 100)}% (AI tự đánh giá)
              </summary>
              <small>
                {run.model} · {new Date(run.createdAt).toLocaleString('vi-VN')} · Chưa áp dụng
              </small>
              <p>
                Chương: {nodeName(result.chapterId)} · Bài: {nodeName(result.lessonId)} · Dạng:{' '}
                {nodeName(result.formId)}
              </p>
              <p>Mức độ: {LEVEL_LABELS[result.level]}</p>
              <p>{result.reasoningSummary}</p>
              {result.warnings.map((warning, index) => (
                <p key={index}>{warning}</p>
              ))}
              <p>Đáp án AI tự giải: {result.independentAnswer || 'Chưa xác định'}</p>
            </details>
          );
        })}
        {!history.length && <p>Chưa có đề xuất cho các câu đã chọn.</p>}
      </div>
      <div className="modal-footer">
        {running ? (
          <button className="button secondary" onClick={() => controller.current?.abort()}>
            Dừng quét
          </button>
        ) : (
          <button className="button secondary" onClick={onClose}>
            Đóng
          </button>
        )}
        <button
          className="button primary"
          disabled={running || !consent || !model || !questions.length}
          onClick={() => void run()}
        >
          Chạy AI đề xuất
        </button>
      </div>
    </Modal>
  );
}
