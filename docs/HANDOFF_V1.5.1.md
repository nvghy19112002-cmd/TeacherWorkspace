# Phiên làm việc 18/9/2026 — Teacher Workspace 1.5.1

## Phần đã triển khai

- Tiếp tục giao diện ba vùng của V1.5.0; các công cụ nhập và thùng rác mở bằng hộp thoại.
- Nhập .tex/.txt qua bước kiểm tra: số câu, số ID nguồn, câu cần xem lại, loại câu và đáp án. Chỉ ghi vào cơ sở dữ liệu khi xác nhận.
- Tùy chọn bỏ qua mã LaTeX giống hệt trong kho, thùng rác và cùng đợt nhập. So sánh chuỗi nguồn sau khi bỏ khoảng trắng đầu/cuối; không tự loại câu chỉ vì tương đồng hay hash trùng.
- Đọc ID ở đầu môi trường ex, kể cả comment %[0D1N1-1]. Giữ mã phân loại để hiển thị và tìm kiếm, không cấp lại số thứ tự hay tự đối chiếu chương/bài KNTT. ID đầy đủ trong nguồn được giữ trong nguyên văn và cảnh báo.
- Đọc đáp án trắc nghiệm từ True; đọc bốn ý đúng/sai theo thứ tự; hỗ trợ choiceTF[1t], shortans có tùy chọn, lời giải lồng ngoặc.
- Bỏ qua lệnh trong comment nhưng giữ phần trăm có escape. Từ chối cả đợt nhập nếu file có môi trường ex chưa đóng hoặc lồng nhau, tránh mất câu âm thầm.
- Trình xem trước dùng chung bộ đọc lựa chọn với trình nhập, giữ xuống dòng công thức và hỗ trợ macro heva/hoac. Hiển thị thông báo khi gặp TikZ/ảnh ngoài chưa được biên dịch.
- Hộp thoại thùng rác phân trang 50 câu, khôi phục từng câu, giữ UUID và lịch sử; không có xóa vĩnh viễn.
- Nút Đọc thông tin từ LaTeX trong trình sửa cho phép cập nhật loại câu, đáp án, lời giải của câu cũ sau xác nhận. Chỉ lưu khi bấm Lưu câu hỏi.
- Hiển thị cảnh báo dữ liệu ngay trong chi tiết câu. Báo lỗi mở ngân hàng và có nút thử lại; báo lỗi lưu/xuất thay vì để promise thất bại âm thầm.

## Giới hạn và quyết định

- Chưa tuyên bố tương đương toàn bộ MathHub: thay đổi dựa trên giao diện tham chiếu và mã nguồn Teacher Workspace hiện có.
- Không tự gán ID nguồn sang cây KNTT vì hai kho có thể dùng quy ước chương/bài khác nhau. Cần một bước đối chiếu được giáo viên duyệt trước khi triển khai ánh xạ hàng loạt.
- Câu đã nhập trước đây không tự thay đổi đáp án hoặc phân loại. Dùng trình sửa → Đọc thông tin từ LaTeX → kiểm tra → Lưu.
- Xem trước dùng KaTeX, không phải bộ biên dịch TeX đầy đủ. TikZ, ảnh ngoài và macro tùy chỉnh khác cần được kiểm tra bằng TeX Live khi xuất đề.
- Phân trang hiện áp dụng ở giao diện; kiến trúc vẫn nạp snapshot ngân hàng vào bộ nhớ. Chưa tuyên bố tối ưu được kho hàng trăm nghìn câu.
- Không thay đổi schema cơ sở dữ liệu hoặc xóa dữ liệu người dùng.

## Kiểm chứng

- ESLint, TypeScript và Vite production build đạt.
- 114 unit/domain/render tests đạt, gồm 10 bài mới cho nhập và xem trước.
- Playwright nhận 7 bài kiểm thử; đã bổ sung luồng kiểm tra nhập, bỏ trùng, xóa, khôi phục và tải lại dữ liệu.
- Đã thử chạy hai bài E2E ngân hàng nhưng không khởi động được vì môi trường thiếu Chromium; chưa xác nhận chúng chạy đạt. Không bỏ hoặc tắt kiểm thử CI để tạo installer.
- Môi trường không có Rust/Windows; chưa tạo hoặc kiểm thử installer .exe của phiên bản này.

## Áp dụng gói cập nhật

Gói ZIP là bản cập nhật mã nguồn cộng dồn từ giao diện V1.5.0, dùng cho repository đã có V1.4.5 hoặc V1.5.0. Đây không phải file đưa vào nút cập nhật trong ứng dụng.

1. Giải nén vào thư mục repository chứa package.json, chọn ghi đè đúng file.
2. GitHub Desktop: Commit to main → Push origin.
3. Đợi Windows checks and installer đạt mọi bước. Nếu lỗi, giữ nguyên log để sửa đúng nguyên nhân.
4. Tải artifact installer, giải nén lấy Teacher Workspace_1.5.1_x64-setup.exe.
5. Trong ứng dụng chọn Cài đặt → Cập nhật từ file đã tải và chọn .exe. Không phải build trên máy cá nhân.

## Ưu tiên cho phiên sau

1. Xác nhận giao diện Windows và luồng nhập/khôi phục bằng dữ liệu thật.
2. Xây bước đối chiếu ID nguồn với cây chương trình có xem trước và giáo viên xác nhận; không tự đoán mã chương cũ là mã KNTT.
3. Chuyển tìm kiếm/phân trang xuống SQLite, đo tốc độ với kho thật trước khi tăng quy mô.
4. Tách dữ liệu hình ảnh khỏi gói cài đặt; nghiên cứu xem trước TikZ với cache, có quản lý đường dẫn và lỗi biên dịch.
5. Hoàn thiện tạo đề theo phần/ma trận sau khi dữ liệu phân loại đã đáng tin cậy.

## Góp ý bổ sung 18/9 — AI tạm thời

Giữ bản nháp, chưa phát hành. Bổ sung nút Quét ID bằng AI cho một câu hoặc nhóm đã chọn. Hộp thoại hiển thị model, xác nhận gửi dữ liệu, tiến độ, dừng và đề xuất gần đây. Kết quả lưu riêng trong classificationRuns với accepted=false; chưa có nút áp dụng ID vì cây mục lục chưa xong. Luồng phân loại ưu tiên API key đang được chọn. Hai bài kiểm thử bằng API giả lập xác nhận lựa chọn key và không thay đổi ID nguồn; kiểm thử giao diện xác nhận nút chạy bị khóa khi chưa chọn model. Chưa thử Gemini thật.
