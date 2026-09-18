# Cập nhật mã nguồn lên V1.7.0

1. Đóng Teacher Workspace và GitHub Desktop.
2. Giải nén gói cập nhật.
3. Chép toàn bộ nội dung thư mục `TeacherWorkspace-V1.7.0-update` vào repository `TeacherWorkspace`, chọn thay thế file trùng tên.
4. Mở GitHub Desktop, nhập Summary `Add automatic TeX Live preview V1.7.0`.
5. Bấm **Commit to main** rồi **Push origin**.
6. Chờ workflow **Windows checks and installer** có dấu xanh.
7. Tải artifact `TeacherWorkspace-Windows-x64-CI-unsigned`, giải nén và chạy `Teacher Workspace_1.7.0_x64-setup.exe`.

Sau khi cài, mở **Cài đặt → TeX Live và xem trước câu hỏi** rồi bấm **Lưu và kiểm tra TeX Live**. Chỉ cần chọn `main.tex` nếu tài liệu có macro, font, ảnh hoặc file setting riêng chưa nằm trong bộ tích hợp.
