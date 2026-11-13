import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createInvoice, emptyBackup, emptyItem } from '../../src/model';

test('templates, logo validation, profile picker, free invoice, status, print and notes', async ({ page }, info) => {
  await page.goto('./');
  await page.locator('.template-picker select').selectOption('design');
  await expect(page.locator('.line-item')).toHaveCount(2);
  await page.locator('.template-picker select').selectOption('software');
  await page.locator('.template-picker select').selectOption('general');
  await expect(page.locator('.line-item')).toHaveCount(5);
  const from = page.locator('#section-02'); const to = page.locator('#section-03');
  await from.getByLabel('Nama / perusahaan').fill('Élodie Studio');
  await from.getByLabel('Alamat').fill('Jakarta\nIndonesia');
  await to.getByLabel('Nama / perusahaan').fill('Klien');
  await page.getByRole('button', { name: 'Simpan profil' }).click();
  await from.getByLabel('Nama / perusahaan').fill('Changed');
  await page.getByLabel('Gunakan profil tersimpan', { exact: true }).selectOption({ label: 'Élodie Studio' });
  await expect(from.getByLabel('Nama / perusahaan')).toHaveValue('Élodie Studio');
  const logo = page.locator('input[type=file][accept="image/png,image/jpeg"]');
  await logo.setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('invalid') });
  await expect(page.locator('.toast')).toContainText('Logo harus');
  const png = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2; canvas.getContext('2d')!.fillRect(0, 0, 2, 2); return canvas.toDataURL('image/png').split(',')[1]; });
  await logo.setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('.logo-upload img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Hapus logo', exact: true }).click();
  await expect(page.locator('.logo-upload img')).toHaveCount(0);
  await page.getByLabel('Mata uang', { exact: true }).selectOption('USD');
  for (const input of await page.getByLabel('Harga satuan (USD)', { exact: true }).all()) await input.fill('0');
  await page.getByLabel('Jenis diskon', { exact: true }).selectOption('fixed');
  await page.getByLabel('Petunjuk pembayaran', { exact: true }).fill('Bank Test\n123456789');
  await page.getByLabel('Catatan', { exact: true }).fill('Terima kasih.');
  await page.getByLabel('Syarat pembayaran', { exact: true }).fill('14 hari.');
  await page.getByLabel('Status', { exact: true }).selectOption('paid');
  await expect(page.getByLabel('Sudah dibayar (USD)', { exact: true })).toBeDisabled();
  await page.getByLabel('Jatuh tempo', { exact: true }).fill('');
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Pratinjau', exact: true }).click();
  await expect(page.locator('.paper-balance dd')).toContainText('0,00');
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Bahasa dokumen', { exact: true }).selectOption('en');
  await expect(page.locator('.paper-balance dt')).toHaveText('Amount due');
  if (info.project.name === 'desktop') {
    await page.evaluate(() => { window.print = () => { document.body.dataset.printCalled = 'yes'; }; });
    await page.getByRole('button', { name: 'Cetak', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-print-called', 'yes');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.invoice-paper')).toBeVisible();
    await expect(page.locator('.sidebar')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
  }
  await page.getByRole('button', { name: 'Profil bisnis', exact: true }).click();
  await page.getByRole('button', { name: 'Hapus Élodie Studio' }).click();
  await expect(page.locator('.profile-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Urungkan' }).click();
  await expect(page.locator('.profile-card')).toHaveCount(1);
});

test('large invoice makes a multipage PDF; empty items and storage failure remain recoverable', async ({ page }, info) => {
  await page.goto('./');
  const invoice = createInvoice([]); invoice.number = 'TEST-MULTIPAGE'; invoice.sender.name = 'Pengirim'; invoice.client.name = 'Penerima';
  invoice.notes = 'CATATAN TERAKHIR'; invoice.payment = 'Bank pengujian';
  invoice.items = Array.from({ length: 85 }, (_, index) => ({ ...emptyItem(), description: `Pekerjaan ${index + 1}: deskripsi layanan yang panjang untuk memeriksa pemisahan halaman.`, quantity: '1.5', rate: '123456' }));
  await page.locator('input[type=file][accept^=".json"]').setInputFiles({ name: 'large.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...emptyBackup(), invoices: [invoice] })) });
  await page.getByRole('button', { name: 'Gabungkan data' }).click();
  await page.getByRole('button', { name: /Riwayat/ }).click();
  await page.getByRole('button', { name: 'Buka TEST-MULTIPAGE' }).click();
  await expect(page.locator('.line-item')).toHaveCount(85);
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Unduh PDF', exact: true }).click();
  const download = await downloadEvent;
  await download.saveAs(test.info().outputPath('multipage.pdf'));
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect([...bytes.toString('latin1').matchAll(/\/Type \/Page\b/g)].length).toBeGreaterThan(2);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key === 'rezaprama:invoice-studio:v1') throw new DOMException('Quota exceeded', 'QuotaExceededError'); original.call(this, key, value); };
  });
  await page.getByLabel('Judul dokumen', { exact: true }).fill('Perubahan belum tersimpan');
  await expect(page.getByRole('alert')).toContainText('Penyimpanan browser gagal');
  const backupEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Ekspor cadangan', exact: true }).first().click();
  const backup = await backupEvent;
  expect(JSON.parse(await readFile((await backup.path())!, 'utf-8')).invoices.find((i: { number: string }) => i.number === 'TEST-MULTIPAGE').title).toBe('Perubahan belum tersimpan');
  await page.context().clearCookies();
  if (info.project.name === 'desktop') await page.screenshot({ path: test.info().outputPath('large-invoice.png') });
});

test('last-item deletion shows empty state and rejects empty PDF; keyboard section links work', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Item', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hapus item 1' })).toBeInViewport();
  await page.getByRole('button', { name: 'Hapus item 1' }).click();
  await expect(page.getByText('Belum ada item.', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Unduh PDF', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Tambahkan minimal satu item');
});
