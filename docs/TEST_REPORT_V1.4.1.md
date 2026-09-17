# Test report · Teacher Workspace V1.4.1

Ngày kiểm tra: 14/09/2026 (UTC)

| Hạng mục                                             | Kết quả                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| ESLint                                               | Đạt                                                           |
| TypeScript strict                                    | Đạt                                                           |
| Vitest                                               | 5 files, 103/103 đạt                                          |
| Vite production build                                | Đạt                                                           |
| Kiểm tra tên/phiên bản installer ở Rust              | Đã viết test; chưa chạy do môi trường bàn giao không có Cargo |
| Native Windows: chọn file, backup, mở NSIS, tự thoát | Cần kiểm thử trên máy Windows                                 |
| Updater online có chữ ký                             | Giữ nguyên; chưa phát hành                                    |

Frontend build thành công không thay thế cho kiểm thử native Windows. Trước khi dùng chính thức, build V1.4.1 trên Windows, cài đè V1.4.0, sau đó dùng một installer thử V1.4.2 để kiểm tra toàn bộ luồng trong ứng dụng.
