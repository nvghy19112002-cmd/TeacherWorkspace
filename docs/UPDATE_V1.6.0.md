# Cập nhật mã nguồn lên V1.6.0

1. Đóng GitHub Desktop và ứng dụng Teacher Workspace nếu đang mở.
2. Giải nén gói cập nhật.
3. Chép toàn bộ nội dung bên trong thư mục `TeacherWorkspace-V1.6.0-update` vào thư mục repository `TeacherWorkspace`, chọn **Replace the files in the destination**.
4. Không chép thư mục `node_modules`, `dist` hoặc `src-tauri/target` từ bản cũ.
5. Mở GitHub Desktop, nhập Summary `Update Teacher Workspace V1.6.0`, bấm **Commit to main**, sau đó **Push origin**.
6. Mở GitHub → **Actions** → workflow **Windows checks and installer**. Chỉ tải artifact khi toàn bộ workflow có dấu xanh.
7. Tải `TeacherWorkspace-Windows-x64-CI-unsigned`, giải nén và chạy `Teacher Workspace_1.6.0_x64-setup.exe`.

Gói này chỉ chứa những tệp cần chép đè và các tệp mới của Ngân hàng câu hỏi. Dữ liệu SQLite đang dùng không nằm trong gói và không bị thay thế.
