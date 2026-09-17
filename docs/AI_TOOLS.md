# AI Tools V1.3

## Phạm vi đã triển khai

- LaTeX Doctor: nhập/paste `.tex`, kiểm tra offline, định vị dòng, sửa frac sang dfrac có hoàn tác, sao chép và xuất `.tex`.
- Prompt Studio: bốn prompt mặc định chỉ đọc; nhân bản, sửa, lưu, xóa prompt cá nhân. Có biến source, grade, chapter, target, rules.
- Phản biện: chọn prompt, lớp/chương/mục tiêu/quy tắc; xác nhận gửi; Gemini trả báo cáo JSON có kiểm tra schema. P0/P1/P2, dòng nguồn, đề xuất, điều chưa chắc chắn và bản sửa tùy chọn.
- Xem bản gốc/bản sửa cạnh nhau; không áp dụng tự động. Chặn áp dụng báo cáo nếu nguồn đã thay đổi.
- Provider: lưu/xóa key, kiểm tra kết nối qua danh sách model, chọn model theo tài khoản. Không hard-code model thương mại có thể bị ngừng hỗ trợ.
- Sao chép prompt đã điền để dùng thủ công với một công cụ AI khác, không cần key.
- Lịch sử cục bộ: xem, xuất JSON, xóa từng báo cáo hoặc toàn bộ. Prompt/model/lịch sử tồn tại sau khi đóng ứng dụng.

## Sử dụng

1. Mở AI Tools > LaTeX Doctor, mở tệp `.tex` hoặc dán mã.
2. Đọc chẩn đoán offline; các nhận xét chưa chắc chắn không được coi là lỗi biên dịch đã xác minh.
3. Trong Provider, nhập key Gemini của riêng bạn, Lưu key, Kiểm tra kết nối, chọn model và Lưu model.
4. Chuyển Phản biện đề, chọn prompt và bối cảnh. Chỉ sau khi xác nhận gửi, nội dung mới được gửi tới Google; phí theo tài khoản API.
5. Đọc báo cáo và phần chưa thể kết luận; xuất báo cáo hoặc duyệt bản sửa. Tài liệu đang soạn chỉ ở RAM, cần xuất `.tex` trước khi đóng app.

## Thiết kế dữ liệu

V1.1 đã có `settings.moduleState`, được lưu trong bảng SQLite `settings` qua codec/revision guard hiện hữu. V1.3 dùng khóa `aiTools` chứa payload có `version: 1`, model, prompt cá nhân và lịch sử. Không thêm migration SQL giả chỉ để đổi số phiên bản: schema quan hệ không thay đổi và lịch/TrigLab không bị chuyển đổi.

Module đọc payload bằng Zod; payload sai hoặc mới hơn bị từ chối, không ghi đè dữ liệu. Giới hạn 30 prompt, 20 báo cáo; lịch sử được cắt từ cũ nhất khi vượt 180.000 ký tự, mọi ghi bị chặn ở 190.000 ký tự. Báo cáo đơn quá lớn vẫn hiện ở màn hình nhưng báo không lưu được để giáo viên xuất trước. Không lưu toàn bộ tài liệu đầu vào. Nguồn/sửa gần nhất/báo cáo hiện tại được giữ trong Zustand RAM khi đổi màn hình, không phải LocalStorage.

Backup JSON hiện có tự mang theo moduleState. Backup cũ không có aiTools vẫn được đọc; nhập backup không tác động kho API key. Báo cáo có thể chứa nội dung toán học hoặc thông tin giáo viên nhập: hãy bảo quản backup như tài liệu cá nhân.

Khi lịch sử/ngân hàng câu hỏi trở nên lớn, chuyển sang bảng module riêng bằng migration mới cùng decoder tương thích. Không sửa migration 001 đã phát hành.

## API key và quyền riêng tư

Windows dùng `keyring 3.6.3` với backend `windows-native`, service `com.teacherworkspace.desktop.ai`, account `gemini`. Key không được ghi vào SQLite, backup tự động trước update, backup JSON, log hoặc source. Rust chỉ trả thông báo lỗi tĩnh. Key có mặt tạm thời trong bộ nhớ frontend để gửi header `x-goog-api-key`; không đưa key lên URL. Nếu ứng dụng hoặc tài khoản Windows bị xâm nhập, kho khóa không bảo vệ khỏi mọi truy cập trong cùng người dùng.

Browser preview chỉ giữ key trong RAM; reload làm mất key. Native ngoài Windows không lưu key và báo không hỗ trợ, không fallback sang lưu plaintext. Import backup không đổi key. Nội dung phản hồi chứa đúng chuỗi key được che trước khi parse/lưu.

CSP chỉ mở thêm `https://generativelanguage.googleapis.com`; endpoint không cho người dùng tùy ý thay bằng máy chủ khác. Không gửi tài liệu lúc khởi động, kiểm tra offline, nhập file hay đổi tab. Kiểm tra kết nối chỉ lấy danh sách model, không gửi tài liệu. Mỗi lượt phản biện có dialog thông báo nội dung, model và phí. Có hủy và timeout 120 giây; rời màn hình phản biện hủy lượt đang chạy. Không tự retry yêu cầu tính phí.

## Giới hạn có chủ ý

- Rule checker là kiểm tra tĩnh có giới hạn, không phải TeX compiler/CAS. Macro tùy biến có thể gây cảnh báo giả. Comments/verbatim được bỏ qua trong các phép sửa.
- Không tự bọc `$...$`, đổi số thập phân, thêm choice vào câu tự luận hay tự sửa đáp án: các thao tác này có thể đổi ý nghĩa đề. Frac/dfrac là quy ước trình bày, không phải lỗi toán học.
- Không thể xác định includegraphics thiếu file chỉ từ đoạn mã dán; chỉ nhắc đối chiếu hình. Không thực thi lệnh TeX hoặc shell từ tài liệu/AI.
- Chưa có biên dịch PDF, kiểm chứng symbolic, nhập ZIP/PDF/OCR, TikZ Workbench, OpenAI adapter, tạo đề hàng loạt. Không có nút giả cho các tính năng này.
- Giới hạn nguồn 60.000 ký tự; chia đề dài thành nhóm. AI có thể sai; không coi báo cáo trống là chứng nhận đáp án đúng.
- Phiên bản này không tuyên bố chất lượng toán học tốt hơn MathHub; cần benchmark bằng bộ đề thật và kiểm chứng bởi giáo viên.

## Extension points

`domain/` sở hữu schema, prompt rendering và kiểm tra LaTeX; không phụ thuộc UI. `services/aiProvider.ts` định nghĩa AiProvider; adapter mới phải trả Report, không trả HTML tùy ý. UI chỉ render text, không dùng dangerouslySetInnerHTML cho đầu ra AI. `services/state.ts` dùng transaction/revision guard hiện hữu. `credentials.ts` là cổng duy nhất tới kho khóa; không thêm key vào AiState.

Muốn mở rộng provider: thêm adapter và credential account riêng, allowlist CSP cụ thể, kiểm tra schema/timeout/cancel/rate-limit/redaction, rồi mới thêm UI chọn provider. Muốn thêm rule: tạo fixture hợp lệ/lỗi và test phép sửa bảo toàn phần nguồn còn lại. Muốn thêm mẫu prompt: thêm BUILTINS có id ổn định, không ghi đè prompt người dùng.

## Tài liệu API

- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini generateContent](https://ai.google.dev/api/generate-content)
- [Keyring Entry 3.6.3](https://docs.rs/keyring/3.6.3/keyring/struct.Entry.html)

AI online chưa được thử với key trả phí thật trong môi trường phát triển; test provider dùng phản hồi giả trong test, không dùng trong code ứng dụng.
