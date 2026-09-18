import { expect, test } from '@playwright/test';

test('MathHub-style question bank layout adds and previews a LaTeX question', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Ngân hàng câu hỏi', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Ngân hàng câu hỏi' })).toBeVisible();
  await expect(page.locator('.qb-mathhub-shell')).toBeVisible();
  await expect(page.getByLabel('Lớp')).toBeVisible();
  await expect(page.getByLabel('Cấp 2 / Phân môn')).toBeVisible();
  await expect(page.getByLabel('Chương')).toBeVisible();
  await expect(page.getByLabel('Bài')).toBeVisible();
  await expect(page.getByLabel('Dạng')).toBeVisible();

  await page.getByRole('button', { name: 'Thêm câu', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Thêm câu hỏi', exact: true });
  await dialog.getByLabel('Mã LaTeX').fill(`\\begin{ex}
Trong các số sau, số nào là số nguyên tố?
\\choice
{4}
{6}
{\\True 7}
{9}
\\loigiai{Số $7$ chỉ có hai ước dương.}
\\end{ex}`);
  await dialog.getByLabel('Loại câu').selectOption('multiple_choice');
  await dialog.getByLabel('Đáp án').fill('C');
  await dialog.getByLabel('Lời giải').fill('Số $7$ chỉ có hai ước dương.');
  await dialog.getByRole('button', { name: 'Lưu câu hỏi', exact: true }).click();
  await expect(dialog).not.toBeVisible();

  await expect(page.locator('.qb-question-table tbody tr')).toHaveCount(1);
  await page.locator('.qb-question-table tbody tr').first().click();
  await expect(page.locator('.qb-preview-choice')).toHaveCount(4);
  await expect(page.locator('.qb-preview-choice.correct')).toContainText('7');
  await expect(page.getByText('Đáp án: C', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Quét ID', exact: true }).click();
  const aiDialog = page.getByRole('dialog', { name: 'Quét ID bằng AI', exact: true });
  await expect(aiDialog).toBeVisible();
  await expect(aiDialog.getByText('Chưa chọn', { exact: true })).toBeVisible();
  await expect(aiDialog.getByRole('button', { name: 'Chạy AI đề xuất' })).toBeDisabled();
  await aiDialog
    .locator('.modal-footer')
    .getByRole('button', { name: 'Đóng', exact: true })
    .click();

  await page.getByRole('button', { name: 'Xem code', exact: true }).click();
  await expect(page.locator('.qb-source-view')).toContainText('\\begin{ex}');
  expect(errors).toEqual([]);
});

test('review imports, skip exact repeats and restore a trashed question', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ngân hàng câu hỏi', exact: true }).click();
  const raw =
    '\\begin{ex}%[0D1N1-1]\nCâu kiểm tra nhập\\choiceTF[1t]{\\True A}{B}{\\True C}{D}\\end{ex}';
  const file = { name: 'nhap.tex', mimeType: 'text/plain', buffer: Buffer.from(raw) };
  await page.locator('.qb-import-button input').setInputFiles(file);
  const review = page.getByRole('dialog', { name: 'Kiểm tra trước khi nhập', exact: true });
  await expect(review).toBeVisible();
  await expect(page.locator('.qb-question-table tbody tr')).toHaveCount(0);
  await review.getByRole('button', { name: 'Xác nhận nhập', exact: true }).click();
  await expect(review).not.toBeVisible();
  await expect(page.locator('.qb-question-table tbody tr')).toHaveCount(1);
  await page.locator('.qb-question-table tbody tr').click();
  await expect(page.locator('.qb-preview-choice')).toHaveCount(4);
  await expect(page.locator('.qb-preview-answer')).toContainText('Đ – S – Đ – S');
  await page.locator('.qb-import-button input').setInputFiles(file);
  await expect(review.getByRole('button', { name: 'Xác nhận nhập' })).toBeDisabled();
  await review.getByRole('button', { name: 'Hủy nhập' }).click();
  await page.locator('.qb-question-table tbody input[type="checkbox"]').check();
  page.once('dialog', (dialog) => void dialog.accept());
  await page
    .getByLabel('Thao tác với câu đã chọn')
    .getByRole('button', { name: 'Xóa', exact: true })
    .click();
  await expect(page.locator('.qb-question-table tbody tr')).toHaveCount(0);
  await page.getByRole('button', { name: 'Thùng rác (1)', exact: true }).click();
  const trash = page.getByRole('dialog', { name: 'Thùng rác câu hỏi', exact: true });
  await trash.getByRole('button', { name: 'Khôi phục', exact: true }).click();
  await expect(trash.getByText('Thùng rác trống.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Ngân hàng câu hỏi', exact: true }).click();
  await expect(page.locator('.qb-question-table tbody tr')).toHaveCount(1);
});

test('warns before importing a question that needs a custom LaTeX declaration', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ngân hàng câu hỏi', exact: true }).click();
  const raw = String.raw`\begin{ex}\myCustomDrawing{A}\end{ex}`;
  await page.locator('.qb-import-button input').setInputFiles({
    name: 'macro-rieng.tex',
    mimeType: 'text/plain',
    buffer: Buffer.from(raw),
  });
  const declaration = page.getByRole('dialog', { name: 'Bổ sung khai báo LaTeX', exact: true });
  await expect(declaration).toBeVisible();
  await expect(declaration.getByText(/myCustomDrawing/).first()).toBeVisible();
  await declaration.getByRole('button', { name: 'Bỏ qua cảnh báo', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Kiểm tra trước khi nhập', exact: true });
  await expect(review).toBeVisible();
  await expect(review.getByText(/Khai báo LaTeX/).first()).toBeVisible();
  await review.getByRole('button', { name: 'Hủy nhập', exact: true }).click();
});
