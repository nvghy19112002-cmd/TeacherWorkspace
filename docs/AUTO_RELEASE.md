# Phát hành cập nhật qua GitHub

## Thiết lập một lần

1. Đưa nội dung thư mục TeacherWorkspace lên gốc repository `nvghy19112002-cmd/TeacherWorkspace`: package.json và .github phải nằm tại gốc, không nằm trong thư mục con hoặc chỉ trong ZIP.
2. Trong repository > Settings > Secrets and variables > Actions, tạo `TAURI_SIGNING_PRIVATE_KEY` chứa nội dung file updater.key cũ trên máy Windows. Tạo `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` chứa mật khẩu khóa nếu có. Không đưa các giá trị này vào file, commit, issue hay chat.
3. Mở Actions > Publish Windows update > Run workflow, chọn main. Workflow kiểm tra source, test Windows, build, ký, tải assets lên draft, xác minh manifest và chữ ký rồi publish stable release.
4. Chỉ khi workflow xanh và release v1.3.0 đã công khai: mở bản app V1.2 đã cài updater > Cài đặt > Kiểm tra cập nhật.

## Các lần sau

Developer tăng phiên bản bằng `npm run release:version -- 1.3.1`, cập nhật source, commit/push rồi đẩy tag `v1.3.1`. Workflow tự chạy. Có thể dùng Run workflow trên main sau khi tăng phiên bản thay cho push tag.

Không thay public key hoặc app identifier. Không ghi đè release đã phát hành. Khi pipeline lỗi, draft không được xuất bản; xem lỗi trong Actions và sửa trước khi chạy lại. Pipeline thành công không chứng minh chất lượng mọi kết quả toán học hoặc mọi driver Windows; vẫn cần thử thực tế trên máy giáo viên.

Workflow thông thường `Windows checks and installer` chỉ tạo installer CI không ký updater. Kênh dành cho nút Cập nhật là `Publish Windows update`.

## Trạng thái lúc bàn giao

Repository công khai đã kiểm tra: còn trống và không có release. Chưa có kết nối GitHub có quyền ghi trong phiên làm việc, chưa thể kiểm tra hoặc thiết lập repository secrets. Các file workflow đã chuẩn bị cục bộ; chưa có lần chạy hay phát hành thành công trên GitHub. Khóa riêng nằm trên máy người dùng và không được lấy từ public key.
