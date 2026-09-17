# Bàn giao Teacher Workspace V1.4.2

## Trọng tâm phát hành

- Khởi tạo sẵn cây chương trình **Toán 10–11, Kết nối tri thức với cuộc sống** khi ngân hàng câu hỏi chưa có cây riêng.
- Cây bao gồm: **Lớp → Mạch kiến thức → Chương → Bài**; các nút Dạng và Yêu cầu cần đạt vẫn chờ giáo viên duyệt để không tự áp đặt cách phân loại.
- Mã nội bộ dùng ổn định theo quy ước hiện có: Lớp 10 là `0`, Lớp 11 là `1`; mạch Đại số/Giải tích là `D`, Hình học là `H`, Thống kê và xác suất là `T`.
- Bộ lọc kho câu hỏi được làm theo luồng phụ thuộc: Lớp → Mạch kiến thức → Chương → Bài → Dạng. Chỉ hiển thị lựa chọn hợp lệ ở cấp kế tiếp.
- Khi không chọn câu hỏi, trang chỉ còn Bộ lọc và Danh sách câu để sử dụng toàn bộ chiều ngang. Khung xem chi tiết chỉ mở khi giáo viên chọn một câu.
- Trạng thái rỗng được phân biệt rõ: kho chưa có câu và không có kết quả do bộ lọc là hai tình huống khác nhau.

## An toàn dữ liệu

- Không ghi đè cây chương trình đã có dữ liệu: bộ khởi tạo chỉ chạy khi cây hiện tại hoàn toàn trống.
- Không tự tạo Dạng hoặc YCCD; đây là dữ liệu chuyên môn cần giáo viên duyệt trước khi sinh mã câu hoàn chỉnh.
- Cây khởi tạo được lưu vào SQLite ngay lần mở đầu tiên, không phải dữ liệu tạm trong giao diện.

## Kiểm chứng tại môi trường phát triển

- ESLint: đạt.
- Vitest: 104/104 đạt.
- TypeScript strict và Vite production build: đạt.
- Native Rust chưa chạy được trong môi trường hiện tại vì không cài `cargo`; GitHub Actions Windows tiếp tục là bước kiểm chứng native trước khi phát hành installer.
