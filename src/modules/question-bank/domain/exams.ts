import type { BankSnapshot, Exam, ExamItem, Question } from './model';

function numberSeed(seed: string): number {
  let value = 2166136261;
  for (const character of seed) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return value >>> 0;
}

export function seededShuffle<T>(rows: T[], seed: string): T[] {
  const output = [...rows];
  let state = numberSeed(seed) || 1;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

export function chooseByMatrix(
  questions: Question[],
  counts: Record<Question['level'], number>,
  seed: string,
): { selected: Question[]; shortages: Partial<Record<Question['level'], number>> } {
  const selected: Question[] = [];
  const shortages: Partial<Record<Question['level'], number>> = {};
  for (const level of ['N', 'H', 'V', 'C'] as const) {
    const candidates = seededShuffle(
      questions.filter(
        (question) =>
          !question.deletedAt && question.status === 'approved' && question.level === level,
      ),
      `${seed}-${level}`,
    );
    selected.push(...candidates.slice(0, counts[level]));
    if (candidates.length < counts[level]) shortages[level] = counts[level] - candidates.length;
  }
  return { selected, shortages };
}

export function createExam(
  title: string,
  durationMinutes: number,
  questions: Question[],
  seed: string,
): {
  exam: Exam;
  items: ExamItem[];
} {
  const now = new Date().toISOString();
  const exam: Exam = {
    id: crypto.randomUUID(),
    title: title.trim(),
    gradeNodeId: questions[0]?.gradeNodeId ?? null,
    durationMinutes,
    examDate: null,
    status: 'draft',
    seed,
    createdAt: now,
    updatedAt: now,
  };
  return {
    exam,
    items: questions.map((question, sortOrder) => ({
      id: crypto.randomUUID(),
      examId: exam.id,
      sectionId: null,
      questionId: question.id,
      questionSnapshot: JSON.stringify(question),
      sortOrder,
      points: 0,
      locked: false,
    })),
  };
}

export function examToLatex(snapshot: BankSnapshot, exam: Exam): string {
  const items = snapshot.examItems
    .filter((item) => item.examId === exam.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const questions = new Map(snapshot.questions.map((question) => [question.id, question]));
  const body = items
    .map((item, index) => {
      let question: Question | undefined;
      try {
        question = JSON.parse(item.questionSnapshot) as Question;
      } catch {
        question = questions.get(item.questionId);
      }
      return `% Câu ${index + 1} • ${question?.displayId || 'Chưa có ID'}\n${question?.rawSource ?? '% Không đọc được snapshot câu hỏi'}`;
    })
    .join('\n\n');
  const answers = items
    .map((item, index) => {
      let question: Question | undefined;
      try {
        question = JSON.parse(item.questionSnapshot) as Question;
      } catch {
        question = questions.get(item.questionId);
      }
      return `% ${index + 1}. ${question?.answer || 'Chưa có đáp án'}`;
    })
    .join('\n');
  return `% Teacher Workspace V1.4\n% ${exam.title}\n% Thời gian: ${exam.durationMinutes} phút\n\n${body}\n\n% ĐÁP ÁN\n${answers}\n`;
}
