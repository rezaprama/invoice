import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInvoice, emptyBackup, localDate, mergeBackup, money, nextNumber, parseBackup, totals, validateInvoice } from '../src/model';

function valid() {
  const invoice = createInvoice([]);
  invoice.sender.name = 'Pengirim'; invoice.client.name = 'Klien';
  invoice.items[0] = { ...invoice.items[0], description: 'Layanan', quantity: '3', rate: '0.1' };
  invoice.currency = 'USD';
  return invoice;
}
test('decimal line amounts and percentages have no binary rounding drift', () => {
  const invoice = valid(); invoice.discount = '10'; invoice.tax = '11'; invoice.shipping = '1.05'; invoice.paid = '0.35';
  const result = totals(invoice);
  assert.equal(result.subtotal.toFixed(2), '0.30'); assert.equal(result.discount.toFixed(2), '0.03');
  assert.equal(result.tax.toFixed(2), '0.03'); assert.equal(result.total.toFixed(2), '1.35'); assert.equal(result.balance.toFixed(2), '1.00');
});
test('currency display preserves precision above the safe integer range', () => {
  assert.equal(money('999999999999999999.99', { currency: 'USD', language: 'en' }), '$999,999,999,999,999,999.99');
});
test('line rounding follows selected currency, including rupiah and dinar', () => {
  const invoice = valid(); invoice.items[0].rate = '100.125'; invoice.items[0].quantity = '2.5';
  invoice.currency = 'IDR'; assert.equal(totals(invoice).total.toString(), '250');
  invoice.currency = 'USD'; assert.equal(totals(invoice).total.toString(), '250.31');
  invoice.currency = 'KWD'; assert.equal(totals(invoice).total.toString(), '250.313');
});
test('fixed discounts, tax base, overpayments, and paid state', () => {
  const invoice = valid(); invoice.items[0].rate = '100'; invoice.items[0].quantity = '1';
  invoice.discountType = 'fixed'; invoice.discount = '20'; invoice.tax = '10'; invoice.shipping = '5'; invoice.paid = '100';
  assert.equal(totals(invoice).total.toString(), '93'); assert.equal(totals(invoice).balance.toString(), '0'); assert.equal(totals(invoice).credit.toString(), '7');
  invoice.status = 'paid'; assert.equal(totals(invoice).paid.toString(), '93'); assert.equal(totals(invoice).credit.toString(), '0');
});
test('incomplete invoices persist but cannot export; percentages and duplicate numbers rejected', () => {
  const invoice = valid(); assert.deepEqual(validateInvoice(invoice, [invoice]), []);
  invoice.tax = '101'; invoice.items[0].quantity = '0'; invoice.due = '2000-01-01';
  const duplicate = { ...valid(), number: invoice.number };
  assert.equal(validateInvoice(invoice, [invoice, duplicate]).length, 4);
  const draft = createInvoice([]); assert.doesNotThrow(() => parseBackup(JSON.stringify({ ...emptyBackup(), invoices: [draft] })));
});
test('numbering avoids collisions and does not depend on invoice count', () => {
  const one = valid(); one.number = `INV-${new Date().getFullYear()}-099`;
  assert.equal(nextNumber([one]), `INV-${new Date().getFullYear()}-100`);
  assert.equal(localDate(new Date(2026, 10, 13)), '2026-11-13');
});
test('backup validation rejects impossible dates, dangerous image types, duplicate IDs, and excessive numeric values', () => {
  const invoice = valid(); const wrap = () => JSON.stringify({ ...emptyBackup(), invoices: [invoice] });
  invoice.issued = '2026-02-30'; assert.throws(() => parseBackup(wrap())); invoice.issued = '2026-02-28';
  invoice.sender.logo = 'data:image/svg+xml,<svg/>'; assert.throws(() => parseBackup(wrap())); invoice.sender.logo = '';
  invoice.items[0].rate = '1e100'; assert.throws(() => parseBackup(wrap())); invoice.items[0].rate = '1';
  invoice.items.push({ ...invoice.items[0] }); assert.throws(() => parseBackup(wrap())); invoice.items.pop();
  assert.throws(() => parseBackup(JSON.stringify({ ...emptyBackup(), invoices: [invoice, invoice] })));
  assert.throws(() => parseBackup('{broken'));
});
test('backup merge preserves local records and includes new records; round-trip is lossless', () => {
  const one = valid(); const two = valid();
  const local = { ...emptyBackup(), invoices: [one] };
  const incoming = { ...emptyBackup(), invoices: [{ ...one, number: 'modified externally' }, two] };
  const merged = mergeBackup(local, incoming);
  assert.equal(merged.invoices.length, 2); assert.equal(merged.invoices[0].number, one.number);
  assert.deepEqual(parseBackup(JSON.stringify(merged)), merged);
});
test('empty item collection, free items, and full discounts are calculated correctly', () => {
  const invoice = valid(); invoice.items = []; assert.equal(totals(invoice).total.toString(), '0');
  invoice.items = [valid().items[0]]; invoice.items[0].rate = '0'; assert.deepEqual(validateInvoice(invoice, [invoice]), []);
  invoice.items[0].rate = '100'; invoice.discount = '100'; invoice.tax = '11'; assert.equal(totals(invoice).total.toString(), '0');
});
