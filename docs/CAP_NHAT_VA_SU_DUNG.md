# Teacher Workspace 1.1.0 — TrigLab và hệ thống cập nhật

## Anh Hy cần biết trước

Đây là mã nguồn nâng cấp từ project 1.0.0 anh cung cấp. Không phải bộ cài Windows đã được kiểm chứng. Bản 1.0.0 đang cài chưa có updater nên cần cài đè bản có updater **một lần**. Sau đó mới cập nhật trong ứng dụng được.

Không gỡ ứng dụng cũ, không xóa dữ liệu. Giữ `identifier = com.teacherworkspace.desktop`, chế độ NSIS currentUser và đường dẫn dữ liệu hiện có.

Kênh phát hành chưa được cấu hình vì chưa có kho phát hành của anh. Giao diện báo rõ việc này, không giả báo “đang dùng bản mới nhất”. Không có khóa riêng hoặc tài khoản bí mật được nhúng trong project.

## Dùng thử TrigLab

1. Giải nén project vào một thư mục mới.
2. Nếu đã có Node.js 22.12 trở lên, mở `Preview-TrigLab.cmd`.
3. Mở địa chỉ hiện trong cửa sổ: http://127.0.0.1:1420.
4. Chọn TrigLab 10–11 ở menu trái, chọn khối 10 hoặc khối 11.

Bản trình duyệt dùng SQLite trong IndexedDB, tách biệt với dữ liệu của app Windows. Nút cập nhật bị vô hiệu hóa trong bản trình duyệt. Chạy bản desktop bằng `Run-Desktop.cmd` khi máy có bộ công cụ Rust/C++ theo README cũ.

## Hoạt động đã triển khai

Khối 10: góc 0–180°, dấu sin/cos/tan/cot, hai góc bù, góc đặc biệt, tam giác kéo thả, định lí côsin, định lí sin (xử lý 0/1/2 nghiệm SSA), kiểm tra nhanh.

Khối 11: góc lượng giác có hướng và nhiều vòng, độ–rađian và độ–phút–giây, độ dài cung/hành trình, Chasles, đường tròn lượng giác, bảng dấu, góc liên quan đặc biệt, thám tử lượng giác, kiểm tra nhanh.

Chung: trình chiếu, che/mở kết quả, bút viết, hoàn tác/làm lại nét, spotlight, đếm giờ, xuất PNG, yêu thích và lưu phiên vào SQLite. Ngân hàng khởi đầu có 16 câu được soạn riêng (8 câu mỗi khối), không tự nhận là toàn bộ câu hỏi trong PDF.

Lưu phiên ghi nhớ khối, hoạt động, hai góc theo khối, yêu thích và lịch sử hoạt động. Tham số phụ của từng thí nghiệm, nét viết và kết quả lượt kiểm tra chưa được ghi vào phiên lưu; xuất PNG trước khi rời nếu cần lưu hình giảng. Khi chuyển hoạt động, thông báo trước nếu có nét viết.

Kết quả góc đặc biệt được hiển thị chính xác. Thám tử có dạng chính xác với dữ kiện phân số nguyên tử/mẫu tối đa 3 chữ số; trường hợp khác được ghi rõ gần đúng. Trình nhập biểu thức chỉ nhận số/phân số/bội pi theo định dạng hướng dẫn, không chạy mã JavaScript.

Chưa bao gồm: trình giải/rút gọn biểu thức tùy ý, các mô phỏng thực tế đầy đủ, xuất PDF ngân hàng, câu đúng–sai bốn ý, quản lý học sinh, điện thoại tham gia, trình biên soạn giáo án. Đây là các mục cần triển khai tiếp từ master prompt, không phải tính năng đã hoàn tất.

## Thiết lập cập nhật một lần

Cần chọn một địa chỉ HTTPS ổn định để ứng dụng lấy thông tin bản mới. Phương án có sẵn là GitHub Releases; với cách không đăng nhập trong app này, tài sản phát hành phải tải công khai được. Không nhúng token GitHub vào ứng dụng. Nếu cần kho phát hành riêng tư, cần dịch vụ tải có xác thực riêng.

### Cách có hướng dẫn trên Windows

1. Chuẩn bị kho GitHub dành cho phát hành (hoặc gửi link kho cho người hỗ trợ tích hợp).
2. Chạy `Setup-Updates-Windows.cmd`, nhập link kho dạng `https://github.com/ten/kho`.
3. Công cụ tạo cặp khóa ký trên **máy anh**, bên ngoài project, tại `%LOCALAPPDATA%/TeacherWorkspacePublisher/updater.key` và `.pub`. Nếu công cụ hỏi mật khẩu khóa, lưu mật khẩu ở nơi riêng.
4. Chỉ khóa công khai và địa chỉ lấy `latest.json` được đưa vào cấu hình ứng dụng.
5. Giữ bản sao khóa riêng lâu dài. Các lần phát hành sau phải dùng đúng khóa đã cấu hình trong bản đầu. Không gửi khóa riêng cho AI, không đưa vào ZIP chia sẻ hoặc GitHub.

### Cấu hình thủ công cho người phát triển

```powershell
npm run release:configure -- "https://github.com/OWNER/REPO/releases/latest/download/latest.json" "C:/path/to/updater.key.pub"
```

Script kiểm tra HTTPS/định dạng khóa, chặn tự thay khóa đang sử dụng và bật tạo bộ cài có chữ ký. Không có tùy chọn tắt kiểm tra chữ ký.

## Phát hành lần đầu và các lần sau

Có hai cách. Chỉ cần dùng một cách phù hợp.

### A. Build trên Windows

- Cài Node.js, Rust, Visual Studio Build Tools theo README.
- Tăng số phiên bản bằng `npm run release:version -- 1.1.1` cho lần sau. Không phát hành hai bộ cài khác nhau với cùng phiên bản.
- Nếu khóa được đặt mật khẩu, đặt `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` trong phiên PowerShell hiện tại; không lưu vào mã nguồn.
- Chạy script:

```powershell
./Build-Update-Windows.ps1 -PrivateKeyPath "C:/path/to/updater.key" -DownloadUrl "https://github.com/OWNER/REPO/releases/download/v1.1.1/Teacher.Workspace_1.1.1_x64-setup.exe"
```

URL trên là ví dụ: thay bằng URL **đúng của tên bộ cài được phát hành**. Script không tự upload. Nó chạy kiểm thử frontend, build Windows x64 có ký và tạo `latest.json`. Cần thêm kiểm thử native và E2E trước khi phát hành: `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run test:e2e`.

Đăng `.exe` và `.exe.sig` lên nơi phát hành, rồi đăng `latest.json`. Các URL trong manifest phải tải được mà không đăng nhập. Chạy thử bộ cài và chu trình nâng cấp trên một máy Windows trước khi cho bản đó thành bản chính thức.

### B. Build bằng GitHub Actions

Workflow `.github/workflows/windows-release.yml` được chuẩn bị trong project. Chưa được chạy hoặc đăng lên tài khoản nào trong phiên làm việc này.

1. Đưa nội dung project ở thư mục gốc của kho GitHub, gồm cấu hình updater đã tạo.
2. Lưu nội dung khóa riêng vào GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY`; mật khẩu (nếu có) vào `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Đây là thao tác của chủ kho, không phải đưa khóa vào file nguồn.
3. Vào Actions → “Build signed Windows release draft” → Run workflow.
4. Workflow chạy kiểm thử, build trên Windows rồi tạo **bản nháp release** gồm bộ cài, chữ ký và manifest do Tauri Action tạo.
5. Tải bộ cài nháp để thử cài đè, kiểm tra dữ liệu. Chỉ sau đó mới Publish release. Phiên bản ứng dụng phải lớn hơn bản đã cài để updater đề nghị nâng cấp.

## Người sử dụng cập nhật thế nào?

Sau khi đã cài bản đầu có kênh phát hành:

1. Mở **Cài đặt → Cập nhật Teacher Workspace**.
2. Bấm **Kiểm tra cập nhật**.
3. Xem phiên bản và nội dung thay đổi.
4. Bấm **Tải và cập nhật**, xác nhận cài.
5. Ứng dụng tải, kiểm tra chữ ký, tạo bản sao SQLite rồi chạy trình cài. Nếu ứng dụng vẫn mở sau cài, bấm Khởi động lại.

Không cần tải source, chép từng file hoặc chạy lại npm cho các lần cập nhật đã phát hành.

Lịch dạy vẫn dùng offline; chỉ bước tìm/tải bản mới cần Internet. Không có tác vụ tự cài ngầm và không gửi dữ liệu lớp học lên máy chủ cập nhật.

## Bảo toàn dữ liệu

- Giữ nguyên schema lịch dạy, định danh ứng dụng và nơi lưu SQLite.
- Trạng thái nhỏ của module được đặt trong `settings.moduleState`, mã hóa/kiểm tra riêng, cùng được chứa trong backup JSON của ứng dụng.
- Trước cài update, `VACUUM INTO` tạo bản sao nhất quán, bao gồm dữ liệu đã commit ở WAL; không sao chép mỗi file `.sqlite3` khi còn bỏ sót WAL.
- Bản sao được kiểm tra `PRAGMA quick_check`. Nếu sao lưu thất bại, không cài bản mới.
- Bản sao nằm dưới thư mục dữ liệu ứng dụng, trong `backups/before-update-...sqlite3`. Giao diện hiển thị đường dẫn nếu ứng dụng chưa đóng.
- Đã thêm điểm sao lưu trước các migration SQLite tương lai; hiện bản nâng cấp này không thay schema bảng lịch dạy.
- Bản `.sqlite3` là bản phục hồi kỹ thuật, không phải file JSON để nhập bằng nút Nhập backup. Khi cần phục hồi, đóng toàn bộ app, giữ một bản sao thư mục dữ liệu hiện tại rồi nhờ người hỗ trợ phục hồi đúng bộ DB/WAL. Không thay DB trong lúc app đang mở.
- Khuyến nghị xuất thêm backup JSON trong Cài đặt trước lần cài đè đầu tiên.

## Chưa thể xác nhận tại môi trường bàn giao

Không có Rust/Windows build toolchain ở môi trường tạo mã nguồn này. Chưa có bộ cài `.exe` mới được build và chưa thử nâng cấp hai bản Windows có chữ ký thực tế. Do đó, cần chạy các bước Windows ở trên trước khi tuyên bố cập nhật một chạm đã sẵn sàng sử dụng.

Tài liệu kỹ thuật tham khảo: [Tauri updater](https://v2.tauri.app/plugin/updater/) và [Tauri Action](https://github.com/tauri-apps/tauri-action).
