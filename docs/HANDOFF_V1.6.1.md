# Bàn giao Teacher Workspace V1.6.1

Ngày chốt: 18/9/2026.

## Lỗi đã sửa

Workflow V1.6.0 chạy đủ bảy bài kiểm thử giao diện nhưng có ba bài thất bại sau khi đổi giao diện:

1. Hộp thoại AI có hai nút cùng accessible name `Đóng`: nút X trên tiêu đề và nút Đóng ở chân hộp thoại. Selector đã được giới hạn vào `.modal-footer`.
2. Màn hình Ngân hàng câu hỏi có hai nút `Xóa`: nút xóa câu đang xem và nút xóa nhóm câu đã chọn. Selector đã được giới hạn vào thanh `Thao tác với câu đã chọn`.
3. Bài kiểm tra chế độ tối vẫn mong đợi bảng màu xanh cũ. Giá trị đã được cập nhật theo nền graphite và chữ sáng của giao diện V1.6.

Đây là lỗi kiểm thử nghiêm ngặt của Playwright, không phải lỗi dữ liệu. Không có migration và không thay đổi SQLite.

## Kiểm chứng trước khi bàn giao

- ESLint: đạt.
- Vitest: 10 file, 123/123 bài đạt.
- TypeScript và Vite production build: đạt.
- Playwright nhận đủ 7 bài kiểm thử, không còn selector mơ hồ trong các vị trí đã báo lỗi.
- Rust/Tauri và toàn bộ Playwright Chromium được workflow Windows trên GitHub kiểm tra trước khi tạo installer.

Chỉ dùng artifact khi workflow **Windows checks and installer** có dấu xanh.
