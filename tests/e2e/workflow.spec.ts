import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

async function fillInvoice(page: Page) {
  await page.locator('#section-02').getByLabel('Nama / perusahaan').fill('Uji Pengirim');
  await page.locator('#section-02').getByLabel('Email', { exact: true }).fill('test@example.com');
  await page.locator('#section-03').getByLabel('Nama / perusahaan').fill('Klien Pengujian');
  await page.getByLabel('Deskripsi', { exact: true }).first().fill('Pengembangan website');
  await page.getByLabel('Jumlah', { exact: true }).first().fill('2,5');
  await page.getByLabel('Harga satuan (IDR)', { exact: true }).first().fill('100000');
}
test.beforeEach(async ({ page }) => { await page.goto('./'); });

test('item editing, duplication, ordering, delete and undo update totals', async ({ page }, info) => {
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
});

test('PDF is the only download; validation and PDF error can be retried', async ({ page }) => {
  const requests: { url: string; method: string }[] = [];
  page.on('request', r => requests.push({ url: r.url(), method: r.method() }));
  await page.getByRole('button', { name: 'Unduh PDF', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Isi nama pengirim');
  await page.keyboard.press('Escape');
  await fillInvoice(page);
  await page.route('**/fonts/*.ttf', route => route.abort());
  await page.getByRole('button', { name: 'Unduh PDF', exact: true }).first().click();
  await expect(page.locator('.toast')).toContainText('PDF gagal dibuat');
  await page.unroute('**/fonts/*.ttf');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh PDF', exact: true }).first().click();
  const pdf = await downloadEvent; expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  await pdf.saveAs(test.info().outputPath('invoice.pdf'));
  expect((await readFile((await pdf.path())!)).subarray(0, 5).toString()).toBe('%PDF-');
  expect(requests.every(r => r.method === 'GET')).toBeTruthy();
  expect(requests.some(r => r.url.includes('Uji') || r.url.includes('Pengujian'))).toBeFalsy();
  await expect(page.getByRole('button', { name: /Simpan|Cadangan|Riwayat|Save|Backup|History/ })).toHaveCount(0);
});

test('no storage APIs are touched; refresh and a second tab start blank', async ({ page, context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('rezaprama:invoice-studio:v1', 'legacy data must not be loaded');
    sessionStorage.setItem('invoice-studio:active', 'legacy-id');
    const calls: string[] = [];
    Object.defineProperty(window, '__storageCalls', { value: calls });
    for (const name of ['getItem', 'setItem', 'removeItem', 'clear', 'key'] as const) {
      Object.defineProperty(Storage.prototype, name, { value: () => { calls.push(name); throw new Error(`Storage forbidden: ${name}`); } });
    }
    Object.defineProperty(window, 'indexedDB', { get() { calls.push('indexedDB'); throw new Error('IndexedDB forbidden'); } });
  });
  await page.reload();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await fillInvoice(page); await page.getByLabel('Tema', { exact: true }).selectOption('dark');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh PDF', exact: true }).first().click();
  expect((await downloadEvent).suggestedFilename()).toMatch(/\.pdf$/);
  expect(await page.evaluate(() => (window as unknown as { __storageCalls: string[] }).__storageCalls)).toEqual([]);
  const second = await context.newPage(); await second.goto('./');
  await expect(second.locator('#section-02').getByLabel('Nama / perusahaan')).toHaveValue('');
  await page.reload();
  await expect(page.locator('#section-02').getByLabel('Nama / perusahaan')).toHaveValue('');
  await expect(page.locator('#section-03').getByLabel('Nama / perusahaan')).toHaveValue('');
  await expect(page.getByLabel('Deskripsi', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Tema', { exact: true })).toHaveValue('system');
  expect(await page.evaluate(() => (window as unknown as { __storageCalls: string[] }).__storageCalls)).toEqual([]);
  expect(errors).toEqual([]); await second.close();
});

test('theme follows system changes and manual override; blue light/dark layouts pass Axe', async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Tema', { exact: true }).selectOption('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: test.info().outputPath('dark.png') });
  await page.getByLabel('Tema', { exact: true }).selectOption('light');
  await fillInvoice(page);
  const widths = info.project.name === 'mobile' ? [320, 375, 390, 768] : [901, 1024, 1280, 1440, 1920];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.setViewportSize(info.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Pratinjau', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('light.png') });
});

test('templates, logo, currencies, payment and separate UI/document languages work', async ({ page }, info) => {
  await fillInvoice(page);
  for (const template of ['design', 'software', 'general']) await page.getByLabel('Tambahkan contoh item', { exact: true }).selectOption(template);
  await expect(page.locator('.line-item')).toHaveCount(6);
  const logo = page.locator('input[type=file]');
  await logo.setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('not a PNG') });
  await expect(page.locator('.toast')).toContainText('Logo harus');
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 4; c.height = 4; c.getContext('2d')!.fillRect(0, 0, 4, 4); return c.toDataURL().split(',')[1]; });
  await logo.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('.logo-upload img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Hapus logo' }).click();
  await expect(page.locator('.logo-upload img')).toHaveCount(0);
  await page.getByLabel('Mata uang', { exact: true }).selectOption('USD');
  for (const rate of await page.getByLabel('Harga satuan (USD)', { exact: true }).all()) await rate.fill('0');
  await page.getByLabel('Jenis diskon', { exact: true }).selectOption('fixed');
  await page.getByLabel('Status', { exact: true }).selectOption('paid');
  await expect(page.getByLabel('Sudah dibayar (USD)', { exact: true })).toBeDisabled();
  await page.getByLabel('Petunjuk pembayaran', { exact: true }).fill('Bank pengujian');
  await page.getByLabel('Catatan', { exact: true }).fill('Terima kasih.');
  await page.getByLabel('Syarat pembayaran', { exact: true }).fill('14 hari.');
  await page.getByLabel('Jatuh tempo', { exact: true }).fill('');
  await page.getByLabel('Bahasa dokumen', { exact: true }).selectOption('en');
  await expect(page.locator('.paper-balance dt')).toHaveText('Amount due');
  await page.getByLabel('Bahasa', { exact: true }).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Create an invoice' })).toBeVisible();
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.paper-balance dd')).toContainText('$0.00');
});

test('reset requires confirmation and discards form; empty items block PDF', async ({ page }) => {
  await fillInvoice(page);
  await page.getByRole('button', { name: 'Mulai ulang', exact: true }).click();
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(page.locator('#section-02').getByLabel('Nama / perusahaan')).toHaveValue('Uji Pengirim');
  await page.getByRole('button', { name: 'Mulai ulang', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mulai ulang', exact: true }).click();
  await expect(page.locator('#section-02').getByLabel('Nama / perusahaan')).toHaveValue('');
  await page.getByRole('link', { name: 'Item', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hapus item 1' })).toBeInViewport();
  await page.getByRole('button', { name: 'Hapus item 1' }).click();
  await expect(page.locator('.empty-items')).toBeVisible();
  await page.getByRole('button', { name: 'Unduh PDF', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Tambahkan minimal satu item');
});

test('long invoice downloads as multipage text PDF entirely from the form', async ({ page }) => {
  await fillInvoice(page);
  await page.getByLabel('Nomor invoice', { exact: true }).fill('TEST-MULTIPAGE');
  await page.getByLabel('Deskripsi', { exact: true }).fill('Pekerjaan uji: deskripsi panjang untuk memeriksa pemisahan halaman, ketepatan hitungan, dan pengulangan header tabel. '.repeat(3));
  await page.getByLabel('Catatan', { exact: true }).fill('CATATAN TERAKHIR');
  for (let i = 0; i < 29; i++) await page.getByRole('button', { name: 'Duplikat item 1', exact: true }).click();
  await expect(page.locator('.line-item')).toHaveCount(30);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh PDF', exact: true }).first().click();
  const pdf = await downloadEvent; await pdf.saveAs(test.info().outputPath('multipage.pdf'));
  const bytes = await readFile((await pdf.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect([...bytes.toString('latin1').matchAll(/\/Type \/Page\b/g)].length).toBeGreaterThan(2);
});
