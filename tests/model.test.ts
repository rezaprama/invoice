import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInvoice, localDate, money, totals, validateInvoice } from '../src/model';

function valid() {
  const invoice = createInvoice(); invoice.sender.name = 'Pengirim'; invoice.client.name = 'Klien';
  invoice.items[0] = { ...invoice.items[0], description: 'Layanan', quantity: '3', rate: '0.1' }; invoice.currency = 'USD';
  return invoice;
}
test('decimal arithmetic stays exact with discount, tax, charges and partial payment', () => {
  const invoice = valid(); invoice.discount = '10'; invoice.tax = '11'; invoice.shipping = '1.05'; invoice.paid = '0.35';
  const result = totals(invoice);
  assert.equal(result.subtotal.toFixed(2), '0.30'); assert.equal(result.discount.toFixed(2), '0.03');
  assert.equal(result.tax.toFixed(2), '0.03'); assert.equal(result.total.toFixed(2), '1.35'); assert.equal(result.balance.toFixed(2), '1.00');
});
test('currency display preserves precision above the safe integer range', () => {
  assert.equal(money('999999999999999999.99', { currency: 'USD', language: 'en' }), '$999,999,999,999,999,999.99');
});
test('line rounding follows rupiah, dollar, and dinar precision', () => {
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
test('incomplete invoices, invalid percentages and reversed dates cannot export', () => {
  const invoice = valid(); assert.deepEqual(validateInvoice(invoice), []);
  invoice.tax = '101'; invoice.items[0].quantity = '0'; invoice.due = '2000-01-01';
  assert.equal(validateInvoice(invoice).length, 3);
  assert.ok(validateInvoice(createInvoice()).length > 0);
  invoice.tax = '0'; invoice.items[0].quantity = '1'; invoice.due = ''; invoice.sender.email = 'bad-email';
  assert.equal(validateInvoice(invoice).length, 1);
});
test('each fresh invoice has independent sender, client and item state', () => {
  const one = valid(); const two = createInvoice();
  one.sender.name = 'Changed'; one.items[0].description = 'Changed';
  assert.equal(two.sender.name, ''); assert.equal(two.client.name, ''); assert.equal(two.items[0].description, '');
  assert.notEqual(one.id, two.id); assert.notEqual(one.items[0].id, two.items[0].id);
  assert.equal(createInvoice('en').currency, 'USD'); assert.equal(localDate(new Date(2026, 10, 13)), '2026-11-13');
});
test('empty items, free items and full discounts have correct totals', () => {
  const invoice = valid(); invoice.items = []; assert.equal(totals(invoice).total.toString(), '0');
  invoice.items = [valid().items[0]]; invoice.items[0].rate = '0'; assert.deepEqual(validateInvoice(invoice), []);
  invoice.items[0].rate = '100'; invoice.discount = '100'; invoice.tax = '11'; assert.equal(totals(invoice).total.toString(), '0');
});
