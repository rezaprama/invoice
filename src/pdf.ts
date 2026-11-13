import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { formatDate, money as formatMoney, safeFilename, totals, type Invoice, type Party } from './model';
import { messages } from './i18n';

let fonts: Promise<string[]> | undefined;
const money: typeof formatMoney = (...args) => formatMoney(...args).replace(/[\u00a0\u202f]/g, ' ');
function loadFonts() {
  fonts ??= Promise.all(['Regular', 'Bold'].map(async weight => {
    const response = await fetch(`${import.meta.env.BASE_URL}fonts/NotoSans-${weight}.ttf`);
    if (!response.ok) throw new Error('PDF font unavailable');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  })).catch(error => { fonts = undefined; throw error; });
  return fonts;
}
export async function createPdf(invoice: Invoice) {
  const t = messages(invoice.language);
  const sum = totals(invoice);
  const [regular, bold] = await loadFonts();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS('NotoSans-Regular.ttf', regular); doc.addFont('NotoSans-Regular.ttf', 'Noto', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', bold); doc.addFont('NotoSans-Bold.ttf', 'Noto', 'bold');
  doc.setFont('Noto'); doc.setTextColor(32, 39, 33);
  doc.setProperties({ title: `${invoice.title || 'Invoice'} ${invoice.number}`, author: invoice.sender.name, creator: 'Invoice Studio' });
  let y = 20;
  if (invoice.sender.logo) {
    const image = doc.getImageProperties(invoice.sender.logo);
    const scale = Math.min(36 / image.width, 18 / image.height);
    doc.addImage(invoice.sender.logo, 'PNG', 18, y, image.width * scale, image.height * scale);
    y += image.height * scale + 8;
  }
  const headingY = y;
  doc.setFontSize(29);
  const heading: string[] = doc.splitTextToSize(invoice.title || 'Invoice', 100);
  doc.text(heading, 18, y + 9);
  y += heading.length * 12 + 5;
  doc.setFontSize(10); doc.setTextColor(96, 105, 97);
  const number: string[] = doc.splitTextToSize(invoice.number, 100);
  doc.text(number, 18, y); y += number.length * 5;
  let dateY = headingY + 3;
  for (const [label, value] of [[t.issued, formatDate(invoice.issued, invoice.language)], ...(invoice.due ? [[t.due, formatDate(invoice.due, invoice.language)]] : [])]) {
    doc.setFontSize(8); doc.text(label, 192, dateY, { align: 'right' });
    doc.setFontSize(10); doc.setTextColor(32, 39, 33); doc.text(value, 192, dateY + 6, { align: 'right' });
    doc.setTextColor(96, 105, 97); dateY += 17;
  }
  if (invoice.status !== 'draft') { doc.setFontSize(9); doc.text(t[invoice.status], 192, dateY + 2, { align: 'right' }); dateY += 8; }
  y = Math.max(y, dateY) + 8;
  doc.setDrawColor(32, 39, 33); doc.setLineWidth(.5); doc.line(18, y, 192, y);
  const styles = { font: 'Noto', fontSize: 9, textColor: [32, 39, 33] as [number, number, number], cellPadding: 3.5, overflow: 'linebreak' as const };
  const margin = { left: 18, right: 18, top: 18, bottom: 20 };
  const partyText = (p: Party) => [p.name, p.address, p.email, p.phone, p.taxId ? `Tax ID: ${p.taxId}` : ''].filter(Boolean).join('\n');
  autoTable(doc, {
    startY: y + 7, margin, theme: 'plain', styles,
    head: [[t.sender, t.billTo]], body: [[partyText(invoice.sender), partyText(invoice.client)]],
    headStyles: { fontSize: 8, fontStyle: 'normal', textColor: [96, 105, 97] },
    columnStyles: { 0: { cellWidth: 87 }, 1: { cellWidth: 87 } },
  });
  const lastY = () => (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(doc, {
    startY: lastY() + 12, margin, theme: 'plain', styles, rowPageBreak: 'avoid',
    head: [[t.description, t.quantity, t.rate, t.amount]],
    body: invoice.items.map((item, index) => [item.description, `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`, money(item.rate || '0', invoice, true), money(sum.lines[index], invoice, true)]),
    headStyles: { fillColor: [244, 246, 244], textColor: [96, 105, 97], fontStyle: 'normal', fontSize: 8, halign: 'right' },
    columnStyles: { 0: { cellWidth: 75, halign: 'left' }, 1: { cellWidth: 21, halign: 'right' }, 2: { cellWidth: 39, halign: 'right' }, 3: { cellWidth: 39, halign: 'right' } },
    didParseCell: cell => { if (cell.section === 'head' && cell.column.index === 0) cell.cell.styles.halign = 'left'; },
    willDrawCell: cell => { if (cell.section === 'body') { doc.setDrawColor(223, 227, 223); doc.setLineWidth(.15); doc.line(cell.cell.x, cell.cell.y + cell.cell.height, cell.cell.x + cell.cell.width, cell.cell.y + cell.cell.height); } },
  });
  const summary: string[][] = [[t.subtotal, money(sum.subtotal, invoice, true)]];
  if (!sum.discount.isZero()) summary.push([`${t.discount}${invoice.discountType === 'percent' ? ` (${invoice.discount}%)` : ''}`, `−${money(sum.discount, invoice, true)}`]);
  if (!sum.tax.isZero()) summary.push([`${invoice.taxLabel || t.tax} (${invoice.tax}%)`, money(sum.tax, invoice, true)]);
  if (!sum.shipping.isZero()) summary.push([t.shipping, money(sum.shipping, invoice, true)]);
  if (!sum.paid.isZero()) summary.push([t.total, money(sum.total, invoice, true)], [t.amountPaid, `−${money(sum.paid, invoice, true)}`]);
  const balanceIndex = summary.length;
  summary.push([t.balance, money(sum.balance, invoice, true)]);
  if (!sum.credit.isZero()) summary.push([t.credit, money(sum.credit, invoice, true)]);
  autoTable(doc, {
    startY: lastY() + 10, margin: { ...margin, left: 90 }, theme: 'plain', styles: { ...styles, cellPadding: 2.5 }, pageBreak: 'avoid', body: summary,
    columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: 54, halign: 'right' } },
    didParseCell: cell => { if (cell.row.index === balanceIndex) { cell.cell.styles.fontStyle = 'bold'; cell.cell.styles.fontSize = 12; cell.cell.styles.cellPadding = { top: 6, bottom: 4, left: 2.5, right: 2.5 }; } },
    willDrawCell: cell => { if (cell.row.index === balanceIndex) { doc.setDrawColor(32, 39, 33); doc.setLineWidth(.5); doc.line(cell.cell.x, cell.cell.y, cell.cell.x + cell.cell.width, cell.cell.y); } },
  });
  for (const [label, value] of [[t.payment, invoice.payment], [t.notes, invoice.notes], [t.terms, invoice.terms]]) {
    if (!value) continue;
    autoTable(doc, {
      startY: lastY() + 10, margin, theme: 'plain', styles: { ...styles, cellPadding: 0 },
      head: [[label]], body: [[value]],
      headStyles: { fontSize: 8, fontStyle: 'normal', textColor: [96, 105, 97], cellPadding: { top: 0, bottom: 3, left: 0, right: 0 } },
    });
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFontSize(8); doc.setTextColor(96, 105, 97);
    const footer = doc.splitTextToSize(invoice.number, 130) as string[];
    doc.text(footer[0], 18, 286); doc.text(`${page} / ${pages}`, 192, 286, { align: 'right' });
  }
  doc.save(`${safeFilename(invoice.number)}.pdf`);
}
