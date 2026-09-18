# Bàn giao Teacher Workspace V1.5.0

## Mục tiêu bản này

V1.5.0 ưu tiên hoàn thiện trải nghiệm Ngân hàng câu hỏi theo quy trình làm việc quen thuộc của MathHub. Đây là lần làm lại giao diện, chưa mở rộng thêm các tính năng AI hoặc thay đổi dữ liệu chương trình.

## Thay đổi chính

- Gộp màn hình Ngân hàng câu hỏi thành một workspace ba vùng:
  - bộ lọc chương trình và thuộc tính câu ở bên trái;
  - bảng câu hỏi dày, dễ quét ở giữa;
  - xem trước nội dung hoặc mã nguồn LaTeX ở bên phải.
- Bỏ thanh tab phụ khỏi màn hình chính để giảm khoảng trống và tránh phân tán thao tác.
- Tách ô tìm kiếm theo mã ID và tìm trong nội dung.
- Bổ sung phân trang 50 câu/trang và thanh trạng thái tổng số câu.
- Hiển thị nhanh mã ID, mức độ, loại câu, đáp án và trạng thái hình ảnh trong bảng.
- Khi chọn nhiều câu, thanh thao tác hàng loạt cho phép bỏ chọn, sao chép mã, xem trước, tạo đề và chuyển vào thùng rác.
- Nút **Tạo đề** dùng dữ liệu câu đã chọn, ghi kỳ thi vào cơ sở dữ liệu và xuất file `.tex`.
- Xem trước LaTeX nhận diện lựa chọn `\choice`, đúng/sai `\choiceTF`, đáp án ngắn `\shortans`, lời giải `\loigiai` và đánh dấu phương án `\True`.
- Quét trùng tự giới hạn chi phí khi tập dữ liệu lớn: dùng so khớp hash chính xác nếu phạm vi vượt 2.000 câu.
- Bổ sung bài kiểm thử E2E cho giao diện, thêm câu LaTeX, xem đáp án và chuyển sang tab mã nguồn.

## Những phần được giữ nguyên

- Không xóa câu hỏi, cây chương trình, YCCD, kỳ thi hoặc dữ liệu đã nhập.
- Không thay đổi UUID và không tái sử dụng mã câu.
- Không tự động sửa nội dung LaTeX nguồn.
- Không thay đổi định dạng SQLite, cơ chế backup/restore hoặc cập nhật từ installer.
- Các màn hình Dashboard, Thời khóa biểu, Công việc, Thống kê, AI Tools và Cài đặt vẫn được giữ nguyên.
- Những chức năng phụ của Ngân hàng câu hỏi chỉ được bỏ khỏi giao diện chính; dữ liệu và mã nền vẫn còn để phát triển sau.

## Phiên bản

- Ứng dụng: `1.5.0`
- Installer Windows dự kiến: `Teacher Workspace_1.5.0_x64-setup.exe`

## Kiểm chứng

- ESLint: đạt.
- Unit/domain tests: 104/104 đạt.
- TypeScript và Vite production build: đạt.
- Playwright nhận đủ 6 luồng E2E, trong đó có luồng mới cho Ngân hàng câu hỏi.
- Chưa chạy trình duyệt Playwright hoàn chỉnh trong môi trường Linux hiện tại vì không có Chromium cài sẵn. Workflow Windows trên GitHub sẽ tiếp tục chạy toàn bộ E2E trước khi tạo installer.

## Cách cập nhật repository

1. Giải nén gói cập nhật vào thư mục repository `TeacherWorkspace`, chọn ghi đè file trùng tên.
2. Không chép thư mục `.git`, `node_modules`, `dist` hoặc `src-tauri/target`.
3. Mở GitHub Desktop, kiểm tra danh sách file thay đổi, nhập Summary và chọn **Commit to main**.
4. Chọn **Push origin**.
5. Đợi workflow **Windows checks and installer** chuyển sang màu xanh rồi tải artifact installer.
6. Trong ứng dụng hiện tại, vào **Cài đặt → Cập nhật từ file đã tải** và chọn installer V1.5.0.
