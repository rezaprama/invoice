import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const sender = (page: Page) => page.locator('.form-section').filter({ has: page.getByRole('heading', { name: /02.*Dari/ }) });
const client = (page: Page) => page.locator('.form-section').filter({ has: page.getByRole('heading', { name: /03.*Ditagihkan/ }) });
async function fillInvoice(page: Page) {
  await sender(page).getByLabel('Nama / perusahaan').fill('Reza Prama');
  await sender(page).getByLabel('Email', { exact: true }).fill('reza@example.com');
  await client(page).getByLabel('Nama / perusahaan').fill('Klien Pengujian');
  await page.getByLabel('Deskripsi', { exact: true }).first().fill('Pengembangan website');
  await page.getByLabel('Jumlah', { exact: true }).first().fill('2.5');
  await page.getByLabel('Harga satuan (IDR)', { exact: true }).first().fill('100000');
}
test.beforeEach(async ({ page }) => { await page.goto('./'); });

test('edit, duplicate, reorder, remove and undo items; invoice survives reload', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await fillInvoice(page);
  await page.getByRole('button', { name: 'Tambah item', exact: true }).click();
  await page.getByLabel('Deskripsi', { exact: true }).nth(1).fill('Pemeliharaan');
  await page.getByLabel('Harga satuan (IDR)', { exact: true }).nth(1).fill('50000');
  await page.getByRole('button', { name: 'Duplikat item 2', exact: true }).click();
  await expect(page.locator('.line-item')).toHaveCount(3);
  await page.getByRole('button', { name: 'Naikkan item 2', exact: true }).click();
  await expect(page.getByLabel('Deskripsi', { exact: true }).first()).toHaveValue('Pemeliharaan');
  await page.getByRole('button', { name: 'Turunkan item 1', exact: true }).click();
  await page.getByRole('button', { name: 'Hapus item 3', exact: true }).click();
  await expect(page.locator('.line-item')).toHaveCount(2);
  await page.getByRole('button', { name: 'Urungkan' }).click();
  await expect(page.locator('.line-item')).toHaveCount(3);
  await page.getByLabel('Diskon', { exact: true }).fill('10');
  await page.getByLabel('Tarif pajak (%)', { exact: true }).fill('11');
  await page.getByLabel('Biaya tambahan (IDR)', { exact: true }).fill('10000');
  await page.getByLabel('Sudah dibayar (IDR)', { exact: true }).fill('50000');
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Pratinjau', exact: true }).click();
  await expect(page.locator('.paper-balance dd')).toContainText('309.650');
  await expect(page.locator('.save-status')).toContainText('Tersimpan');
  await page.reload();
  await expect(sender(page).getByLabel('Nama / perusahaan')).toHaveValue('Reza Prama');
  await expect(page.locator('.line-item')).toHaveCount(3);
  await expect(page.getByLabel('Sudah dibayar (IDR)', { exact: true })).toHaveValue('50000');
  expect(errors).toEqual([]);
});

test('export validation, real PDF download, backup merge and invalid import', async ({ page }) => {
  await page.getByRole('button', { name: 'Unduh PDF', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Isi nama pengirim');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await fillInvoice(page);
  const pdfEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Unduh PDF', exact: true }).click();
  const pdf = await pdfEvent; expect(pdf.suggestedFilename()).toMatch(/^INV-.*\.pdf$/); await pdf.saveAs(test.info().outputPath('invoice.pdf'));
  await page.getByRole('button', { name: 'Cadangan', exact: true }).click();
  const backupEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Ekspor cadangan', exact: true }).click();
  const backup = await backupEvent; const path = await backup.path();
  await page.locator('input[type=file][accept^=".json"]').setInputFiles(path!);
  await expect(page.getByRole('dialog')).toContainText('0 invoice baru');
  await page.getByRole('button', { name: 'Gabungkan data' }).click();
  await expect(page.getByRole('status')).toContainText('berhasil digabungkan');
  await page.locator('input[type=file][accept^=".json"]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.getByRole('status')).toContainText('File tidak valid');
});

test('profiles, history filters, invoice copy, delete, undo, and bilingual mode', async ({ page }) => {
  await fillInvoice(page);
  await page.getByRole('button', { name: 'Simpan profil' }).click();
  await expect(page.locator('.toast')).toContainText('Profil bisnis disimpan');
  await page.getByRole('button', { name: 'Profil bisnis', exact: true }).click();
  await expect(page.locator('.profile-card')).toContainText('Reza Prama');
  await page.getByRole('button', { name: 'Gunakan', exact: true }).click();
  await page.getByRole('button', { name: 'Invoice baru', exact: true }).click();
  await expect(sender(page).getByLabel('Nama / perusahaan')).toHaveValue('Reza Prama');
  await page.getByRole('button', { name: /Riwayat/ }).click();
  await expect(page.locator('.history-row')).toHaveCount(2);
  await page.getByRole('textbox', { name: 'Cari nomor, klien, atau pengirim' }).fill('no matching client');
  await expect(page.getByText('Tidak ada invoice yang cocok.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Cari nomor, klien, atau pengirim' }).fill('');
  await page.getByRole('button', { name: /^Duplikat INV/ }).first().click();
  await page.getByRole('button', { name: /Riwayat/ }).click();
  await expect(page.locator('.history-row')).toHaveCount(3);
  await page.getByRole('button', { name: /^Hapus INV/ }).first().click();
  await page.getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Urungkan' }).click();
  await expect(page.locator('.history-row')).toHaveCount(3);
  await page.getByRole('button', { name: /^Buka INV/ }).last().click();
  const openedNumber = await page.getByLabel('Nomor invoice', { exact: true }).inputValue();
  await page.reload();
  await expect(page.getByLabel('Nomor invoice', { exact: true })).toHaveValue(openedNumber);
  await page.getByRole('button', { name: /Riwayat/ }).click();
  await page.locator('.language-select select').selectOption('en');
  await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
});

test('responsive layout and WCAG checks across editor, preview, history, profiles, backup', async ({ page }, info) => {
  await fillInvoice(page);
  const widths = info.project.name === 'mobile' ? [320, 375, 390, 768] : [1024, 1280, 1440, 1920];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.setViewportSize(info.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Pratinjau', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  }
  await page.screenshot({ path: test.info().outputPath('editor.png'), fullPage: true });
  for (const name of ['Riwayat', 'Profil bisnis', 'Cadangan']) {
    await page.getByRole('button', { name: new RegExp(name) }).first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  }
});

test('dark theme, keyboard focus, cross-tab conflict, and corrupt-data recovery', async ({ page, context }, info) => {
  if (info.project.name === 'desktop') {
    await page.getByLabel('Tema', { exact: true }).selectOption('dark');
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath('dark.png'), fullPage: true });
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBeTruthy();
  }
  await fillInvoice(page); await expect(page.locator('.save-status')).toContainText('Tersimpan');
  const second = await context.newPage(); await second.goto('./');
  await sender(second).getByLabel('Nama / perusahaan').fill('Changed in another tab');
  await expect(second.locator('.save-status')).toContainText('Tersimpan');
  await expect(page.getByRole('alert')).toContainText('Data berubah di tab lain');
  await page.getByRole('button', { name: 'Muat data terbaru' }).click();
  await expect(sender(page).getByLabel('Nama / perusahaan')).toHaveValue('Changed in another tab');
  await second.close();
  await expect(page.locator('.save-status')).toContainText('Tersimpan');
  await page.evaluate(() => localStorage.setItem('rezaprama:invoice-studio:v1', '{broken'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('tidak dapat dibaca');
  await expect(page.getByRole('button', { name: 'Mulai penyimpanan baru' })).toBeDisabled();
  const recoveryEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Unduh data pemulihan' }).click(); await recoveryEvent;
  await page.getByRole('button', { name: 'Mulai penyimpanan baru' }).click();
  await expect(page.getByRole('heading', { name: 'Buat invoice', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
