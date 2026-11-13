import { z } from 'zod';
import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export const currencies = ['IDR', 'USD', 'EUR', 'GBP', 'SGD', 'AUD', 'MYR', 'JPY', 'CNY', 'HKD', 'CAD', 'CHF', 'INR', 'KRW', 'THB', 'PHP', 'VND', 'AED', 'SAR', 'NZD', 'BHD', 'KWD'] as const;
const text = z.string().max(5000);
const short = z.string().max(200);
const numeric = z.string().max(20).regex(/^(?:\d{1,12}(?:\.\d{0,4})?|)$/);
const date = z.string().refine(value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
export const partySchema = z.object({
  name: short, email: short, address: text, phone: short, taxId: short,
  logo: z.string().max(200_000).regex(/^(?:data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+)?$/),
});
export const itemSchema = z.object({ id: short.min(1), description: text, quantity: numeric, unit: short, rate: numeric });
export const invoiceSchema = z.object({
  id: short.min(1), number: short, title: short, issued: date, due: z.union([date, z.literal('')]),
  currency: z.enum(currencies), language: z.enum(['id', 'en']), status: z.enum(['draft', 'sent', 'paid']),
  sender: partySchema, client: partySchema, items: z.array(itemSchema).max(500),
  discountType: z.enum(['percent', 'fixed']), discount: numeric, taxLabel: short, tax: numeric,
  shipping: numeric, paid: numeric, notes: text, terms: text, payment: text,
  createdAt: z.number().finite(), updatedAt: z.number().finite(),
}).refine(i => new Set(i.items.map(item => item.id)).size === i.items.length, 'Duplicate item IDs');
export const backupSchema = z.object({
  app: z.literal('invoice-studio'), version: z.literal(1),
  invoices: z.array(invoiceSchema).max(1000),
  profiles: z.array(z.object({ id: short.min(1), ...partySchema.shape })).max(100),
}).refine(b => new Set(b.invoices.map(i => i.id)).size === b.invoices.length, 'Duplicate invoice IDs')
  .refine(b => new Set(b.profiles.map(i => i.id)).size === b.profiles.length, 'Duplicate profile IDs');

export type Party = z.infer<typeof partySchema>;
export type Item = z.infer<typeof itemSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type Backup = z.infer<typeof backupSchema>;
export type Profile = Backup['profiles'][number];
export type Language = Invoice['language'];
export const STORAGE_KEY = 'rezaprama:invoice-studio:v1';
export const uid = () => crypto.randomUUID();
export const emptyParty = (): Party => ({ name: '', email: '', address: '', phone: '', taxId: '', logo: '' });
export const emptyItem = (): Item => ({ id: uid(), description: '', quantity: '1', unit: '', rate: '' });
export const localDate = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
export function nextNumber(invoices: Invoice[]) {
  const prefix = `INV-${new Date().getFullYear()}-`;
  const highest = invoices.reduce((max, i) => i.number.startsWith(prefix) && /^\d{1,12}$/.test(i.number.slice(prefix.length))
    ? Math.max(max, Number(i.number.slice(prefix.length))) : max, 0);
  let number = `${prefix}${String(highest + 1).padStart(3, '0')}`;
  while (invoices.some(i => i.number === number)) number += '-1';
  return number;
}
export function createInvoice(invoices: Invoice[], sender?: Party, language: Language = 'id'): Invoice {
  const due = new Date(); due.setDate(due.getDate() + 14);
  return {
    id: uid(), number: nextNumber(invoices), title: 'Invoice', issued: localDate(), due: localDate(due),
    currency: language === 'id' ? 'IDR' : 'USD', language, status: 'draft', sender: sender ? { ...sender } : emptyParty(),
    client: emptyParty(), items: [emptyItem()], discountType: 'percent', discount: '', taxLabel: language === 'id' ? 'Pajak' : 'Tax',
    tax: '', shipping: '', paid: '', notes: '', terms: '', payment: '', createdAt: Date.now(), updatedAt: Date.now(),
  };
}
export const decimal = (v: string) => new Decimal(v || '0');
export const digits = (currency: string) => ['IDR', 'JPY', 'KRW', 'VND'].includes(currency) ? 0 : ['KWD', 'BHD'].includes(currency) ? 3 : 2;
export function totals(invoice: Invoice) {
  const places = digits(invoice.currency);
  const round = (v: Decimal) => v.toDecimalPlaces(places);
  const lines = invoice.items.map(i => round(decimal(i.quantity).mul(decimal(i.rate))));
  const subtotal = lines.reduce((sum, v) => sum.add(v), new Decimal(0));
  const discount = round(Decimal.min(subtotal, invoice.discountType === 'percent'
    ? subtotal.mul(Decimal.min(decimal(invoice.discount), 100)).div(100) : decimal(invoice.discount)));
  const tax = round(subtotal.sub(discount).mul(Decimal.min(decimal(invoice.tax), 100)).div(100));
  const shipping = round(decimal(invoice.shipping));
  const total = subtotal.sub(discount).add(tax).add(shipping);
  const paid = invoice.status === 'paid' ? total : round(decimal(invoice.paid));
  const balance = Decimal.max(0, total.sub(paid));
  const credit = Decimal.max(0, paid.sub(total));
  return { lines, subtotal, discount, tax, shipping, total, paid, balance, credit };
}
export const money = (amount: Decimal | string, invoice: Pick<Invoice, 'currency' | 'language'>, code = false) =>
  new Intl.NumberFormat(invoice.language === 'id' ? 'id-ID' : 'en-US', {
    style: 'currency', currency: invoice.currency, currencyDisplay: code ? 'code' : 'symbol',
    minimumFractionDigits: digits(invoice.currency), maximumFractionDigits: digits(invoice.currency),
  // Modern Intl accepts exact decimal strings; avoid converting money to a binary float.
  }).format(amount.toString() as unknown as number);
export const formatDate = (date: string, language: Language) => date ? new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-GB', {
  day: 'numeric', month: 'short', year: 'numeric',
}).format(new Date(`${date}T12:00:00`)) : '';
export function validateInvoice(invoice: Invoice, all: Invoice[], language = invoice.language) {
  const errors: string[] = [];
  const id = language === 'id';
  if (!invoice.sender.name.trim()) errors.push(id ? 'Isi nama pengirim.' : 'Enter sender name.');
  if (!invoice.client.name.trim()) errors.push(id ? 'Isi nama klien.' : 'Enter client name.');
  if (!invoice.number.trim()) errors.push(id ? 'Isi nomor invoice.' : 'Enter invoice number.');
  if (all.some(i => i.id !== invoice.id && i.number.trim() === invoice.number.trim())) errors.push(id ? 'Nomor invoice sudah digunakan.' : 'Invoice number already exists.');
  if (!invoice.issued || (invoice.due && invoice.due < invoice.issued)) errors.push(id ? 'Periksa tanggal. Jatuh tempo tidak boleh sebelum tanggal terbit.' : 'Check dates. Due date cannot precede issue date.');
  if (!invoice.items.length) errors.push(id ? 'Tambahkan minimal satu item.' : 'Add at least one item.');
  if (invoice.items.some(i => !i.description.trim() || decimal(i.quantity).lte(0) || i.rate === '')) errors.push(id ? 'Lengkapi deskripsi, jumlah lebih dari 0, dan harga setiap item.' : 'Each item needs a description, quantity above 0, and a rate.');
  if (decimal(invoice.tax).gt(100) || (invoice.discountType === 'percent' && decimal(invoice.discount).gt(100))) errors.push(id ? 'Persentase maksimal 100%.' : 'Percentages cannot exceed 100%.');
  if (invoice.discountType === 'fixed' && decimal(invoice.discount).gt(totals(invoice).subtotal)) errors.push(id ? 'Diskon melebihi subtotal.' : 'Discount exceeds subtotal.');
  for (const p of [invoice.sender, invoice.client]) if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) errors.push(id ? 'Periksa format email.' : 'Check email format.');
  return errors;
}
export const emptyBackup = (): Backup => ({ app: 'invoice-studio', version: 1, invoices: [], profiles: [] });
export function parseBackup(input: string): Backup {
  if (input.length > 20_000_000) throw new Error('Backup exceeds 20 MB');
  return backupSchema.parse(JSON.parse(input));
}
export function mergeBackup(current: Backup, imported: Backup): Backup {
  return backupSchema.parse({ ...current,
    invoices: [...current.invoices, ...imported.invoices.filter(i => !current.invoices.some(c => c.id === i.id))],
    profiles: [...current.profiles, ...imported.profiles.filter(i => !current.profiles.some(c => c.id === i.id))],
  });
}
export function download(content: Blob, filename: string) {
  const url = URL.createObjectURL(content);
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
export const safeFilename = (name: string) => name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 120) || 'invoice';
