import type { CurriculumNode } from './model';

type SeedBranch = {
  code: string;
  name: string;
  chapters: Array<{ code: string; name: string; lessons: string[] }>;
};

const grade10: SeedBranch[] = [
  {
    code: 'D',
    name: 'Đại số',
    chapters: [
      {
        code: '1',
        name: 'Chương 1. Mệnh đề và tập hợp',
        lessons: ['Bài 1. Mệnh đề', 'Bài 2. Tập hợp và các phép toán trên tập hợp'],
      },
      {
        code: '2',
        name: 'Chương 2. Bất phương trình và hệ bất phương trình bậc nhất hai ẩn',
        lessons: [
          'Bài 3. Bất phương trình bậc nhất hai ẩn',
          'Bài 4. Hệ bất phương trình bậc nhất hai ẩn',
        ],
      },
      {
        code: '6',
        name: 'Chương 6. Hàm số, đồ thị và ứng dụng',
        lessons: [
          'Bài 15. Hàm số',
          'Bài 16. Hàm số bậc hai',
          'Bài 17. Dấu của tam thức bậc hai',
          'Bài 18. Phương trình quy về phương trình bậc hai',
        ],
      },
      {
        code: '8',
        name: 'Chương 8. Đại số tổ hợp',
        lessons: [
          'Bài 23. Quy tắc đếm',
          'Bài 24. Hoán vị, chỉnh hợp và tổ hợp',
          'Bài 25. Nhị thức Newton',
        ],
      },
    ],
  },
  {
    code: 'H',
    name: 'Hình học và đo lường',
    chapters: [
      {
        code: '3',
        name: 'Chương 3. Hệ thức lượng trong tam giác',
        lessons: [
          'Bài 5. Giá trị lượng giác của một góc từ 0° đến 180°',
          'Bài 6. Hệ thức lượng trong tam giác',
        ],
      },
      {
        code: '4',
        name: 'Chương 4. Vectơ',
        lessons: [
          'Bài 7. Các khái niệm mở đầu',
          'Bài 8. Tổng và hiệu của hai vectơ',
          'Bài 9. Tích của một vectơ với một số',
          'Bài 10. Vectơ trong mặt phẳng tọa độ',
          'Bài 11. Tích vô hướng của hai vectơ',
        ],
      },
      {
        code: '7',
        name: 'Chương 7. Phương pháp tọa độ trong mặt phẳng',
        lessons: [
          'Bài 19. Phương trình đường thẳng',
          'Bài 20. Vị trí tương đối giữa hai đường thẳng. Góc và khoảng cách',
          'Bài 21. Đường tròn trong mặt phẳng tọa độ',
          'Bài 22. Ba đường conic',
        ],
      },
    ],
  },
  {
    code: 'T',
    name: 'Thống kê và xác suất',
    chapters: [
      {
        code: '5',
        name: 'Chương 5. Các số đặc trưng của mẫu số liệu không ghép nhóm',
        lessons: [
          'Bài 12. Số gần đúng và sai số',
          'Bài 13. Các số đặc trưng đo xu thế trung tâm',
          'Bài 14. Các số đặc trưng đo độ phân tán',
        ],
      },
      {
        code: '9',
        name: 'Chương 9. Tính xác suất theo định nghĩa cổ điển',
        lessons: [
          'Bài 26. Biến cố và định nghĩa cổ điển của xác suất',
          'Bài 27. Thực hành tính xác suất theo định nghĩa cổ điển',
        ],
      },
    ],
  },
];

const grade11: SeedBranch[] = [
  {
    code: 'D',
    name: 'Đại số và giải tích',
    chapters: [
      {
        code: '1',
        name: 'Chương 1. Hàm số lượng giác và phương trình lượng giác',
        lessons: [
          'Bài 1. Giá trị lượng giác của góc lượng giác',
          'Bài 2. Công thức lượng giác',
          'Bài 3. Hàm số lượng giác',
          'Bài 4. Phương trình lượng giác cơ bản',
        ],
      },
      {
        code: '2',
        name: 'Chương 2. Dãy số. Cấp số cộng và cấp số nhân',
        lessons: ['Bài 5. Dãy số', 'Bài 6. Cấp số cộng', 'Bài 7. Cấp số nhân'],
      },
      {
        code: '5',
        name: 'Chương 5. Giới hạn. Hàm số liên tục',
        lessons: [
          'Bài 15. Giới hạn của dãy số',
          'Bài 16. Giới hạn của hàm số',
          'Bài 17. Hàm số liên tục',
        ],
      },
      {
        code: '6',
        name: 'Chương 6. Hàm số mũ và hàm số lôgarit',
        lessons: [
          'Bài 18. Lũy thừa với số mũ thực',
          'Bài 19. Lôgarit',
          'Bài 20. Hàm số mũ và hàm số lôgarit',
          'Bài 21. Phương trình, bất phương trình mũ và lôgarit',
        ],
      },
      {
        code: '9',
        name: 'Chương 9. Đạo hàm',
        lessons: [
          'Bài 31. Định nghĩa và ý nghĩa của đạo hàm',
          'Bài 32. Các quy tắc tính đạo hàm',
          'Bài 33. Đạo hàm cấp hai',
        ],
      },
    ],
  },
  {
    code: 'H',
    name: 'Hình học và đo lường',
    chapters: [
      {
        code: '4',
        name: 'Chương 4. Quan hệ song song trong không gian',
        lessons: [
          'Bài 10. Đường thẳng và mặt phẳng trong không gian',
          'Bài 11. Hai đường thẳng song song',
          'Bài 12. Đường thẳng và mặt phẳng song song',
          'Bài 13. Hai mặt phẳng song song',
          'Bài 14. Phép chiếu song song',
        ],
      },
      {
        code: '7',
        name: 'Chương 7. Quan hệ vuông góc trong không gian',
        lessons: [
          'Bài 22. Hai đường thẳng vuông góc',
          'Bài 23. Đường thẳng vuông góc với mặt phẳng',
          'Bài 24. Phép chiếu vuông góc. Góc giữa đường thẳng và mặt phẳng',
          'Bài 25. Hai mặt phẳng vuông góc',
          'Bài 26. Khoảng cách',
          'Bài 27. Thể tích',
        ],
      },
    ],
  },
  {
    code: 'T',
    name: 'Thống kê và xác suất',
    chapters: [
      {
        code: '3',
        name: 'Chương 3. Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm',
        lessons: [
          'Bài 8. Mẫu số liệu ghép nhóm',
          'Bài 9. Các số đặc trưng đo xu thế trung tâm cho mẫu số liệu ghép nhóm',
        ],
      },
      {
        code: '8',
        name: 'Chương 8. Các quy tắc tính xác suất',
        lessons: [
          'Bài 28. Biến cố hợp, biến cố giao, biến cố độc lập',
          'Bài 29. Công thức cộng xác suất',
          'Bài 30. Công thức nhân xác suất cho hai biến cố độc lập',
        ],
      },
    ],
  },
];

function lessonCode(name: string): string {
  return name.match(/^Bài (\d+)\./)?.[1] ?? '0';
}

function createGrade(
  code: string,
  name: string,
  branches: SeedBranch[],
  now: string,
): CurriculumNode[] {
  const gradeId = `kntt-toan-${code}-grade`;
  const rows: CurriculumNode[] = [
    {
      id: gradeId,
      parentId: null,
      kind: 'grade',
      code,
      name,
      description: 'Toán – bộ sách Kết nối tri thức với cuộc sống.',
    sortOrder: Number(code),
      archived: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
  branches.forEach((branch, domainOrder) => {
    const domainId = `kntt-toan-${code}-domain-${branch.code.toLowerCase()}`;
    rows.push({
      id: domainId,
      parentId: gradeId,
      kind: 'domain',
      code: branch.code,
      name: branch.name,
      description: '',
      sortOrder: domainOrder,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
    branch.chapters.forEach((chapter, chapterOrder) => {
      const chapterId = `kntt-toan-${code}-chapter-${chapter.code}`;
      rows.push({
        id: chapterId,
        parentId: domainId,
        kind: 'chapter',
        code: chapter.code,
        name: chapter.name,
        description: '',
        sortOrder: chapterOrder,
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
      chapter.lessons.forEach((lesson, lessonOrder) =>
        rows.push({
          id: `kntt-toan-${code}-lesson-${lessonCode(lesson)}`,
          parentId: chapterId,
          kind: 'lesson',
          code: lessonCode(lesson),
          name: lesson,
          description: '',
          sortOrder: lessonOrder,
          archived: false,
          createdAt: now,
          updatedAt: now,
        }),
      );
    });
  });
  return rows;
}

/** Default taxonomy only: Dạng and YCCD remain teacher-approved data. */
export function createKnttMath1011Curriculum(now = new Date().toISOString()): CurriculumNode[] {
  return [...createGrade('0', 'Lớp 10', grade10, now), ...createGrade('1', 'Lớp 11', grade11, now)];
}
