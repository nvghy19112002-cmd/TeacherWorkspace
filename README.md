# Teacher Workspace

## Cập nhật thủ công trong ứng dụng

Từ V1.4.1, khi chưa bật GitHub auto-update, người dùng tải installer Windows mới rồi vào **Cài đặt → Cập nhật từ file đã tải**. Ứng dụng kiểm tra file, từ chối phiên bản bằng/cũ hơn, sao lưu SQLite, mở installer và tự đóng. Xem chi tiết tại `docs/MANUAL_UPDATE.md`.

## V1.4.5 · Sửa cấu hình Playwright

V1.4.5 chuyển `actionTimeout` vào đúng khối cấu hình, loại bỏ lỗi TypeScript khiến workflow V1.4.4 dừng trước khi chạy E2E. Xem [bàn giao V1.4.5](docs/HANDOFF_V1.4.5.md).

## V1.4.4 · Ổn định toàn bộ AI Tools E2E

V1.4.4 đồng bộ toàn bộ selector của luồng AI Tools với giao diện hiện tại và sửa kỳ vọng sai về trạng thái nút xóa key. Xem [bàn giao V1.4.4](docs/HANDOFF_V1.4.4.md).

## V1.4.3 · Sửa pipeline phát hành

V1.4.3 sửa hồi quy AI Tools khiến workflow Windows bị dừng trước khi tạo installer. Xem [bàn giao V1.4.3](docs/HANDOFF_V1.4.3.md).

## V1.4.2 · Cây KNTT và giao diện Ngân hàng câu hỏi

V1.4.2 khởi tạo sẵn cây **Toán 10–11 KNTT** đến cấp Bài trên ngân hàng mới, đồng thời nén lại bố cục Kho câu hỏi để ưu tiên danh sách câu. Xem [bàn giao V1.4.2](docs/HANDOFF_V1.4.2.md).

## Nền tảng V1.4.1 · Manual Update, Question Bank và AI Tools

**Kênh cập nhật tự động:** workflow `Publish Windows update` build/ký/xác minh/publish khi đẩy tag phiên bản hoặc chạy Run workflow. Thiết lập một lần tại [AUTO_RELEASE.md](docs/AUTO_RELEASE.md). Workflow mới đã chuẩn bị trong source; chưa được đưa lên repository hoặc chạy khi chưa có quyền GitHub và secrets ký.

**Cách build dễ nhất cho cập nhật thủ công:** nhấp đúp `Build-Windows.cmd`; script dùng cấu hình không tạo updater artifacts nên không cần private key. Chỉ dùng `Build-Signed-Windows.cmd` khi phát hành kênh online có chữ ký. Trạng thái nằm trong [bàn giao V1.4.1](docs/HANDOFF_V1.4.1.md).

Bản này giữ Smart Schedule, updater và AI Tools; gỡ TrigLab; bổ sung **Ngân hàng câu hỏi, cây chương trình/YCCD, nhập ex_test, quét trùng, AI phân loại có duyệt và tạo đề theo ma trận**.

LaTeX Doctor/prompt/lịch sử dùng offline. Phản biện online cần API key Gemini riêng, được lưu bằng Windows Credential Manager, không nằm trong backup. Chưa thử API trả phí thật hoặc build native Windows trong container này.

Build có ký updater trên Windows, trong thư mục project:

```powershell
powershell -ExecutionPolicy Bypass -File .\Build-Signed-Windows.ps1
```

Script đọc key updater cũ ở `%USERPROFILE%\.teacher-workspace\updater.key`, hỏi mật khẩu ở chế độ ẩn, kiểm tra source, build và tạo `latest.json`. Không gửi key/mật khẩu lên GitHub. Nếu key nằm nơi khác, truyền `-PrivateKeyPath "C:\duong-dan\updater.key"`.

Sau khi build ký và thử cài đạt: tạo GitHub Release tag `v1.4.1`, đính kèm `.exe`, `.exe.sig` trong `src-tauri/target/release/bundle/nsis/` và `latest.json` được script tạo.

Ứng dụng desktop Windows, chạy offline, dành cho giáo viên quản lý lịch dạy và công việc cá nhân. V1 tập trung vào **Smart Schedule**; dữ liệu không bị gắn chặt vào từng ô lịch hay một thư viện calendar.

**Bộ source chính là toàn bộ thư mục `TeacherWorkspace/`.** ZIP là bản chuyển tải dự phòng. Ứng dụng khởi đầu với một thời khóa biểu trống; không có lịch mẫu tự chèn vào dữ liệu thật.

> Trạng thái kiểm chứng và giới hạn môi trường build được ghi riêng trong `docs/TEST_REPORT.md`. Bản source này không kèm `.exe` đã được kiểm thử trên Windows. Không coi build frontend là build desktop thành công.

## Chạy trên Windows — dành cho anh Hy

### Chuẩn bị một lần

1. Cài **Node.js 22.12 trở lên**, nên dùng bản LTS.
2. Cài **Rust stable**, toolchain `stable-x86_64-pc-windows-msvc`, từ <https://rustup.rs/>.
3. Cài **Visual Studio Build Tools**, chọn workload **Desktop development with C++**, kèm Windows SDK.
4. Máy cần **Microsoft Edge WebView2 Runtime**. Installer có thể cài bổ sung nếu máy thiếu runtime.
5. Mở lại Terminal sau khi cài để nhận PATH mới.

Hướng dẫn chính thức: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

### Dùng bản development

Trong thư mục project, mở Terminal:

```powershell
npm ci
npm run desktop:dev
```

Hoặc nhấp đúp **`Run-Desktop.cmd`** sau khi đã cài các thành phần ở trên. Lần đầu cần mạng để tải thư viện; ứng dụng đã build không cần máy chủ hoặc API.

### Build ứng dụng và installer

Cách nhanh: nhấp đúp **`Build-Windows.cmd`**. File này cài dependency, chạy kiểm tra frontend, kiểm thử Rust rồi build installer. Nếu bước nào lỗi, tiến trình dừng và hiển thị lỗi.

Các lệnh tương đương:

```powershell
npm ci
npm run check
cargo test --manifest-path src-tauri/Cargo.toml
npm run desktop:build -- --config src-tauri/tauri.ci.conf.json
```

Kết quả sau **khi build thành công trên Windows x64**:

- Executable: `src-tauri\target\release\teacher-workspace.exe`
- Installer NSIS: `src-tauri\target\release\bundle\nsis\Teacher Workspace_1.4.5_x64-setup.exe`

Installer thông thường nhúng WebView2 bootstrapper; nếu máy chưa có WebView2, bước cài runtime cần mạng. Để tạo installer chứa cả runtime và cài trên máy hoàn toàn offline:

```powershell
npx tauri build --bundles nsis --config src-tauri/tauri.offline.conf.json
```

Bản offline lớn hơn đáng kể. Build cần tải runtime trước. Chương trình không cấu hình tự cập nhật, không gọi API và không gửi telemetry. Installer chưa ký số; quy trình phát hành thương mại cần chứng chỉ ký số riêng.

[Tài liệu Windows installer của Tauri](https://v2.tauri.app/distribute/windows-installer/).

### Kiểm tra nhanh frontend trên máy chưa có Rust

```powershell
npm ci
npm run dev
```

Mở `http://127.0.0.1:1420`. Đây là chế độ phát triển: **SQLite WASM thật** được lưu dưới dạng byte database trong IndexedDB. Không dùng LocalStorage. Dữ liệu trình duyệt tách biệt với dữ liệu desktop; dùng backup JSON để chuyển. Không dùng chế độ này thay cho installer desktop lâu dài. Xóa dữ liệu trình duyệt có thể xóa database của chế độ phát triển.

## Cách sử dụng V1

1. **Thêm công việc** → tên lớp → chọn nhiều thứ → giờ bất kỳ → ngày bắt đầu/kết thúc → lưu.
2. Nhập nhanh: `10A1 | 2 4 6 | 17:45-19:15`, rồi **Điền vào form**. Nhập `CN` cho Chủ nhật. Parser không dùng AI.
3. Chọn một preset 45/90/120 phút rồi nhập giờ bắt đầu; giờ kết thúc được điền theo preset, vẫn có thể sửa tự do.
4. Một công việc có thể có nhiều quy luật giờ khác nhau: vào **Công việc → Thêm khung giờ**. Ví dụ lớp đó dạy T2 lúc 17:45 và T7 lúc 08:00.
5. Nhấp ca để sửa; kéo block để đổi ngày/giờ; kéo cạnh trên hoặc dưới để đổi thời lượng. Thao tác kéo được xem trước, chưa ghi dữ liệu cho đến khi xác nhận.
6. Khi sửa lịch lặp, chọn **Chỉ ca này**, **Từ ca này trở đi**, **Tất cả thứ này từ nay**, hoặc **Toàn bộ lịch**. Phạm vi được giải thích trong dialog.
7. Nhấp phải ca để sửa, nhân bản thành ca độc lập, đánh dấu đã dạy, hủy, chuyển giờ, tạo ca bù hoặc xóa.
8. Nhấp đúp ô trống để thêm một ca riêng. Nhập nhanh nhiều thứ sẽ chuyển form sang lịch lặp tuần.
9. Phím **Enter/Space** trên ca mở chi tiết; **Delete** mở xác nhận xóa; **Esc** đóng dialog; **Ctrl+S** lưu form công việc.
10. **Thống kê** lọc tuần, tháng hoặc khoảng ngày và theo công việc. Dashboard dùng cùng engine.
11. **Xuất ảnh** xuất cả tuần đang chọn, bao gồm các công việc bị ẩn bởi bộ lọc màn hình. Dialog ghi rõ phạm vi này.
12. Bấm tên thời khóa biểu ở sidebar để tạo, đổi tên, nhân bản, lưu trữ, khôi phục hoặc xóa workspace.

### Quy ước dữ liệu cần biết

- Thứ trong domain: `0 = Thứ 2` … `6 = Chủ nhật`.
- Ca nằm trong cùng một ngày, chính xác đến phút, từ `00:00` tới `23:59`. Ca đi qua nửa đêm cần tách thành hai ca. Đây là giới hạn V1 có validation, không tự suy đoán ngày kết thúc.
- Giờ là giờ địa phương dạng lịch dân sự, không chuyển ngầm sang UTC. Timestamp tạo/sửa dùng ISO UTC riêng. V1 chưa chuyển đổi múi giờ.
- Ca qua giờ **không tự được tính là đã dạy**. Phải đánh dấu hoàn thành; báo cáo có số ca qua giờ chưa đánh dấu.
- `Tổng ca` gồm cả ca hủy/nghỉ để giữ số liệu. `Tổng giờ theo lịch` và `Ca theo lịch` loại ca hủy/nghỉ. `Giờ hoàn thành` chỉ tính ca đã đánh dấu hoàn thành.
- Ca dạy bù đã hoàn thành đồng thời thuộc nhóm dạy bù và hoàn thành; các nhóm không phải các phần rời nhau để cộng thành tổng.
- Ca đổi lịch chỉ tính ở ngày thực hiện, không đếm đôi tại ngày gốc.
- Tạo ca bù giữ nguyên ca gốc. Nếu nghỉ ca gốc, đánh dấu nghỉ riêng.
- “Xóa ca này” tạo tombstone; ca không còn hiển thị hoặc được thống kê. Dùng “Hủy ca” khi cần giữ thống kê hủy.
- Lưu trữ **công việc** cất mục đó khỏi danh sách mặc định, giữ lịch và lịch sử; không có nghĩa dừng các ca tương lai. Muốn dừng, chọn một ca và xóa **Từ ca này trở đi**.
- Lưu trữ **workspace** cất toàn bộ không gian và có thể khôi phục. Xóa workspace cần xác nhận rõ ràng và xóa dữ liệu liên quan.
- Sửa toàn chuỗi có thể thay đổi lịch sử; các ngoại lệ đã đặt riêng vẫn giữ ngày/giờ thực tế. Muốn đổi một ngoại lệ, chọn “Chỉ ca này”.

## Tính năng đã có

| Nhóm       | Hành vi V1                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------- |
| Lịch       | Time-grid T2–CN, vị trí và chiều cao theo phút; chế độ danh sách; chọn tuần/ngày; lọc lớp     |
| Recurrence | Một lần, hằng tuần, mỗi N tuần (1–52), ngày bắt đầu/kết thúc hoặc không giới hạn              |
| Sửa        | Ngoại lệ riêng; tách chuỗi tương lai; tách riêng một thứ; sửa toàn bộ chuỗi                   |
| Tương tác  | Kéo ngang/dọc, resize hai cạnh, snap 5/10/15/30 phút, quick add, menu ngữ cảnh                |
| Trùng lịch | Khoảng `[bắt đầu, kết thúc)`, cảnh báo không chặn lưu; chia cột các block chồng nhau          |
| Dữ liệu    | SQLite, migration giao dịch, FK/CHECK/index, revision guard, chỉ cập nhật hàng đổi            |
| Workspace  | Tạo, đổi tên, nhân bản đầy đủ ID, lưu trữ/khôi phục, xóa có xác nhận                          |
| Báo cáo    | Tổng, đã dạy, sắp tới, hủy, nghỉ, bù, giờ theo lịch, giờ hoàn thành, theo công việc           |
| Xuất PNG   | 6 tỷ lệ, 4 style, màn hình/in màu/in trắng đen, các tùy chọn nội dung                         |
| Backup     | JSON schemaVersion=1, kiểm tra graph/kiểu, backup hiện tại trước restore, giao dịch nguyên tử |
| Giao diện  | Tiếng Việt, light/dark/system, màu theo lớp/nhóm/địa điểm/auto/custom                         |

Không tạo màn hình giả cho học sinh, lương, điểm danh hoặc AI; chưa có các tính năng đó trong V1.

## Stack và cấu trúc

React 19 · TypeScript strict · Vite 7 · Tauri 2 · SQLite (`rusqlite` bundled) · Zustand 5 · date-fns 4 · Zod 4 · CSS design tokens · Lucide · Vitest · Playwright.

`package-lock.json` khóa chính xác dependency frontend. Rust dependency khai báo trong Cargo.toml; môi trường bàn giao chưa có Cargo nên chưa tạo/kiểm chứng Cargo.lock. Sau lần build Windows đạt, commit Cargo.lock và đổi các bước CI sang `--locked` để khóa bản native trước phát hành.

```text
TeacherWorkspace/
  src/
    app/                     # App shell wiring, registry, Zustand, tokens CSS
    core/                    # Date/time arithmetic, workspace operations
    components/              # Dialog, empty state, toast and mutation feedback
    layouts/                 # Sidebar and application shell
    modules/
      schedule/
        domain/              # Types, validators, recurrence, commands, conflicts, colors, parser
        components/          # Calendar, work form, occurrence form, export form
        services/            # Independent PNG renderer
      statistics/            # Pure counting engine and dashboard/report UI
      settings/              # Settings, backup UX, API keys, workspace manager
      question-bank/         # Curriculum, YCCD, questions, AI queue, duplicate scan, exams
    database/
      migrations/            # Shared ordered SQL migrations
      codec.ts               # Snapshot <-> normalized SQL rows; diff
      driver.ts              # Desktop/browser persistence interface
      webSqlite.ts           # SQLite WASM development adapter
    services/                # Versioned backup and selected-file I/O
    assets/                  # Repo-native application mark
  src-tauri/
    src/                     # Tauri setup and SQLite transaction commands
    capabilities/            # Minimal window/dialog/file permissions
    icons/                   # Windows icon assets
    tauri.conf.json
    tauri.offline.conf.json
  tests/                     # Domain, real SQLite and browser integration tests
  docs/                      # Architecture, validation and screenshots
  Build-Windows.cmd
  Run-Desktop.cmd
  README.md
```

## Database architecture

Desktop path: Tauri `app_data_dir()/teacher-workspace.sqlite3` (thường ở `%APPDATA%\com.teacherworkspace.desktop\` trên Windows; dùng app-data resolver của Tauri làm nguồn chính xác). Không đặt database cạnh `.exe` hay trong thư mục source.

Tables: `workspaces`, `work_items`, `schedule_rules`, `schedule_exceptions`, `settings`, `app_meta`. Quan hệ FK nối workspace → work item → rule → exception. Chỉ settings và mảng weekdays dùng JSON field. Không lưu toàn bộ domain thành một JSON blob trên desktop.

- Migration SQL chạy trong giao dịch và tăng `PRAGMA user_version`.
- Desktop dùng WAL, foreign keys, synchronous FULL, busy timeout, một connection sau Mutex, kiểm tra `quick_check` khi khởi động và single-instance plugin.
- UI tính snapshot mới bằng domain command thuần, Zod kiểm tra trước, repository tạo diff, backend ghi tất cả thay đổi trong một transaction.
- `app_meta.revision` ngăn ghi đè dữ liệu đã thay đổi bởi cửa sổ khác. Khi sai revision, thay đổi bị từ chối, hiện lỗi, cần tải lại.
- Dùng UPSERT, không `INSERT OR REPLACE` gây cascade xóa ngoại lệ.
- Khi đổi khóa ngoại lệ, các hàng ngoại lệ đổi được gỡ và chèn lại trong cùng transaction để tránh vi phạm unique tạm thời.
- Restore cũng qua cùng pipeline; không xóa database trước khi xác thực backup.
- Không tự chuyển sang database rỗng nếu dữ liệu lỗi. Lỗi được hiển thị ở màn khôi phục.

## Recurrence và exception architecture

`WorkItem` là lớp/công việc. `ScheduleRule` chứa tập thứ, giờ và phạm vi ngày. `seriesId` nối những đoạn cùng chuỗi sau khi tách; `anchorDate` giữ pha của lịch mỗi N tuần.

Occurrence chỉ sinh cho khoảng đang xem; không persist hàng nghìn ca. ID ca cơ bản là `ruleId:originalDate`. Exception thường duy nhất cho cặp `(ruleId, originalDate)` qua partial unique index; nhiều makeup có ID riêng được phép cùng xuất phát từ một ca.

Engine tạo lịch gốc rồi áp ngoại lệ và lấy thêm những ngoại lệ có **ngày đích nằm trong khoảng xem dù ngày gốc ở ngoài**. Ca đổi lịch chỉ xuất hiện một lần. Ca bù là ngoại lệ cộng thêm, có ngày và giờ đầy đủ. `isMakeup` độc lập với trạng thái hoàn thành.

Sửa tương lai kết thúc đoạn cũ ở trước ngày gốc, tạo đoạn mới và chuyển ngoại lệ thuộc phần tương lai sang rule mới trong cùng transaction. Sửa riêng một thứ còn tạo nhánh giữ nguyên các thứ khác. Sửa ngày trên toàn chuỗi dịch thứ và biên ngày cùng một số ngày; ngoại lệ giữ ngày/giờ thực tế đã đặt.

Thuật toán không phụ thuộc UI hoặc Tauri. Các bất biến có unit test.

## Image export architecture

Dùng Canvas 2D độc lập nhận occurrence, công việc, settings và options. Không dùng html2canvas, screenshot, kích thước DOM hay trạng thái scroll.

| Preset   |       Pixel |
| -------- | ----------: |
| A4 dọc   | 2480 × 3508 |
| A4 ngang | 3508 × 2480 |
| 16:9     | 1920 × 1080 |
| 4:3      | 2400 × 1800 |
| 1:1      | 2000 × 2000 |
| 9:16     | 1080 × 1920 |

PNG có `pHYs` 300 dpi. Sắc nét trong kích thước pixel gốc; PNG là raster nên không thể zoom vô hạn mà vẫn giữ nét như SVG. A4 nên in ở 100% kích thước trang.

Các block vẫn đúng tỷ lệ thời gian. Khi block quá ngắn/hẹp để chứa chữ, dùng mã ca và **ảnh chi tiết bổ sung cùng kích thước**, không âm thầm bỏ tên, giờ, địa điểm hoặc ghi chú. Dialog thông báo số ảnh; trên desktop chọn đường dẫn cho từng PNG. Ảnh in luôn nền sáng; monochrome dùng nét viền và mã ca thay vì phụ thuộc màu. Lịch quá dày nên dùng A4 dọc hoặc xem thêm ảnh chi tiết.

## Test và kiểm tra

```powershell
npm run test
npm run lint
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
```

`npm run check` = lint + unit tests + TypeScript strict + Vite production build. Playwright chạy riêng vì cần browser. Fixture chỉ tồn tại trong tests; ảnh QA dùng dữ liệu kiểm thử, không phải dữ liệu người dùng.

CI Windows đã được khai báo để chạy các kiểm tra và tạo installer dưới dạng artifact. CI này phải thực sự chạy đạt trước khi gọi một binary là bản phát hành đã xác minh.

## Mở rộng sản phẩm

Xem `docs/ARCHITECTURE.md`. Thêm một module bằng domain riêng, service/repository riêng, màn hình lazy và mục navigation. Không đặt logic vào App hoặc calendar. Nếu module mới có persistence: thêm migration có số mới, schema/validator, codec và table whitelist backend; không sửa migration đã phát hành.

Điểm danh hoặc lương cần lưu tham chiếu ca ổn định qua thao tác tách chuỗi: mở rộng transaction để chuyển các tham chiếu cùng với exception, hoặc đưa thêm `OccurrenceRef`/mapping bền vững. Không dùng vị trí ô UI hoặc timestamp UTC suy đoán làm khóa.

Cloud/Google Calendar sync phải là adapter riêng với định danh provider và giải quyết xung đột; V1 không giả lập sync. Quy luật monthly/RRULE cần thêm strategy và migration/backup upgrade có test trước khi lộ lựa chọn trong UI.
