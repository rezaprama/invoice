import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { templates } from '../../src/templates';

async function choose(page: Page, id: string, replace = true) {
  await page.getByLabel('Format invoice', { exact: true }).selectOption(id);
  if (await page.getByRole('dialog').count()) {
    await page.getByLabel('Ganti item dengan contoh format ini').setChecked(replace);
    await page.getByRole('button', { name: 'Terapkan format', exact: true }).click();
  }
}
test('all 20 industry formats can be applied and edited on the document', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');
  for (const format of templates) {
    await choose(page, format.id);
    await expect(page.getByLabel('Judul dokumen', { exact: true })).toHaveValue(format.title.id);
    await expect(page.locator('.line-item')).toHaveCount(format.items.length);
    for (const detail of format.fields) await expect(page.getByLabel(detail.label.id, { exact: true })).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test('switching formats can retain existing priced items and custom data', async ({ page }) => {
  await page.goto('./');
  await page.locator('#section-02').getByLabel('Nama / perusahaan').fill('Identitas kustom');
  await page.getByLabel('Judul dokumen', { exact: true }).fill('Invoice khusus');
  await page.getByLabel('Deskripsi', { exact: true }).fill('Item asli');
  await page.getByLabel('Harga satuan (IDR)', { exact: true }).fill('123456');
  await page.getByLabel('Format invoice', { exact: true }).selectOption('legal_consultation');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Ganti item dengan contoh format ini')).not.toBeChecked();
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(page.getByLabel('Format invoice', { exact: true })).toHaveValue('blank');
  await choose(page, 'legal_consultation', false);
  await expect(page.locator('#section-02').getByLabel('Nama / perusahaan')).toHaveValue('Identitas kustom');
  await expect(page.getByLabel('Judul dokumen', { exact: true })).toHaveValue('Invoice khusus');
  await expect(page.getByLabel('Deskripsi', { exact: true })).toHaveValue('Item asli');
  await expect(page.locator('.paper-balance dd')).toContainText('123.456');
  await page.getByLabel('Referensi penugasan', { exact: true }).fill('REF-LEGAL-001');
  await page.getByRole('button', { name: 'Tambah detail', exact: true }).click();
  const added = page.locator('.document-detail').last();
  await added.getByRole('textbox').first().fill('Referensi internal');
  await added.getByRole('textbox').last().fill('REF-CUSTOM-001');
  await choose(page, 'architecture', false);
  await expect(page.getByLabel('Referensi penugasan', { exact: true })).toHaveValue('REF-LEGAL-001');
  await expect(page.getByLabel('Referensi internal', { exact: true })).toHaveValue('REF-CUSTOM-001');
  await choose(page, 'construction_volume', true);
  await expect(page.locator('.line-item')).toHaveCount(4);
  await expect(page.getByLabel('Referensi internal', { exact: true })).toHaveValue('REF-CUSTOM-001');
  await page.locator('.document-detail').filter({ has: page.getByLabel('Referensi internal', { exact: true }) }).getByRole('button').click();
  await expect(page.getByLabel('Referensi internal', { exact: true })).toHaveCount(0);
});

test('Kos Zania and Sriyani formats export actual billing metadata to PDF', async ({ page }) => {
  await page.goto('./'); await choose(page, 'kost_monthly');
  await expect(page.locator('#section-02').getByLabel('Nama / perusahaan')).toHaveValue('Kos Zania');
  await expect(page.locator('#section-02').getByLabel('Alamat', { exact: true })).toHaveValue('Tangerang');
  await page.locator('#section-03').getByLabel('Nama / perusahaan').fill('Penghuni Uji');
  await page.getByLabel('Nomor kamar', { exact: true }).fill('A-01');
  await page.getByLabel('Periode tagihan', { exact: true }).fill('November 2026');
  const rates = page.getByLabel('Harga satuan (IDR)', { exact: true });
  await rates.nth(0).fill('1500000'); await rates.nth(1).fill('3000'); await rates.nth(2).fill('50000');
  await page.getByLabel('Jumlah', { exact: true }).nth(1).fill('20');
  await expect(page.locator('.paper-balance dd')).toContainText('1.610.000');
  let event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Unduh PDF', exact: true }).first().click();
  await (await event).saveAs(test.info().outputPath('kos-zania.pdf'));
  await page.reload(); await choose(page, 'legal_consultation');
  await expect(page.locator('#section-02').getByLabel('Nama / perusahaan')).toHaveValue('Sriyani Suhartati');
  await page.locator('#section-03').getByLabel('Nama / perusahaan').fill('Klien Uji');
  await page.getByLabel('Referensi penugasan', { exact: true }).fill('REF-HUKUM-001');
  await page.getByLabel('Periode layanan', { exact: true }).fill('November 2026');
  for (const rate of await rates.all()) await rate.fill('100000');
  event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Unduh PDF', exact: true }).first().click();
  await (await event).saveAs(test.info().outputPath('sriyani.pdf'));
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
