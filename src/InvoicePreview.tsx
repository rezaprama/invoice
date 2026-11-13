import type { Invoice, Party } from './model';
import { formatDate, money, totals } from './model';
import { messages } from './i18n';

export function PartyBlock({ party, placeholder }: { party: Party; placeholder: string }) {
  return <div className="party-block">
    <strong className={!party.name ? 'placeholder' : ''}>{party.name || placeholder}</strong>
    {party.address && <p>{party.address}</p>}
    {party.email && <p>{party.email}</p>}
    {party.phone && <p>{party.phone}</p>}
    {party.taxId && <p>Tax ID: {party.taxId}</p>}
  </div>;
}

export function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const t = messages(invoice.language);
  const sum = totals(invoice);
  return <article className="invoice-paper" aria-label={t.preview} lang={invoice.language}>
    <header className="paper-heading">
      <div>
        {invoice.sender.logo && <img className="invoice-logo" src={invoice.sender.logo} alt={invoice.sender.name || t.sender} width="120" height="56" />}
        <h2>{invoice.title || 'Invoice'}</h2>
        <p className="paper-number">{invoice.number || 'INV-000'}</p>
      </div>
      <div className="paper-dates">
        <div><span>{t.issued}</span><strong>{formatDate(invoice.issued, invoice.language)}</strong></div>
        {invoice.due && <div><span>{t.due}</span><strong>{formatDate(invoice.due, invoice.language)}</strong></div>}
        {invoice.status !== 'draft' && <p className="paper-status">{t[invoice.status]}</p>}
      </div>
    </header>
    <div className="paper-parties">
      <section><h3>{t.sender}</h3><PartyBlock party={invoice.sender} placeholder={t.previewEmpty} /></section>
      <section><h3>{t.billTo}</h3><PartyBlock party={invoice.client} placeholder={t.clientEmpty} /></section>
    </div>
    <table className="paper-table">
      <thead><tr><th>{t.description}</th><th>{t.quantity}</th><th>{t.rate}</th><th>{t.amount}</th></tr></thead>
      <tbody>{invoice.items.length ? invoice.items.map((item, index) => <tr key={item.id}>
        <td className={!item.description ? 'placeholder' : ''}>{item.description || t.itemEmpty}</td>
        <td>{item.quantity || '0'}{item.unit && <span className="unit-text"> {item.unit}</span>}</td>
        <td>{money(item.rate || '0', invoice)}</td><td>{money(sum.lines[index], invoice)}</td>
      </tr>) : <tr><td colSpan={4} className="placeholder">{t.noItems}</td></tr>}</tbody>
    </table>
    <div className="paper-summary">
      <dl>
        <div><dt>{t.subtotal}</dt><dd>{money(sum.subtotal, invoice)}</dd></div>
        {!sum.discount.isZero() && <div><dt>{t.discount}{invoice.discountType === 'percent' ? ` (${invoice.discount}%)` : ''}</dt><dd>−{money(sum.discount, invoice)}</dd></div>}
        {!sum.tax.isZero() && <div><dt>{invoice.taxLabel || t.tax} ({invoice.tax}%)</dt><dd>{money(sum.tax, invoice)}</dd></div>}
        {!sum.shipping.isZero() && <div><dt>{t.shipping}</dt><dd>{money(sum.shipping, invoice)}</dd></div>}
        {!sum.paid.isZero() && <><div><dt>{t.total}</dt><dd>{money(sum.total, invoice)}</dd></div><div><dt>{t.amountPaid}</dt><dd>−{money(sum.paid, invoice)}</dd></div></>}
        <div className="paper-balance"><dt>{t.balance}</dt><dd>{money(sum.balance, invoice)}</dd></div>
        {!sum.credit.isZero() && <div><dt>{t.credit}</dt><dd>{money(sum.credit, invoice)}</dd></div>}
      </dl>
    </div>
    <footer className="paper-footer">
      {invoice.payment && <section><h3>{t.payment}</h3><p>{invoice.payment}</p></section>}
      {invoice.notes && <section><h3>{t.notes}</h3><p>{invoice.notes}</p></section>}
      {invoice.terms && <section><h3>{t.terms}</h3><p>{invoice.terms}</p></section>}
    </footer>
  </article>;
}
