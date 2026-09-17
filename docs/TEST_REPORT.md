# Validation report — Teacher Workspace

## V1.3 validation

Source: V1.2 TrigLab/updater extended with AI Tools. Linux container; no Rust toolchain or Windows runtime available.

- ESLint, TypeScript strict and Vite production build: passed.
- Unit tests: 124 cases, including 30 AI Tools cases and 94 existing cases. The final continuation adds three regression cases for escaped percent, comments after linebreaks and unfinished verbatim.
- Browser integration: 6 passed, including new AI Tools workflow plus existing schedule, backup, export and TrigLab workflows.
- AI UI checked at 1440px (light/dark) and 1024px (no horizontal overflow). Screenshots are generated in test-results by the E2E test.
- AI integration test uses routed test responses, not a real paid Gemini account. It verifies credentials UI, model persistence, explicit-send confirmation, report rendering, local history, custom prompt persistence and session-only browser credentials.
- Provider unit tests cover malformed/truncated output, rate limits, network failures, cancellation, header-only credentials and echoed-key redaction.
- Native Windows Credential Manager and signed updater install: NOT executed here. Must be verified on Windows before publishing.
- `Cargo.lock` still requires generation by Cargo on Windows. Commit it after the first successful native build; the new keyring dependency is pinned to 3.6.3.

Run `Build-Signed-Windows.ps1` on Windows to check source, run native tests and create signed installer/manifest. Then manually verify key save/read/delete after restart, actual Gemini requests, cancel/timeout, data retention through update, and install the signed release on a separate test profile. No GitHub release was published by this work.

The regular Windows CI workflow uses `tauri.ci.conf.json` to skip updater artifact signing on pull requests (no secrets). Its installer is a CI-only artifact, not a signed update release. The separate signed-release workflow and local signed-build script retain the production updater configuration.

## Historical V1 validation

Ngày kiểm tra: 07/09/2026 · Workspace kiểm thử: Linux container · Node 24.19 · npm 11.9 · Vite 7.3.6 · Vitest 3.2.7 · Playwright 1.63.0.

## Kết quả đạt

| Kiểm tra                                  | Kết quả | Chi tiết                                                                           |
| ----------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| TypeScript strict + Vite production build | Đạt     | `npm run build`; 2,025 module frontend được build                                  |
| ESLint                                    | Đạt     | `npm run lint -- --max-warnings 0`                                                 |
| Prettier                                  | Đạt     | `npm run format:check`                                                             |
| Unit/domain tests                         | Đạt     | 2 test files, 59 tests                                                             |
| SQLite WASM migration/transactions        | Đạt     | 8 tests; migration, FK, CHECK, revision guard, rollback, unique exception          |
| Browser integration                       | Đạt     | 4 Playwright tests, tổng thời gian 26.9 giây ở lần chạy cuối                       |
| Calendar UI                               | Đạt     | Thêm nhanh, recurrence, sửa riêng/tương lai/toàn bộ, kéo, resize, status, conflict |
| Persistence                               | Đạt     | Reload giữ lịch và trạng thái hoàn thành trong SQLite WASM adapter                 |
| Export engine                             | Đạt     | 6 kích thước; PNG signature; pHYs 300 dpi; ca 1 phút và nội dung dài               |
| Visual QA                                 | Đạt     | Light Mode, Dark Mode, lịch có conflict, PNG A4 grayscale được render và xem lại   |

Lệnh tổng hợp frontend đã chạy thành công:

```text
npm run check
npm run test:e2e
```

`npm run check` bao gồm lint, Vitest và production build. Browser test chạy với Chromium headless trong QA container. Browser test không phải kiểm thử Tauri native.

## Nội dung kiểm thử quan trọng

- Rule T2/T4/T6, một lần, mỗi N tuần, giới hạn ngày và anchor của lịch hai tuần.
- Exception đổi giờ, đổi ngày, hủy, nghỉ, dạy bù, tombstone xóa một ca.
- Split chuỗi từ pivot, split một thứ, sửa toàn chuỗi, reparent ngoại lệ.
- Ca đổi ngày từ ngoài khoảng đang xem đi vào khoảng; ca dạy bù sau ngày kết thúc rule.
- Overlap theo khoảng nửa mở; chạm biên không bị coi là trùng; layout nested/chained groups.
- Thống kê không tự đánh dấu ca đã dạy khi đã qua giờ; dạy bù đã hoàn thành giữ cả hai nhãn.
- Backup `schemaVersion=1`, graph validation, orphan/duplicate ID/exception.
- SQLite rollback khi một mutation lỗi; không cascade mất exception khi UPSERT parent.
- Ảnh export không phụ thuộc DOM/screenshot; nền trắng cho print/mono; ảnh chi tiết không bỏ nội dung ca hẹp.

## Kiểm tra native Windows còn cần chạy trên Windows

Container hiện tại không có `rustc`, `cargo`, Microsoft C++ Build Tools hoặc WebView2, nên không thể tuyên bố đã tạo `.exe`/NSIS installer trong môi trường này. Source đã có `src-tauri/`, migration Rust, capability, icon và CI Windows.

Trên Windows chạy:

```powershell
npm ci
npm run check
cargo test --manifest-path src-tauri/Cargo.toml
npx playwright install chromium
npm run test:e2e
npm run desktop:build
```

Sau khi build đạt, kiểm tra thêm: mở app sau cài đặt, đóng/mở lại process, native file dialogs, backup/restore, WebView2 thiếu runtime, uninstall/reinstall, DPI scaling và nơi lưu database. Chỉ sau các bước đó mới gọi installer là bản phát hành Windows đã xác minh.

`Cargo.lock` chưa được tạo trong container vì Cargo chưa có mặt. Lần build Windows đầu tiên nên commit `Cargo.lock`, sau đó chuyển CI sang `cargo test --locked` và `npm run desktop:build` với lockfile native đã chốt.

## Visual snapshots

- `docs/screenshots/calendar-light.png`: lịch màu sáng, có ca chồng giờ.
- `docs/screenshots/calendar-dark.png`: cùng dữ liệu ở Dark Mode.
- `docs/screenshots/export-a4-print.png`: A4 grayscale, 2480 × 3508.

Các ảnh dùng dữ liệu test, không phải dữ liệu lớp thực tế.
