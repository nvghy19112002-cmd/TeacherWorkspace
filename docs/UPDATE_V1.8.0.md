# Teacher Workspace V1.8.0 — cập nhật Ngân hàng câu hỏi

## Đã cập nhật

- Tích hợp cây `ID6-thcs-thpt-TOAN-VA-LATEX.json` do người dùng cung cấp để kiểm tra mã trong đầu câu LaTeX. Báo mã không có trong cây, mức độ sai, nhiều ID và trường hợp cây THCS chưa có dạng. Chỉ gắn mã phân loại khi ID khớp đủ đường dẫn; giữ nguyên LaTeX nguồn và tách biệt cây KNTT đang chỉnh sửa.
- Mở **Xem trước bằng TeX Live** sẽ biên dịch ngay theo cấu hình đã lưu. Chọn nhiều câu và bấm **Biên dịch đã chọn** để tạo một PDF theo thứ tự tích chọn; trong hộp thoại có thể đổi vị trí rồi biên dịch lại. Báo câu gây lỗi dựa vào dòng trong `question.tex`.
- Rút gọn hộp thoại thêm/sửa câu: đáp án, lời giải, cây phân loại và thông tin bổ sung có thể mở riêng. Trong bảng, câu chưa có mã/mục cây sẽ hiện **Chưa xác định** về mức độ.
- Giảm công việc khi lưu: chỉ mã hóa hàng thay đổi thành lệnh SQLite. Ô tìm kiếm dùng giá trị trì hoãn, chỉ chuẩn hóa từ khóa một lần mỗi lượt lọc.
- Đồng bộ phiên bản `1.8.0` trong npm, khóa phụ thuộc, Cargo và Tauri. Bộ nguồn là bản đầy đủ sau khi áp dụng lần lượt các bản 1.4.1 → 1.7.0.

## Đưa lên GitHub và đóng gói Windows

1. Sao lưu thư mục repository hiện có và đóng ứng dụng.
2. Giải nén `TeacherWorkspace-V1.8.0-source.zip`. Chép **nội dung** thư mục `TeacherWorkspace-V1.8.0-source` vào thư mục gốc repository trên máy, thay thế tệp trùng tên. Không đưa `node_modules`, `dist`, dữ liệu SQLite hoặc khóa ký lên GitHub.
3. Trong GitHub Desktop, kiểm tra danh sách thay đổi, commit `Update question bank to V1.8.0`, rồi **Push origin**.
4. Chờ workflow **Windows checks and installer** chạy xanh. Tải artifact `TeacherWorkspace-Windows-x64-CI-unsigned` và dùng installer bên trong để cập nhật ứng dụng.

## Kiểm tra và giới hạn

- Đã chạy `npm run check`: lint, 132 bài kiểm tra và build sản xuất đều qua; ba bài TeX thực tế gồm biên dịch TikZ nhiều câu. Chưa chạy được E2E trên máy làm việc vì không tải được Chromium; workflow Windows sẽ chạy E2E trước khi tạo installer. Chưa biên dịch Rust/installer Windows trên Linux này.
- Ngân hàng vẫn nạp toàn bộ câu hỏi vào bộ nhớ khi mở. Tối ưu lưu và tìm trong bản này giúp thao tác nhẹ hơn, nhưng chuyển sang truy vấn SQLite theo trang cần một bản nâng cấp dữ liệu và giao diện riêng, kèm kiểm thử kho lớn.
- ID6 hợp lệ chưa tự ánh xạ vào cây KNTT vì hai cây có mã chương khác nhau. Độ khó bên trong mô hình cũ vẫn có mặc định N cho câu chưa gắn ID; giao diện hiển thị **Chưa xác định**, tránh hiểu nhầm là đã phân loại.
- TeX Live giới hạn 500 KB mã nguồn cho một lượt xem trước, PDF 16 MB và 120 giây chạy. Các câu dài quá hoặc nhiều hình có thể chia làm nhiều lượt.
