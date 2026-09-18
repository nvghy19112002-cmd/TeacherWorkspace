# Bàn giao Teacher Workspace V1.6.0

Ngày chốt: 18/9/2026.

## Nội dung bản cập nhật

### Giao diện ứng dụng

- Làm lại ngôn ngữ thị giác theo phong cách ứng dụng macOS: màu graphite, nền có chiều sâu, thanh bên và thanh trên bán trong suốt, góc bo mềm, bóng đổ nhẹ, nút và segmented control gọn hơn.
- Thêm cụm ba chấm cửa sổ mang tính trang trí; các nút đóng/thu nhỏ thật vẫn do Windows và Tauri quản lý.
- Thu gọn chiều cao thanh điều hướng, khoảng đệm và các thẻ để dành diện tích cho nội dung.
- Giữ hệ thống sáng/tối và cấu trúc điều hướng hiện có để không làm mất dữ liệu hay thay đổi thói quen sử dụng.

### Ngân hàng câu hỏi

- Giữ bố cục làm việc ba vùng: bộ lọc, bảng câu hỏi, xem trước/mã nguồn.
- Giảm phần trống phía trên; vùng chính tự giãn theo chiều cao cửa sổ và có thanh cuộn độc lập.
- Sửa hiện tượng các vùng đè lên nhau bằng container query và bố cục thích ứng. Khi cửa sổ hẹp, các vùng tự chuyển về dạng xếp dọc phù hợp.
- Tinh chỉnh bảng, dòng đang chọn, nhãn mức độ/loại câu, thanh trạng thái và vùng đáp án theo phong cách mới.
- Nút thao tác ở vùng chi tiết được rút gọn thành **Quét ID** và **Biên dịch** để tránh tràn hàng.

### Nhập và quản lý câu hỏi

- Hiện màn hình kiểm tra trước khi ghi dữ liệu: tổng câu đọc được, cảnh báo, câu giống hệt bị bỏ qua và các mục sẽ được thêm.
- Nhận diện ID trong nguồn; ID nguồn chỉ là dữ liệu tham khảo, chưa tự coi là mã đã duyệt theo cây chương trình.
- Đọc đáp án từ `\\True` và nhóm đúng/sai `choiceTF[1t]`.
- Có thể đưa câu vào thùng rác và khôi phục lại.
- Không thay đổi tự động mã LaTeX gốc của người dùng.

### Xem trước LaTeX và TikZ

- **Xem trước nhanh** dùng KaTeX cho nội dung toán thông thường.
- **Biên dịch TeX Live** gọi `pdflatex`, `xelatex` hoặc `lualatex` đã cài trên máy để hỗ trợ TikZ và các gói LaTeX thực tế.
- Cho phép chọn preamble/main file và thư mục dự án, chạy hai lượt biên dịch, tắt shell escape, giới hạn thời gian 120 giây và có nút hủy.
- PDF được hiển thị trong ứng dụng, có thể tải ra; log lỗi và dòng lỗi được giữ để sửa nguồn.
- Ứng dụng không đóng gói TeX Live, vì vậy dung lượng installer không tăng mạnh. Máy sử dụng phải có engine TeX trong `PATH`.

### AI và quét ID

- Có nút quét cho câu hiện tại và các câu đang chọn.
- Hiển thị nhà cung cấp/model đang dùng, yêu cầu xác nhận trước khi gửi nội dung và cho phép hủy giữa chừng.
- Kết quả được lưu vào lịch sử phân loại ở trạng thái **chưa duyệt**.
- Chưa tự ghi ID vào câu hỏi. Cây mục lục/KNTT phải hoàn thiện trước khi cho phép gán mã tự động.

## Kiểm chứng

- `npm run check`: đạt.
- ESLint: đạt, không có warning.
- Vitest: 10 file, 123 bài kiểm thử đạt.
- TypeScript và Vite production build: đạt.
- Kiểm thử biên dịch TikZ bằng TeX Live cục bộ: đạt.
- Playwright nhận đủ 7 luồng E2E. Trình duyệt Chromium không có trong môi trường bàn giao nên việc chạy thực tế và build native Rust/Tauri được giao cho workflow Windows trên GitHub.

## Cách tạo bộ cài

1. Chép đè gói cập nhật vào thư mục repository, giữ nguyên cấu trúc thư mục.
2. Mở GitHub Desktop, kiểm tra danh sách thay đổi, commit và **Push origin**.
3. Mở tab **Actions** của repository và chờ workflow **Windows checks and installer** có dấu xanh.
4. Trong trang workflow, tải artifact `TeacherWorkspace-Windows-x64-CI-unsigned`.
5. Giải nén artifact và dùng `Teacher Workspace_1.6.0_x64-setup.exe`.

Khi workflow đỏ, không dùng installer của lần chạy đó. Tải artifact `integration-test-failures` nếu có để xem ảnh và trace của Playwright.

## Giới hạn đã chủ động giữ

- Ba chấm kiểu macOS chỉ là dấu hiệu thị giác, không thay thế nút cửa sổ Windows.
- KaTeX không thay thế TeX Live cho TikZ, PSTricks hoặc macro phức tạp.
- Biên dịch TeX sử dụng gói đã có trong TeX Live trên máy; gói bị thiếu vẫn phải cài bằng TeX Live Manager.
- AI quét ID chỉ đề xuất cho đến khi cây chương trình được chốt.
