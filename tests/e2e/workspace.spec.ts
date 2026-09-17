import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const DATE = '2026-09-07';
async function addClass(page: Page, name = '10A1', times = '17:45-19:15', days = '2 4 6') {
  await page.getByRole('button', { name: 'Thêm công việc', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Thêm công việc', exact: true });
  await dialog.getByLabel('Nhập nhanh').fill(`${name} | ${days} | ${times}`);
  await dialog.getByRole('button', { name: 'Điền vào form' }).click();
  await dialog.getByLabel('Ngày bắt đầu', { exact: true }).fill(DATE);
  await dialog.getByLabel('Địa điểm').fill('Phòng 201');
  await dialog.getByRole('button', { name: 'Lưu công việc' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel('Chuyển đến ngày').fill(DATE);
}
async function openFirst(page: Page, name = '10A1') {
  const block = page.locator('.calendar-event').filter({ hasText: name }).first();
  await block.scrollIntoViewIfNeeded();
  await block.click();
  return page.getByRole('dialog');
}
test('weekly editing, drag, resize, status and reload persist through real SQLite', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByText('Một tuần thật chủ động.')).toBeVisible();
  await addClass(page);
  await expect(page.locator('.calendar-event')).toHaveCount(3);
  const block = page.locator('.calendar-event').first();
  expect(await block.evaluate((el) => parseFloat((el as HTMLElement).style.height))).toBeCloseTo(
    102,
  );
  const top = await block.evaluate((el) => parseFloat((el as HTMLElement).style.top));
  expect(top).toBeCloseTo(799);
  let dialog = await openFirst(page);
  await dialog.getByLabel('Bắt đầu', { exact: true }).fill('18:00');
  await dialog.getByLabel('Kết thúc', { exact: true }).fill('19:30');
  await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.event-time').filter({ hasText: '18:00 – 19:30' })).toHaveCount(1);
  await expect(page.locator('.event-time').filter({ hasText: '17:45 – 19:15' })).toHaveCount(2);
  const second = page.locator('.calendar-event').nth(1);
  await second.scrollIntoViewIfNeeded();
  const box = (await second.boundingBox())!;
  await page.mouse.move(box.x + 25, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 25, box.y + 47, { steps: 6 });
  await page.mouse.up();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Phạm vi thay đổi')).toBeVisible();
  await expect(dialog.getByLabel('Bắt đầu', { exact: true })).toHaveValue('18:00');
  await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(dialog).not.toBeVisible();
  const last = page.locator('.calendar-event').last();
  await last.scrollIntoViewIfNeeded();
  const bottom = (await last.boundingBox())!;
  await page.mouse.move(bottom.x + 20, bottom.y + bottom.height - 2);
  await page.mouse.down();
  await page.mouse.move(bottom.x + 20, bottom.y + bottom.height + 15, { steps: 6 });
  await page.mouse.up();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Kết thúc', { exact: true })).toHaveValue('19:30');
  await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(dialog).not.toBeVisible();
  dialog = await openFirst(page);
  await dialog.getByRole('button', { name: 'Đã dạy', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  // View date is navigation state, so select it again after reload.
  await page.getByLabel('Chuyển đến ngày').fill(DATE);
  await expect(page.locator('.calendar-event')).toHaveCount(3);
  await expect(page.locator('.status-completed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Thống kê', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chi tiết theo công việc' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('image export, dark/print rendering, backup and workspace duplication', async ({ page }) => {
  await page.goto('/');
  await addClass(page);
  await addClass(page, '12A3', '18:30-20:00', '2 5');
  await addClass(page, 'Soạn bài', '14:00-16:00', '3 5');
  await expect(page.locator('.calendar-event.conflict')).toHaveCount(2);
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.getByRole('combobox', { name: 'Khung lịch từ', exact: true }).selectOption('13');
  await page.getByRole('combobox', { name: /^Mật độ lịch/ }).selectOption('48');
  await page.getByRole('button', { name: 'Thời khóa biểu', exact: true }).click();
  await page.getByLabel('Chuyển đến ngày').fill(DATE);
  while (await page.getByRole('button', { name: 'Đóng thông báo' }).count())
    await page.getByRole('button', { name: 'Đóng thông báo' }).first().click();
  await page.getByRole('heading', { name: 'Một tuần thật chủ động.' }).click();
  await page.screenshot({ path: 'docs/screenshots/calendar-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Đổi giao diện sáng/tối' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(19, 32, 29)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(230, 238, 234)');
  while (await page.getByRole('button', { name: 'Đóng thông báo' }).count())
    await page.getByRole('button', { name: 'Đóng thông báo' }).first().click();
  await page.getByRole('heading', { name: 'Một tuần thật chủ động.' }).click();
  await page.screenshot({ path: 'docs/screenshots/calendar-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Xuất ảnh', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Xuất thời khóa biểu' });
  await expect(dialog.locator('canvas')).toBeVisible();
  await dialog
    .getByRole('combobox', { name: 'Kích thước', exact: true })
    .selectOption('a4portrait');
  await dialog.getByRole('combobox', { name: 'Mục đích', exact: true }).selectOption('mono');
  await expect(dialog.locator('canvas')).toHaveAttribute('width', '2480');
  await expect(dialog.locator('canvas')).toHaveAttribute('height', '3508');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /Xuất PNG/ }).click();
  const download = await downloadPromise;
  await download.saveAs('docs/screenshots/export-a4-print.png');
  const bytes = await readFile('docs/screenshots/export-a4-print.png');
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  expect(bytes.readUInt32BE(16)).toBe(2480);
  expect(bytes.readUInt32BE(20)).toBe(3508);
  expect(bytes.includes(Buffer.from('pHYs'))).toBe(true);
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const backupPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất backup' }).click();
  const backup = await backupPromise;
  await backup.saveAs('test-results/backup.json');
  const json = JSON.parse(await readFile('test-results/backup.json', 'utf8')) as {
    schemaVersion: number;
    rules: unknown[];
  };
  expect(json.schemaVersion).toBe(1);
  expect(json.rules).toHaveLength(3);
  await page.getByRole('button', { name: 'Quản lý thời khóa biểu' }).click();
  const manager = page.getByRole('dialog', { name: 'Các thời khóa biểu' });
  await manager.getByRole('button', { name: /Nhân bản/ }).click();
  await expect(manager.locator('.workspace-row')).toHaveCount(2);
  await manager.getByRole('button', { name: 'Đóng', exact: true }).last().click();
  await page.getByRole('button', { name: 'Thời khóa biểu', exact: true }).click();
  await page.getByLabel('Chuyển đến ngày').fill(DATE);
  await expect(page.locator('.calendar-event')).toHaveCount(7);
});
test('quick-add empty slot, context menu, invalid entry and backup restore', async ({ page }) => {
  await page.goto('/');
  const day = page.locator('.day-column').first();
  await day.dblclick({ position: { x: 40, y: 120 } });
  let dialog = page.getByRole('dialog', { name: 'Thêm công việc', exact: true });
  await expect(dialog.getByRole('combobox', { name: 'Lặp lại', exact: true })).toHaveValue('once');
  await dialog.getByLabel('Tên công việc').fill('Họp chuyên môn');
  await dialog.getByLabel('Ngày thực hiện').fill(DATE);
  await dialog.getByRole('button', { name: 'Lưu công việc' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel('Chuyển đến ngày').fill(DATE);
  await page.locator('.calendar-event').first().click({ button: 'right' });
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menuitem', { name: 'Nhân bản ca' }).click();
  await expect(page.locator('.calendar-event')).toHaveCount(2);
  await page.getByRole('button', { name: 'Thêm công việc', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nhập nhanh').fill('Sai | 1 | 20:00-19:00');
  await dialog.getByRole('button', { name: 'Điền vào form' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  let downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất backup' }).click();
  const backup = await downloadPromise;
  await backup.saveAs('test-results/restore-input.json');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Nhập backup' }).click();
  await (await chooser).setFiles('test-results/restore-input.json');
  await expect(page.getByRole('dialog', { name: 'Khôi phục từ backup?' })).toBeVisible();
  downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sao lưu và thay thế' }).click();
  await downloadPromise;
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Thời khóa biểu', exact: true }).click();
  await page.getByLabel('Chuyển đến ngày').fill(DATE);
  await expect(page.locator('.calendar-event')).toHaveCount(2);
});

test('all PNG sizes, print background and dense minute-accurate export', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Một tuần thật chủ động.')).toBeVisible();
  const result = await page.evaluate(async () => {
    const { renderScheduleImages, EXPORT_PRESETS, DEFAULT_EXPORT, canvasPng } =
      await import('../../src/modules/schedule/services/exportImage.ts');
    const { fixture } = await import('../../tests/fixtures.ts');
    const { generateOccurrences } = await import('../../src/modules/schedule/domain/recurrence.ts');
    const data = fixture({
      startTime: '23:58',
      endTime: '23:59',
      weekdays: [0],
      description: 'Nội dung ghi chú đầy đủ cần được giữ lại. '.repeat(35),
    });
    const events = generateOccurrences(data, data.settings.activeWorkspaceId!, {
      start: '2026-09-07',
      end: '2026-09-13',
    });
    const sizes: { actual: number[]; expected: number[]; pages: number }[] = [];
    for (const preset of Object.keys(EXPORT_PRESETS) as (keyof typeof EXPORT_PRESETS)[]) {
      const pages = renderScheduleImages({
        start: '2026-09-07',
        events,
        items: data.workItems,
        settings: data.settings,
        options: { ...DEFAULT_EXPORT, preset, showNotes: true },
      });
      sizes.push({
        actual: [pages[0].canvas.width, pages[0].canvas.height],
        expected: [EXPORT_PRESETS[preset].width, EXPORT_PRESETS[preset].height],
        pages: pages.length,
      });
    }
    const options = {
      ...DEFAULT_EXPORT,
      preset: 'wide' as const,
      style: 'dark' as const,
      medium: 'colorPrint' as const,
    };
    const print = renderScheduleImages({
      start: '2026-09-07',
      events,
      items: data.workItems,
      settings: data.settings,
      options,
    })[0].canvas;
    const pixel = Array.from(print.getContext('2d')!.getImageData(0, 0, 1, 1).data);
    const encoded = await canvasPng(print);
    return { sizes, pixel, signature: Array.from(encoded.slice(0, 8)), bytes: encoded.length };
  });
  for (const size of result.sizes) {
    expect(size.actual).toEqual(size.expected);
    expect(size.pages).toBeGreaterThan(1);
  }
  expect(result.pixel).toEqual([255, 255, 255, 255]);
  expect(result.signature).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(result.bytes).toBeGreaterThan(1000);
});
