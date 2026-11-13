import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export const currencies = ['IDR', 'USD', 'EUR', 'GBP', 'SGD', 'AUD', 'MYR', 'JPY', 'CNY', 'HKD', 'CAD', 'CHF', 'INR', 'KRW', 'THB', 'PHP', 'VND', 'AED', 'SAR', 'NZD', 'BHD', 'KWD'] as const;
export type Language = 'id' | 'en';
export type Party = { name: string; email: string; address: string; phone: string; taxId: string; logo: string };
export type Item = { id: string; description: string; quantity: string; unit: string; rate: string };
export type Invoice = {
  id: string; number: string; title: string; issued: string; due: string;
  currency: typeof currencies[number]; language: Language; status: 'draft' | 'sent' | 'paid';
  sender: Party; client: Party; items: Item[]; discountType: 'percent' | 'fixed';
  discount: string; taxLabel: string; tax: string; shipping: string; paid: string;
  notes: string; terms: string; payment: string;
};
export const uid = () => crypto.randomUUID();
export const emptyParty = (): Party => ({ name: '', email: '', address: '', phone: '', taxId: '', logo: '' });
export const emptyItem = (): Item => ({ id: uid(), description: '', quantity: '1', unit: '', rate: '' });
export const localDate = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
export function createInvoice(language: Language = 'id'): Invoice {
  const due = new Date(); due.setDate(due.getDate() + 14);
  return {
    id: uid(), number: `INV-${new Date().getFullYear()}-001`, title: 'Invoice', issued: localDate(), due: localDate(due),
    currency: language === 'id' ? 'IDR' : 'USD', language, status: 'draft', sender: emptyParty(), client: emptyParty(),
    items: [emptyItem()], discountType: 'percent', discount: '', taxLabel: language === 'id' ? 'Pajak' : 'Tax',
    tax: '', shipping: '', paid: '', notes: '', terms: '', payment: '',
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
export function validateInvoice(invoice: Invoice, language = invoice.language) {
  const errors: string[] = [];
  const id = language === 'id';
  if (!invoice.sender.name.trim()) errors.push(id ? 'Isi nama pengirim.' : 'Enter sender name.');
  if (!invoice.client.name.trim()) errors.push(id ? 'Isi nama klien.' : 'Enter client name.');
  if (!invoice.number.trim()) errors.push(id ? 'Isi nomor invoice.' : 'Enter invoice number.');
  if (!invoice.issued || (invoice.due && invoice.due < invoice.issued)) errors.push(id ? 'Periksa tanggal. Jatuh tempo tidak boleh sebelum tanggal terbit.' : 'Check dates. Due date cannot precede issue date.');
  if (!invoice.items.length) errors.push(id ? 'Tambahkan minimal satu item.' : 'Add at least one item.');
  if (invoice.items.some(i => !i.description.trim() || decimal(i.quantity).lte(0) || i.rate === '')) errors.push(id ? 'Lengkapi deskripsi, jumlah lebih dari 0, dan harga setiap item.' : 'Each item needs a description, quantity above 0, and a rate.');
  if (decimal(invoice.tax).gt(100) || (invoice.discountType === 'percent' && decimal(invoice.discount).gt(100))) errors.push(id ? 'Persentase maksimal 100%.' : 'Percentages cannot exceed 100%.');
  if (invoice.discountType === 'fixed' && decimal(invoice.discount).gt(totals(invoice).subtotal)) errors.push(id ? 'Diskon melebihi subtotal.' : 'Discount exceeds subtotal.');
  for (const p of [invoice.sender, invoice.client]) if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) errors.push(id ? 'Periksa format email.' : 'Check email format.');
  return errors;
}
export const safeFilename = (name: string) => name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 120) || 'invoice';
