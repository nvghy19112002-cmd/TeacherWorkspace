import { test, expect } from '@playwright/test';

test('offline fixes, provider, consent, structured review, history and persistence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let calls = 0;
  await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
    if (route.request().method() === 'POST') {
      calls++;
      await route.fulfill({
        json: {
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      summary: 'Báo cáo thử nghiệm giao diện',
                      issues: [
                        {
                          severity: 'P1',
                          line: 1,
                          message: 'Cần kiểm tra điều kiện',
                          suggestion: 'Đối chiếu miền xác định.',
                        },
                      ],
                      uncertainty: ['Chưa kiểm chứng bằng trình biên dịch.'],
                      correctedLatex: null,
                    }),
                  },
                ],
              },
            },
          ],
        },
      });
    } else
      await route.fulfill({
        json: {
          models: [{ name: 'models/test-model', supportedGenerationMethods: ['generateContent'] }],
        },
      });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'AI Tools', exact: true }).click();
  const source = page.getByLabel('Tài liệu LaTeX', { exact: true });
  await source.fill('\\begin{ex}\n$\\frac{1}{2}$\n\\loigiai{Đúng.}\n\\end{ex}');
  await page.getByRole('button', { name: 'Đổi frac sang dfrac' }).click();
  await expect(source).toHaveValue(/\\dfrac/);
  await page.getByRole('button', { name: 'Hoàn tác thay đổi gần nhất' }).click();
  await expect(source).toHaveValue(/\\frac/);
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Provider', exact: true }).click();
  await page.getByPlaceholder('Nhập Gemini API key', { exact: true }).fill('fake-key-e2e-only');
  await page.getByRole('button', { name: 'Thêm key', exact: true }).click();
  await page.getByTitle('Kiểm tra', { exact: true }).click();
  await expect(page.getByText(/Kết nối thành công/)).toBeVisible();
  await page.getByLabel('Model', { exact: true }).fill('test-model');
  await page.getByRole('button', { name: 'Lưu model', exact: true }).click();
  await expect(page.getByText('Đã lưu model.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Phản biện đề', exact: true }).click();
  await page.getByRole('button', { name: 'Phản biện bằng AI', exact: true }).click();
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Xác nhận gửi', exact: true }).click();
  await expect(page.getByText('Báo cáo thử nghiệm giao diện', { exact: true })).toBeVisible();
  await expect(page.getByText('Đã nhận và lưu báo cáo.', { exact: true })).toBeVisible();
  expect(calls).toBe(1);
  await page.screenshot({ path: 'test-results/ai-tools-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Đổi giao diện sáng/tối' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'test-results/ai-tools-dark.png', fullPage: true });
  await page.setViewportSize({ width: 1024, height: 768 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/ai-tools-1024.png', fullPage: true });
  await page.getByRole('button', { name: 'Prompt Studio', exact: true }).click();
  await page.getByRole('button', { name: 'Nhân bản', exact: true }).click();
  await page.getByLabel('Tên prompt', { exact: true }).fill('Prompt cá nhân');
  await page.getByRole('button', { name: 'Lưu prompt', exact: true }).click();
  await expect(page.getByText('Đã lưu prompt.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'AI Tools', exact: true }).click();
  await page.getByRole('button', { name: 'Prompt Studio', exact: true }).click();
  await expect(
    page.getByLabel('Chọn prompt').getByRole('option', { name: 'Prompt cá nhân', exact: true }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Lịch sử', exact: true }).click();
  await expect(page.locator('.ai-history-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Xóa lịch sử', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(page.locator('.ai-history-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Provider', exact: true }).click();
  await expect(page.getByLabel('Model', { exact: true })).toHaveValue('test-model');
  await expect(page.getByRole('button', { name: 'Xóa key', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
