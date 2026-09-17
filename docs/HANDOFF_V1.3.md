# Bàn giao Teacher Workspace V1.3

## Trạng thái source

Đã tích hợp AI Tools (LaTeX Doctor, Prompt Studio, phản biện Gemini, lịch sử), giữ Smart Schedule, TrigLab và cấu hình updater của bản V1.2. Source chính là thư mục TeacherWorkspace chứa tài liệu này. Không bắt đầu lại từ source V1.0 hoặc V1.1.

Đợt hoàn thiện sau bổ sung xử lý comment sau lệnh xuống dòng LaTeX, bảo vệ verbatim chưa đóng, launcher build nhấp đúp và trì hoãn nạp khóa ký tới bước build. Ba regression test kiểm tra các trường hợp LaTeX này.

## Cài trên máy Windows của anh Hy

1. Xuất backup dữ liệu từ app hiện tại.
2. Giải nén bản source mới vào thư mục riêng; mở thư mục TeacherWorkspace.
3. Nhấp đúp `Build-Signed-Windows.cmd`. Cần Node, Rust MSVC, C++ Build Tools đã cài như lần build trước.
4. Khi hỏi mật khẩu, nhập mật khẩu của **khóa ký updater cũ**, không phải API key Gemini. Ký tự không hiện khi nhập là bình thường. Script không tạo khóa mới.
5. Chỉ khi script báo Build complete, mở `.exe` trong `src-tauri/target/release/bundle/nsis/` để cài.
6. Mở app và kiểm tra lịch cũ, TrigLab, AI Tools. Trong Provider lưu key Gemini, kiểm tra kết nối và chọn model trước khi phản biện.

Khóa ký mặc định nằm ở `%USERPROFILE%\.teacher-workspace\updater.key`. Khi nằm nơi khác, chạy `Build-Signed-Windows.ps1 -PrivateKeyPath` với đường dẫn đúng. Không đưa khóa riêng hoặc mật khẩu vào GitHub/source.

## Đưa lên kênh cập nhật

Sau khi kiểm thử Windows thành công, tạo GitHub Release tag `v1.3.0` trong repository nvghy19112002-cmd/TeacherWorkspace. Đính kèm installer `.exe`, file `.exe.sig` cùng thư mục và `latest.json` ở thư mục project. Publish bản release chính thức, không đánh dấu prerelease. App V1.2 có cấu hình updater tương ứng sẽ kiểm tra được bản mới. Source chưa được tự động đăng hoặc xuất bản trên GitHub.

## Phần còn cần xác minh

- Container không có Cargo/Windows/WebView2: chưa tạo hay thử installer Windows.
- Windows Credential Manager cần kiểm tra lưu/xóa/đọc key sau khi khởi động lại app.
- Gemini đã kiểm thử adapter và giao diện với phản hồi test, chưa gọi bằng tài khoản API thật.
- Cargo.lock cần được tạo và lưu sau lần native build thành công.
- Kiểm thử cập nhật từ bản đang cài sang V1.3 và đối chiếu dữ liệu trước/sau.

## Tiếp tục công việc

Đọc README, docs/AI_TOOLS.md và docs/TEST_REPORT.md trước khi sửa. Ưu tiên giải quyết lỗi native hoặc API thực tế từ log của người dùng; chưa chuyển sang V1.4 khi V1.3 chưa được kiểm thử Windows. Không đổi app identifier, khóa public updater hoặc schema lịch tùy tiện. Các module OCR, TikZ Workbench, Theme Transformer và tạo đề hàng loạt chưa được triển khai ở V1.3.
