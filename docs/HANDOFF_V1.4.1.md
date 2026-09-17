# Bàn giao Teacher Workspace V1.4.1

## Thay đổi chính

- Giữ toàn bộ chức năng và dữ liệu V1.4.0.
- Thêm **Cài đặt → Cập nhật từ file đã tải** cho bản desktop Windows.
- Chỉ nhận installer đúng mẫu `Teacher Workspace_x.y.z_x64-setup.exe` (chấp nhận hậu tố tải trùng như `(1)`).
- Kiểm tra phiên bản ba phần và từ chối bản bằng hoặc cũ hơn.
- Kiểm tra dung lượng 1 MB–1 GB và PE header `MZ`.
- Tính SHA-256 khi chọn và kiểm tra lại ngay trước khi chạy để phát hiện file bị thay đổi.
- Sao lưu nhất quán toàn bộ SQLite bằng `VACUUM INTO` và `PRAGMA quick_check` trước khi mở installer.
- Mở installer bằng process API trực tiếp, không qua shell, rồi ứng dụng tự thoát.
- Giữ nguyên cập nhật online để kích hoạt sau khi GitHub Release và khóa ký sẵn sàng.
- `Build-Windows.cmd` dùng `tauri.ci.conf.json`, không còn yêu cầu private key cho bản cập nhật thủ công.

## Quy trình nâng cấp

Do V1.4.0 chưa chứa chức năng chọn file, người dùng chạy trực tiếp installer V1.4.1 đúng một lần. Từ V1.4.1, các installer mới hơn được chọn và cài từ trong ứng dụng.

## Kiểm chứng

- ESLint: đạt.
- Vitest: 103/103 đạt.
- TypeScript strict và Vite production build: đạt.
- Rust có thêm unit test cho mẫu tên installer và so sánh phiên bản; cần chạy `cargo test` trên máy Windows có Rust.
- Luồng mở NSIS và tự thoát cần kiểm thử bằng installer V1.4.2 trên Windows trước khi coi là phát hành ổn định.

## Build installer thủ công

Trên Windows, nhấp đúp `Build-Windows.cmd`. Kết quả:

```text
src-tauri\target\release\bundle\nsis\Teacher Workspace_1.4.1_x64-setup.exe
```

Không dùng `Build-Signed-Windows.cmd` nếu chưa cấu hình private key của updater online.
