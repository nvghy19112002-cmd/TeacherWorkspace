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

  await page.getByRole('button', { name: 'Xem code', exact: true }).click();
  await expect(page.locator('.qb-source-view')).toContainText('\\begin{ex}');
  expect(errors).toEqual([]);
});
