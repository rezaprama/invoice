import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInvoice } from '../src/model';
import { applyFormat, templates } from '../src/templates';

test('twenty bilingual formats have unique IDs, valid fields, independent items and no invented rates', () => {
  assert.equal(templates.length, 20); assert.equal(new Set(templates.map(t => t.id)).size, 20);
  for (const template of templates) for (const language of ['id', 'en'] as const) {
    const invoice = applyFormat(createInvoice(language), template, true);
    assert.ok(template.name[language]); assert.equal(invoice.title, template.title[language]);
    assert.equal(invoice.items.length, template.items.length);
    assert.equal(new Set(invoice.items.map(i => i.id)).size, invoice.items.length);
    assert.ok(invoice.items.every(i => i.description && i.unit && i.rate === ''));
    assert.equal(new Set(invoice.details.map(d => d.key)).size, invoice.details.length);
    assert.ok(invoice.details.every(d => d.label.id && d.label.en && d.value === ''));
    assert.equal(invoice.tax, ''); assert.equal(invoice.terms, ''); assert.equal(invoice.payment, '');
  }
});
test('personal formats use only supplied names and city; no invented legal credentials or bank data', () => {
  const kos = templates.filter(t => t.id.startsWith('kost_'));
  const legal = templates.filter(t => t.id.startsWith('legal_'));
  assert.equal(kos.length, 3); assert.equal(legal.length, 3);
  for (const t of kos) { const i = applyFormat(createInvoice(), t, true); assert.equal(i.sender.name, 'Kos Zania'); assert.equal(i.sender.address, 'Tangerang'); assert.equal(i.sender.taxId, ''); }
  for (const t of legal) { const i = applyFormat(createInvoice(), t, true); assert.equal(i.sender.name, 'Sriyani Suhartati'); assert.equal(i.sender.address, ''); assert.equal(i.sender.phone, ''); assert.equal(i.payment, ''); }
});
test('format switches preserve user identity, titles, priced items and filled details by default', () => {
  const current = createInvoice(); current.sender.name = 'Nama saya'; current.client.name = 'Klien saya'; current.title = 'Judul saya';
  current.items[0].description = 'Pekerjaan asli'; current.items[0].rate = '123456';
  current.details = Array.from({ length: 24 }, (_, index) => ({ key: `custom-${index}`, label: { id: `Label ${index}`, en: `Label ${index}` }, value: `Value ${index}` }));
  const result = applyFormat(current, templates[0], false);
  assert.equal(result.sender.name, 'Nama saya'); assert.equal(result.client.name, 'Klien saya'); assert.equal(result.title, 'Judul saya');
  assert.deepEqual(result.items, current.items);
  for (const detail of current.details) assert.deepEqual(result.details.find(d => d.key === detail.key), detail);
  assert.equal(current.details.length, 24); assert.equal(current.formatId, 'blank');
});
test('known automatic sender defaults change between personal formats, while custom changes survive', () => {
  const kos = templates.find(t => t.id === 'kost_monthly')!; const law = templates.find(t => t.id === 'legal_consultation')!;
  const initial = applyFormat(createInvoice(), kos, true);
  const legal = applyFormat(initial, law, true);
  assert.equal(legal.sender.name, 'Sriyani Suhartati'); assert.equal(legal.sender.address, '');
  initial.sender.name = 'Nama kustom'; initial.sender.address = 'Alamat kustom';
  const custom = applyFormat(initial, law, true);
  assert.equal(custom.sender.name, 'Nama kustom'); assert.equal(custom.sender.address, 'Alamat kustom');
});
test('matching custom detail labels survive switches; replacing items clears rates and keeps details', () => {
  const first = applyFormat(createInvoice(), templates[0], true);
  first.details[0].value = 'Proyek uji'; first.details[0].label.id = 'Nama pekerjaan khusus'; first.items[0].rate = '999';
  const second = applyFormat(first, templates.find(t => t.id === 'architecture')!, true);
  assert.equal(second.details.find(d => d.key === 'project')?.label.id, 'Nama pekerjaan khusus');
  assert.equal(second.details.find(d => d.key === 'project')?.value, 'Proyek uji');
  assert.ok(second.items.every(i => i.rate === '')); assert.equal(first.items[0].rate, '999');
});
