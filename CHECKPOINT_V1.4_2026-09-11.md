# CHECKPOINT — Teacher Workspace V1.4

Thời điểm tạm dừng: 11/09/2026 (UTC)

## Source gốc

- `TeacherWorkspace-V1.3-manual-update-source(1).zip`
- Prompt: `MASTER_PROMPT_TEACHER_WORKSPACE_V1.4_QUESTION_BANK(1).md`
- Thư mục đang phát triển: `TeacherWorkspace-V1.4/`

## Baseline đã xác minh trước khi sửa

- `npm ci`: đạt.
- `npm run check`: đạt.
- ESLint: đạt.
- Unit test V1.3: `124/124` đạt.
- TypeScript strict + Vite production build: đạt.

## Công việc đã thực hiện trong V1.4

### 1. Version và TrigLab

- `package.json`/`package-lock.json` đã nâng lên `1.4.0` bằng `npm version`.
- `src-tauri/Cargo.toml` đã nâng lên `1.4.0`.
- `src-tauri/tauri.conf.json` đã nâng lên `1.4.0`.
- Đã bỏ TrigLab khỏi `navigation.ts` và `App.tsx`.
- Đã xóa source module TrigLab cùng unit/E2E test riêng của TrigLab.
- `App.tsx` hiện đã trỏ tới `QuestionBankPage`, nhưng file page chính chưa được tạo tại thời điểm checkpoint.

### 2. Migration và kho dữ liệu Question Bank

- Đã thêm `src/database/migrations/002_question_bank.sql`.
- Migration có bảng cho:
  - metadata/revision Question Bank;
  - cây chương trình;
  - yêu cầu cần đạt;
  - câu hỏi;
  - lịch sử phiên bản câu;
  - asset/tag/liên kết YCCD;
  - kết quả phân loại AI;
  - nhóm nghi ngờ trùng;
  - đề/phần/câu trong đề;
  - lịch sử import.
- Web SQLite đã nâng `user_version` lên 2 và chạy migration 002.
- Rust SQLite đã đăng ký migration 002.
- Đã thêm driver riêng `loadBank/commitBank` cho browser và native.
- Đã thêm Rust commands `load_question_bank` và `commit_question_bank`.

### 3. Domain Question Bank

Đã tạo:

- `domain/model.ts`
- `domain/types.ts`
- `domain/ids.ts`
- `domain/normalize.ts`
- `domain/parser.ts`
- `domain/curriculum.ts`
- `domain/duplicates.ts`
- `domain/exams.ts`
- `domain/classification.ts`
- `database/codec.ts`
- `store.ts`

Đã có logic nền cho:

- schema cây/YCCD/câu hỏi/đề thi;
- mã phân loại và ID dạng `0D1N1-1-001`;
- chuẩn hóa/hash/độ tương đồng;
- parse môi trường `ex_test` cơ bản;
- import/export cây chương trình JSON;
- quét trùng offline;
- chọn câu theo ma trận có seed;
- tạo đề và xuất LaTeX;
- structured schema AI classification theo YCCD 2018.

### 4. Nhiều Gemini API key

- Đã thêm metadata schema/store `domain/keyPool.ts`.
- `credentials.ts` đã hỗ trợ nhiều key theo ID và key ưu tiên.
- Rust Credential Manager đã được mở rộng theo credential ID.
- Đã thêm command xóa key.
- `ProviderSettings.tsx` đã được thay bằng giao diện danh sách nhiều key:
  - thêm/đặt nhãn;
  - ẩn/hiện;
  - lên/xuống;
  - chọn key chính;
  - kiểm tra từng key;
  - trạng thái;
  - tùy chọn chuyển key khi hết quota;
  - model dùng chung.
- `LatexWorkbench` đã đổi sang đọc key ưu tiên từ kho chung.
- Đã thêm `services/classificationProvider.ts` với structured output và failover có kiểm soát.

### 5. Giao diện Question Bank đã bắt đầu

Đã tạo:

- `components/QuestionPreview.tsx`
- `components/QuestionEditor.tsx`
- `components/CurriculumManager.tsx`

Các component này chưa được nối vào page chính và chưa có CSS hoàn chỉnh.

## Trạng thái quan trọng tại điểm dừng

Source hiện là **checkpoint đang phát triển**, chưa phải bản bàn giao và dự kiến chưa compile vì:

- chưa có `src/modules/question-bank/QuestionBankPage.tsx`;
- chưa có CSS cho module Question Bank và giao diện multi-key mới;
- còn phải chạy TypeScript/ESLint để sửa lỗi kiểu dữ liệu hoặc format phát sinh;
- Rust mới được patch nhưng chưa chạy Cargo trong môi trường hiện tại;
- backup/restore Question Bank chưa nối vào màn hình Cài đặt;
- chưa thêm panel API key vào `Cài đặt` (hiện ProviderSettings mới dùng trong AI Tools);
- chưa tạo ImportPanel, DuplicatePanel, AI Classification UI và Exam Builder UI;
- chưa cập nhật README/docs/test report/changelog;
- chưa viết test V1.4;
- chưa chạy V1.4 build/E2E/visual QA.

## Thứ tự tiếp tục đề nghị

1. Tạo `QuestionBankPage.tsx` và `questionBank.css`.
2. Tạo Kho câu hỏi ba vùng, bộ lọc, chi tiết, thùng rác.
3. Tạo ImportPanel cho `.tex`/JSON/CSV; sau đó bổ sung project/ZIP nếu khả thi.
4. Tạo DuplicatePanel.
5. Tạo AI Classification Panel và luồng duyệt kết quả.
6. Tạo Exam Builder, ma trận và xuất `.tex`.
7. Gắn `ProviderSettings` vào `Cài đặt → API key` và tránh trùng nơi quản lý.
8. Nối backup/restore Question Bank với backup V1.3 tương thích.
9. Chạy `npm run format`, `npm run check`; sửa toàn bộ lỗi.
10. Viết unit/database/E2E test V1.4 và chạy regression.
11. Chạy preview, chụp/kiểm tra light-dark 1440px và 1024px.
12. Cập nhật tài liệu, changelog, handoff; đóng gói source sạch không kèm `node_modules`/`dist`.
13. Nếu không có Windows toolchain, ghi rõ native installer/API thật/updater chưa xác minh.

## Quy tắc tiếp tục

- Không bắt đầu lại từ V1.3.
- Tiếp tục trực tiếp trên checkpoint này.
- Không tự tạo cây KNTT/YCCD khi người dùng chưa cung cấp dữ liệu chính thức.
- Không tuyên bố V1.4 hoàn thành cho tới khi test/build/QA và tài liệu đạt.
- Không đưa API key/private updater key vào source, backup hoặc log.
