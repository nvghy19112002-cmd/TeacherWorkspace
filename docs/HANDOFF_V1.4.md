# Bàn giao Teacher Workspace V1.4

## Phạm vi đã triển khai

- Giữ Smart Schedule, Dashboard, Công việc, Thống kê, AI Tools và updater của V1.3.
- Gỡ TrigLab khỏi điều hướng và source runtime.
- Thêm Ngân hàng câu hỏi với cây `Khối → Phân môn → Chương → Bài → Dạng` và YCCD 2018 do giáo viên nhập/duyệt.
- CRUD câu hỏi, ID phân loại ổn định, lịch sử sửa, thùng rác và lọc/tìm kiếm.
- Nhập hàng loạt `.tex`/`.txt` theo môi trường `ex_test`; dữ liệu vào trạng thái nháp.
- Quét trùng offline theo hash và độ tương đồng.
- Hàng đợi Gemini nhiều câu: xác nhận trước khi gửi, chạy tuần tự, hủy, lưu kết quả và chỉ áp dụng sau khi giáo viên duyệt.
- Quản lý nhiều Gemini API key, key ưu tiên và fallback khi hết quota; key không nằm trong backup.
- Tạo đề theo ma trận N–H–V–C, seed tái lập, khóa ID câu đã dùng, snapshot nội dung/đáp án và xuất `.tex`.
- Backup/restore ngân hàng riêng trong Cài đặt.

## Dữ liệu và nâng cấp

Migration `002_question_bank.sql` chỉ thêm bảng. Dữ liệu lịch V1.3 được giữ nguyên; dữ liệu TrigLab cũ không bị xóa cưỡng bức nhưng không còn được sử dụng. Mỗi lần ghi Question Bank dùng revision guard và transaction.

Không hard-code cây KNTT hoặc YCCD. Giáo viên cần nhập bộ dữ liệu chính thức đã duyệt trước khi dùng AI phân loại và sinh ID đầy đủ.

## Kiểm chứng trong môi trường bàn giao

- ESLint: đạt.
- TypeScript strict: đạt.
- Vitest: `103/103` đạt, gồm 8 test mới cho Question Bank.
- Vite production build: đạt.
- Playwright: chưa chạy được vì môi trường hiện tại không có Chromium binary.
- Native Windows, Credential Manager, Gemini API thật, ký updater và NSIS installer: cần kiểm thử trên máy Windows trước phát hành.

## Phát hành

Trên Windows đã cài Node 22+, Rust stable, Visual Studio Build Tools và WebView2:

```powershell
npm ci
npm run check
cargo test --manifest-path src-tauri/Cargo.toml
.\Build-Signed-Windows.cmd
```

Chỉ phát hành tag `v1.4.0` sau khi thử nâng cấp trên một bản sao dữ liệu V1.3 thật, kiểm tra API key và cài đè installer thành công.
