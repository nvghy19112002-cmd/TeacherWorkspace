# Test report · Teacher Workspace V1.4

Ngày kiểm tra: 12/09/2026 (UTC)

| Hạng mục | Kết quả |
|---|---|
| ESLint `src` + `tests` | Đạt |
| TypeScript project build | Đạt |
| Vitest | 5 files, 103 tests đạt |
| Vite production build | Đạt |
| Question Bank unit tests | 8/8 đạt |
| Playwright | Chưa chạy: thiếu Chromium executable |
| Rust/native Windows | Chưa xác minh trong môi trường này |
| Gemini thật | Chưa gửi dữ liệu/API key thật |
| Updater đã ký + NSIS | Chưa phát hành |

Các test Question Bank bao phủ parser `ex_test` và `shortans[...]`, chuẩn hóa `frac/dfrac`, sinh ID không tái dùng số đã xóa, quét trùng, ma trận thiếu câu, shuffle theo seed và snapshot câu/đáp án khi xuất đề.
