# Bàn giao Teacher Workspace V1.7.0

Ngày chốt: 18/9/2026.

## TeX Live tự động

- Tự tìm `pdflatex`, `xelatex` hoặc `lualatex` trong PATH và các thư mục TeX Live chuẩn trên Windows.
- Cài đặt mới **TeX Live và xem trước câu hỏi** hiển thị trạng thái engine, phiên bản và đường dẫn tìm được.
- Mặc định không yêu cầu `main.tex` hoặc thư mục project.
- Vẫn có hai chế độ tương thích: **Tích hợp + main.tex** và **Chỉ main.tex** cho tài liệu có font, ảnh, `.sty` hoặc macro riêng.

## Bộ khai báo tích hợp

Bộ tích hợp nạp có điều kiện các nhóm đang dùng trong ngân hàng hiện tại:

- `amsmath`, `amssymb`, `mathtools`;
- tiếng Việt cho pdfLaTeX khi TeX Live có T5/vietnamese, và `fontspec` cho XeLaTeX/LuaLaTeX;
- `graphicx`, `xcolor`, `geometry`, `enumitem`, `multicol`, `array`, `tabularx`, `booktabs`;
- TikZ và thư viện hình học phổ biến;
- PGFPlots, tkz-euclide, tkz-tab;
- ex_test nếu `ex_test.sty` có trên máy;
- macro dự phòng cho `ex`, `choice`, `choiceTF`, `True`, `loigiai`, `shortans`, `dapso`, `heva`, `hoac`, `immini`, `imminiL`, `dien`.

Không có một preamble cố định nào bảo đảm mọi mã LaTeX trên thế giới vì các gói có thể xung đột và macro riêng có số tham số khác nhau. V1.7.0 giải quyết phần mở rộng bằng trình chẩn đoán thay vì tự đoán và sửa nguồn.

## Cảnh báo và bổ sung khai báo

- Khi nhập `.tex`, app quét lệnh/môi trường tùy biến có độ tin cậy cao.
- Nếu phát hiện thành phần chưa biết, hộp thoại **Bổ sung khai báo LaTeX** xuất hiện trước bước xác nhận nhập.
- Người dùng có thể dán `usepackage`, `newcommand` hoặc `newenvironment`, lưu dùng chung cho những lần sau, hoặc bỏ qua và giữ cảnh báo trong câu hỏi.
- Khi TeX Live biên dịch lỗi, app đọc log để nhận diện gói `.sty` thiếu, `Undefined control sequence` và môi trường chưa định nghĩa; sau đó mở vùng bổ sung khai báo và cho phép biên dịch lại.
- Gói chưa cài phải được cài bằng TeX Live Manager; thêm `usepackage` không thể thay thế một file `.sty` không tồn tại.
- Khai báo bổ sung không được chứa `documentclass` hay `begin/end document` và bị giới hạn 200 KB.

## An toàn

- Câu hỏi gốc không bị chỉnh sửa.
- Biên dịch trong thư mục tạm, tắt shell escape, giới hạn 120 giây và PDF tối đa 16 MB.
- Cấu hình TeX nằm ngoài SQLite ngân hàng; backup ngân hàng không mang theo đường dẫn máy cá nhân.

## Kiểm chứng

- ESLint, TypeScript và Vite production build: đạt.
- Vitest: 10 file, 127/127 bài đạt.
- Hai bài kiểm thử dùng TeX Live thật đạt, gồm TikZ theo project và bộ tích hợp không có `main.tex`.
- Playwright nhận 8 luồng E2E, gồm cảnh báo macro riêng khi nhập.
- Rust/Tauri và Chromium đầy đủ tiếp tục được workflow Windows trên GitHub kiểm tra trước khi tạo installer.
