# Cập nhật thủ công Teacher Workspace

Tài liệu này dành cho cách cập nhật đơn giản khi chưa dùng hệ thống auto-update qua GitHub Release.

## Khi nào dùng cách này

Dùng cách này khi bản mới được đóng gói thành installer Windows, ví dụ:

- `Teacher Workspace_1.3.0_x64-setup.exe`
- `Teacher Workspace_1.4.1_x64-setup.exe`

Người dùng chỉ cần tải installer mới và chạy cài đặt đè lên bản đang có.

## Cách cập nhật trong ứng dụng từ V1.4.1

1. Tải installer `.exe` của phiên bản mới nhưng chưa mở file.
2. Trong Teacher Workspace, vào **Cài đặt → Cập nhật từ file đã tải**.
3. Chọn file có tên đúng mẫu `Teacher Workspace_x.y.z_x64-setup.exe`.
4. Kiểm tra tên, phiên bản, dung lượng và SHA-256 mà ứng dụng hiển thị.
5. Chọn **Sao lưu và cập nhật**.
6. Ứng dụng sao lưu toàn bộ SQLite, kiểm tra lại file, mở installer và tự đóng.
7. Hoàn tất trình cài đặt rồi mở lại Teacher Workspace.

Ứng dụng từ chối file không phải `.exe`, không có PE header, sai mẫu tên, nhỏ hơn 1 MB, lớn hơn 1 GB, phiên bản bằng/cũ hơn, hoặc bị thay đổi sau bước kiểm tra. Vì installer thủ công hiện chưa có chữ ký phát hành, chỉ dùng file nhận từ nguồn phát hành Teacher Workspace của anh.

V1.4.0 chưa có nút chọn file. Lần nâng từ V1.4.0 lên V1.4.1 vẫn phải chạy installer V1.4.1 trực tiếp một lần. Từ V1.4.1 trở đi có thể cập nhật bên trong ứng dụng.

Dữ liệu lịch dạy, bài toán, cài đặt và workspace nằm trong vùng dữ liệu ứng dụng của Windows, nên việc cài đè ứng dụng không xóa dữ liệu người dùng.

## Backup trước khi cập nhật

Trước khi cập nhật các bản lớn, nên vào ứng dụng và dùng Export backup nếu bản hiện tại có nút backup. File backup giúp phục hồi dữ liệu nếu máy lỗi hoặc ổ đĩa gặp sự cố.

## Cách tạo bản cập nhật thủ công cho developer

Nếu build trên Windows:

```powershell
npm install
npm run check
npm run desktop:build -- --config src-tauri/tauri.ci.conf.json
```

Installer nằm tại:

```text
src-tauri\target\release\bundle\nsis\
```

Gửi file `.exe` trong thư mục đó cho người dùng. Người dùng không cần chạy lệnh build.

## Quan hệ với auto-update

Source V1.3 vẫn giữ cấu hình Tauri updater. Khi GitHub Release và signing secrets được thiết lập đầy đủ, có thể chuyển sang quy trình:

1. developer tăng version;
2. push source lên GitHub;
3. GitHub Actions build installer và `latest.json`;
4. người dùng bấm Cập nhật trong app.

Nếu chưa thiết lập GitHub/secrets, dùng cập nhật thủ công bằng installer là ổn định hơn.

## Nguyên tắc phiên bản

Mỗi bản phát hành nên có version tăng dần:

- `1.3.0`
- `1.3.1`
- `1.4.0`
- `1.4.1`

Không phát hành hai installer khác nhau cùng một version, vì người dùng sẽ khó biết đang dùng bản nào.
