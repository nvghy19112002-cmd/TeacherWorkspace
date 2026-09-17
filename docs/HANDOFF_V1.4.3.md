# Bàn giao Teacher Workspace V1.4.3

## Sửa lỗi phát hành

- Sửa luồng kiểm tra Gemini API key trong AI Tools: thông báo thành công nay thống nhất là `Kết nối thành công: …`.
- Tăng độ tin cậy của kiểm thử giao diện: sau khi kiểm tra key, test xác nhận cả thông báo và trạng thái `Hoạt động`, thay vì chỉ phụ thuộc vào một chuỗi chữ tạm thời.
- Giữ nguyên toàn bộ thay đổi V1.4.2: cây Toán 10–11 KNTT và bố cục Kho câu hỏi tối ưu hơn.

## Kiểm chứng

- ESLint, Vitest, TypeScript strict và production build phải đạt trước khi đẩy GitHub.
- GitHub Actions Windows là bước bắt buộc để chạy Chromium E2E, Rust/SQLite native và tạo installer.
