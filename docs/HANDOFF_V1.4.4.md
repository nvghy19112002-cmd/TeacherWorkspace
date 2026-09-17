# Bàn giao Teacher Workspace V1.4.4

## Sửa toàn bộ hồi quy E2E của AI Tools

- Đồng bộ selector kiểm thử với nhãn thật `Model dùng chung` ở cả bước lưu model và bước kiểm tra sau khi tải lại trang.
- Xác nhận nút `Xóa key` có thể sử dụng khi không có tác vụ AI đang chạy; test cũ yêu cầu trạng thái bị khóa trái với hành vi giao diện.
- Giữ kiểm tra kép sau khi thử API key: thông báo `Kết nối thành công` và trạng thái key `Hoạt động` đều phải xuất hiện.
- Giới hạn mỗi thao tác Playwright ở 10 giây để lỗi selector được báo đúng vị trí, thay vì treo trọn 60 giây và che khuất nguyên nhân.
- Giữ nguyên cây Toán 10–11 KNTT và giao diện Kho câu hỏi đã hoàn thiện ở V1.4.2.

## Kiểm chứng

- ESLint, 104 kiểm thử domain, TypeScript strict và production build chạy tại môi trường phát triển.
- Chromium E2E và Rust/SQLite native tiếp tục chạy trong GitHub Actions Windows trước khi tạo installer.
