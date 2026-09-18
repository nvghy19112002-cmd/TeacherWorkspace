# Bản nháp ngày 18/9 — xem trước TeX Live

Trạng thái: đang nhận góp ý; không phải bản phát hành và chưa đóng gói cập nhật.

## Luồng đã bổ sung

Chọn câu → Biên dịch TikZ/PDF → chọn engine, bộ khai báo và thư mục project → Biên dịch xem trước.

- Engine hỗ trợ: pdfLaTeX, XeLaTeX, LuaLaTeX. Tự tìm thư mục C:\texlive trên Windows hoặc PATH; có thể chọn file thực thi trực tiếp.
- Bộ khai báo: file main.tex (chỉ phần trước begin document) hoặc file khai báo riêng. Với file khai báo không có documentclass, dùng article 12pt A4.
- Giữ nguyên câu trong question.tex. Nếu nguồn là nội dung thuần thì bọc ex, ghi nhận độ lệch một dòng để chỉ đúng lỗi.
- Từ chối nhiều câu, toàn bộ tài liệu, ex chưa đóng và lệnh ngoài ex chưa được đưa vào khai báo. Không xóa macro không nhận diện.
- preview.tex dùng bộ khai báo, nạp question.tex. Thư mục project và thư mục chứa khai báo được đưa vào đường tìm kiếm TeX; không sửa ảnh/mã nguồn tại đó.
- Thư mục tạm riêng cho mỗi lần chạy, có ans, thu gom sau khi đọc kết quả. Điều chỉnh Opensolutionfile/Closesolutionfile trong bản xem trước để không xuất đáp án ra các đường dẫn của đề gốc. Chế độ lời giải vẫn tuân theo khai báo của giáo viên.
- Chạy nền, không qua shell; tắt shell escape, tối đa 120 giây, có hủy. Biên dịch hai lượt để cập nhật tham chiếu.
- Lỗi hiển thị log, nhận diện question.tex:<dòng> và mở bản mã có đánh dấu dòng tương ứng. Lỗi từ file khai báo giữ đường dẫn và dòng nguyên bản trong log.
- PDF hiển thị trong iframe, có nút lưu PDF. Khả năng nhúng PDF cần xác nhận trên WebView2 Windows cụ thể.
- Lưu cấu hình riêng trên thiết bị; không đưa đường dẫn vào dữ liệu câu hỏi. Chưa dùng cache lâu dài để tránh ảnh hoặc khai báo thay đổi nhưng xem lại kết quả cũ.

## Kiểm chứng

Frontend lint, TypeScript, production build đạt. Tổng 121 bài kiểm thử đạt tại môi trường phát triển, gồm một lượt biên dịch pdfLaTeX thật với TikZ và project-relative input. Bài biên dịch thật có thể bị skip trên CI nếu không có pdflatex; không thay bằng mock.

Môi trường phát triển không có Rust và bộ ex_test của giáo viên. Chưa kiểm thử các lệnh Tauri native trên Windows, chưa xác nhận template cá nhân hoặc hiển thị PDF trong WebView2. Một mẫu tối thiểu có TikZ đạt không đồng nghĩa mọi macro TeX đều tương thích.

## Kiểm tra trên máy giáo viên trước khi phát hành

- Câu trắc nghiệm ex_test, có lời giải và đúng/sai choiceTF[1t].
- TikZ, tkz-tab, ảnh includegraphics có đường dẫn tương đối.
- Khai báo có input setting/caidat.tex và thư mục có dấu/khoảng trắng.
- Hủy quá trình biên dịch, macro chưa định nghĩa, thiếu file ảnh; không hiển thị lại PDF cũ khi chạy lỗi.
- Chế độ học sinh/giáo viên theo bộ khai báo; không tự thay nội dung hoặc đáp án.
