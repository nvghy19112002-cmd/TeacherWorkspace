import type { CurriculumNode } from '../domain/model';

const CREATED_AT = '2026-01-01T00:00:00.000Z';

type Chapter = { code: string; name: string; lessons: string[] };

const TOAN_10: Chapter[] = [
  { code: 'I', name: 'Mệnh đề và tập hợp', lessons: ['Mệnh đề', 'Tập hợp', 'Các tập hợp số'] },
  { code: 'II', name: 'Bất phương trình và hệ bất phương trình bậc nhất hai ẩn', lessons: ['Bất phương trình bậc nhất hai ẩn', 'Hệ bất phương trình bậc nhất hai ẩn'] },
  { code: 'III', name: 'Hệ thức lượng trong tam giác', lessons: ['Hệ thức lượng trong tam giác'] },
  { code: 'IV', name: 'Vectơ', lessons: ['Các khái niệm mở đầu', 'Tổng và hiệu của hai vectơ', 'Tích của một vectơ với một số', 'Vectơ trong mặt phẳng tọa độ', 'Tích vô hướng của hai vectơ'] },
  { code: 'V', name: 'Các số đặc trưng đo xu thế trung tâm cho mẫu số liệu không ghép nhóm', lessons: ['Số gần đúng và sai số', 'Các số đặc trưng đo xu thế trung tâm', 'Các số đặc trưng đo độ phân tán'] },
  { code: 'VI', name: 'Hàm số, đồ thị và ứng dụng', lessons: ['Hàm số', 'Hàm số bậc hai', 'Dấu của tam thức bậc hai', 'Phương trình quy về phương trình bậc hai'] },
  { code: 'VII', name: 'Đại số tổ hợp', lessons: ['Quy tắc cộng và quy tắc nhân', 'Hoán vị, chỉnh hợp và tổ hợp', 'Nhị thức Newton'] },
  { code: 'VIII', name: 'Các quy tắc tính xác suất', lessons: ['Không gian mẫu và biến cố', 'Các quy tắc tính xác suất'] },
  { code: 'IX', name: 'Phương pháp tọa độ trong mặt phẳng', lessons: ['Phương trình đường thẳng', 'Phương trình đường tròn', 'Ba đường conic'] },
];

const TOAN_11: Chapter[] = [
  { code: 'I', name: 'Hàm số lượng giác và phương trình lượng giác', lessons: ['Giá trị lượng giác của góc lượng giác', 'Công thức lượng giác', 'Hàm số lượng giác', 'Phương trình lượng giác cơ bản'] },
  { code: 'II', name: 'Dãy số. Cấp số cộng và cấp số nhân', lessons: ['Dãy số', 'Cấp số cộng', 'Cấp số nhân'] },
  { code: 'III', name: 'Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm', lessons: ['Mẫu số liệu ghép nhóm', 'Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm'] },
  { code: 'IV', name: 'Đường thẳng và mặt phẳng trong không gian. Quan hệ song song', lessons: ['Đường thẳng và mặt phẳng trong không gian', 'Hai đường thẳng chéo nhau', 'Đường thẳng và mặt phẳng song song', 'Hai mặt phẳng song song', 'Phép chiếu song song'] },
  { code: 'V', name: 'Giới hạn. Hàm số liên tục', lessons: ['Giới hạn của dãy số', 'Giới hạn của hàm số', 'Hàm số liên tục'] },
  { code: 'VI', name: 'Hàm số mũ và hàm số lôgarit', lessons: ['Lũy thừa với số mũ thực', 'Lôgarit', 'Hàm số mũ và hàm số lôgarit', 'Phương trình, bất phương trình mũ và lôgarit'] },
  { code: 'VII', name: 'Quan hệ vuông góc trong không gian', lessons: ['Hai đường thẳng vuông góc', 'Đường thẳng vuông góc với mặt phẳng', 'Phép chiếu vuông góc. Góc giữa đường thẳng và mặt phẳng', 'Hai mặt phẳng vuông góc', 'Khoảng cách', 'Thể tích'] },
  { code: 'VIII', name: 'Các quy tắc tính xác suất', lessons: ['Biến cố hợp, biến cố giao, biến cố độc lập', 'Công thức cộng xác suất', 'Công thức nhân xác suất cho hai biến cố độc lập'] },
  { code: 'IX', name: 'Đạo hàm', lessons: ['Định nghĩa và ý nghĩa của đạo hàm', 'Các quy tắc tính đạo hàm', 'Đạo hàm cấp hai'] },
];

function makeTree(grade: string, chapters: Chapter[]): CurriculumNode[] {
  const now = CREATED_AT;
  const gradeId = `kntt-${grade}`;
  const domainId = `${gradeId}-domain-toan`;
  const nodes: CurriculumNode[] = [{ id: gradeId, parentId: null, kind: 'grade', code: grade, name: `Toán ${grade}`, description: `Sách giáo khoa Toán ${grade} – Kết nối tri thức với cuộc sống.`, sortOrder: 0, archived: false, createdAt: now, updatedAt: now }, { id: domainId, parentId: gradeId, kind: 'domain', code: 'TOAN', name: 'Toán học', description: 'Cây chương trình theo mục lục SGK Kết nối tri thức.', sortOrder: 0, archived: false, createdAt: now, updatedAt: now }];
  chapters.forEach((chapter, chapterIndex) => {
    const chapterId = `${domainId}-c${chapterIndex + 1}`;
    nodes.push({ id: chapterId, parentId: domainId, kind: 'chapter', code: chapter.code, name: `Chương ${chapter.code}. ${chapter.name}`, description: `Mục lục SGK Toán ${grade} Kết nối tri thức.`, sortOrder: chapterIndex, archived: false, createdAt: now, updatedAt: now });
    chapter.lessons.forEach((lesson, lessonIndex) => nodes.push({ id: `${chapterId}-b${lessonIndex + 1}`, parentId: chapterId, kind: 'lesson', code: `B${lessonIndex + 1}`, name: `Bài ${lessonIndex + 1}. ${lesson}`, description: '', sortOrder: lessonIndex, archived: false, createdAt: now, updatedAt: now }));
  });
  return nodes;
}

export const KNTT_MATH_10_11: CurriculumNode[] = [...makeTree('10', TOAN_10), ...makeTree('11', TOAN_11)];
