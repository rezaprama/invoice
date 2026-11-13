import { useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, CopyIcon, ImageIcon, PlusIcon, TrashIcon, XIcon } from '@phosphor-icons/react';
import { InlineNumber, InlineText } from './InlineField';
import { money, totals, uid, type Invoice, type Item, type Language, type Party } from './model';
import type { Messages } from './i18n';
import { messages } from './i18n';

type Props = {
  invoice: Invoice; ui: Messages; uiLanguage: Language; update: (patch: Partial<Invoice>) => void;
  updateItem: (id: string, patch: Partial<Item>) => void; addItem: (after?: Item) => void;
  removeItem: (item: Item, index: number) => void; moveItem: (index: number, direction: number) => void;
  addTemplate: (kind: string) => void; chooseLogo: () => void;
};
function PartyEditor({ party, onChange, t, sender }: { party: Party; onChange: (patch: Partial<Party>) => void; t: Messages; sender: boolean }) {
  return <div className="party-fields">
    <InlineText label={t.name} value={party.name} onChange={name => onChange({ name })} placeholder={sender ? t.senderName : t.clientName} className="party-name" />
    <InlineText label={t.address} value={party.address} onChange={address => onChange({ address })} multiline />
    <InlineText label={t.email} value={party.email} onChange={email => onChange({ email })} type="email" />
    <InlineText label={t.phone} value={party.phone} onChange={phone => onChange({ phone })} type="tel" />
    <InlineText label={t.taxId} value={party.taxId} onChange={taxId => onChange({ taxId })} />
  </div>;
}
export function InvoiceEditor({ invoice, ui, uiLanguage, update, updateItem, addItem, removeItem, moveItem, addTemplate, chooseLogo }: Props) {
  const t = messages(invoice.language);
  const sum = totals(invoice);
  const [discountOpen, setDiscountOpen] = useState(!!invoice.discount);
  const [shippingOpen, setShippingOpen] = useState(!!invoice.shipping);
  const [paidOpen, setPaidOpen] = useState(!!invoice.paid);
  const options = [[!discountOpen, ui.discount, () => setDiscountOpen(true)], [!shippingOpen, ui.shipping, () => setShippingOpen(true)], [!paidOpen && invoice.status !== 'paid', ui.amountPaid, () => setPaidOpen(true)]] as const;
  return <form className="invoice-paper editable-paper" aria-label={ui.editDocument} autoComplete="off" onSubmit={event => event.preventDefault()} lang={invoice.language}>
    <div className="document-logo-row">
      <div className="logo-upload">{invoice.sender.logo ? <><button type="button" className="logo-image-button" aria-label={ui.changeLogo} onClick={chooseLogo}><img className="invoice-logo" src={invoice.sender.logo} alt={invoice.sender.name || t.sender} width="120" height="56" /></button><button type="button" className="icon-button danger-text" aria-label={ui.removeLogo} onClick={() => update({ sender: { ...invoice.sender, logo: '' } })}><XIcon size={16} /></button></>
        : <button type="button" className="logo-placeholder" onClick={chooseLogo}><ImageIcon size={19} /><span>{ui.logo}</span></button>}</div>
      <span className="paper-currency">{invoice.currency} · A4</span>
    </div>
    <header className="paper-heading" id="section-01">
      <div className="document-identity"><h2><InlineText label={ui.title} value={invoice.title} onChange={title => update({ title })} placeholder="Invoice" className="invoice-title" /></h2><InlineText label={ui.number} value={invoice.number} onChange={number => update({ number })} placeholder="INV-001" className="invoice-number" />{invoice.status !== 'draft' && <span className="paper-status">{t[invoice.status]}</span>}</div>
      <div className="paper-dates">
        <label><span>{t.issued}</span><input aria-label={ui.issued} type="date" className="inline-field" value={invoice.issued} autoComplete="off" onChange={e => { if (e.target.value.length === 10 && e.target.validity.valid) update({ issued: e.target.value }); }} /></label>
        <label><span>{t.due}</span><input aria-label={ui.due} type="date" className="inline-field" value={invoice.due} min={invoice.issued} autoComplete="off" onChange={e => { if (!e.target.value || (e.target.value.length === 10 && e.target.validity.valid)) update({ due: e.target.value }); }} /></label>
      </div>
    </header>
    <div className="paper-parties">
      <section id="section-02" aria-label={ui.sender}><h3>{t.sender}</h3><PartyEditor party={invoice.sender} t={ui} sender onChange={patch => update({ sender: { ...invoice.sender, ...patch } })} /></section>
      <section id="section-03" aria-label={ui.client}><h3>{t.billTo}</h3><PartyEditor party={invoice.client} t={ui} sender={false} onChange={patch => update({ client: { ...invoice.client, ...patch } })} /></section>
    </div>
    <section className="document-details" aria-label={ui.detailTitle}>
      {invoice.details.length > 0 && <div className="details-grid">{invoice.details.map((detail, index) => <div key={detail.key} className="document-detail" data-detail={detail.key}>
        <div className="detail-heading"><InlineText label={`${ui.detailLabel} ${index + 1}`} value={detail.label[invoice.language]} maxLength={80} onChange={value => update({ details: invoice.details.map(field => field.key === detail.key ? { ...field, label: { ...field.label, [invoice.language]: value } } : field) })} className="detail-name" /><button type="button" className="icon-button" aria-label={`${ui.removeDetail} ${index + 1}`} onClick={() => update({ details: invoice.details.filter(field => field.key !== detail.key) })}><XIcon size={14} /></button></div>
        <InlineText label={detail.label[uiLanguage] || ui.detailValue} value={detail.value} placeholder={ui.detailValue} onChange={value => update({ details: invoice.details.map(field => field.key === detail.key ? { ...field, value } : field) })} multiline />
      </div>)}</div>}
      <button type="button" className="text-button" disabled={invoice.details.length >= 24} onClick={() => update({ details: [...invoice.details, { key: uid(), label: { id: 'Detail tambahan', en: 'Additional detail' }, value: '' }] })}><PlusIcon size={13} />{ui.addDetail}</button>
    </section>
    <section className="document-items" id="section-04" aria-label={ui.items}>
      <div className="items-heading" aria-hidden="true"><span>{t.description}</span><span>{t.quantity}</span><span>{t.rate}</span><span>{t.amount}</span></div>
      <div className="line-items">{invoice.items.map((item, index) => <div className="line-item" key={item.id} data-item={item.id}>
        <div className="item-description"><span className="item-index">{String(index + 1).padStart(2, '0')}</span><InlineText label={ui.description} value={item.description} onChange={description => updateItem(item.id, { description })} placeholder={ui.descriptionPlaceholder} multiline /></div>
        <div className="item-quantity"><span className="mobile-cell-label">{t.quantity}</span><InlineNumber label={ui.quantity} value={item.quantity} onChange={quantity => updateItem(item.id, { quantity })} /><InlineText label={ui.unit} value={item.unit} onChange={unit => updateItem(item.id, { unit })} placeholder={ui.unit} className="item-unit" /></div>
        <div className="item-rate"><span className="mobile-cell-label">{t.rate}</span><InlineNumber label={`${ui.rate} (${invoice.currency})`} value={item.rate} onChange={rate => updateItem(item.id, { rate })} invoice={invoice} currency /></div>
        <div className="item-total"><span className="mobile-cell-label">{t.amount}</span><output>{money(sum.lines[index], invoice)}</output></div>
        <div className="item-tools">
          <button type="button" className="icon-button" aria-label={`${ui.moveUp} ${index + 1}`} title={ui.moveUp} disabled={index === 0} onClick={() => moveItem(index, -1)}><ArrowUpIcon size={16} /></button>
          <button type="button" className="icon-button" aria-label={`${ui.moveDown} ${index + 1}`} title={ui.moveDown} disabled={index === invoice.items.length - 1} onClick={() => moveItem(index, 1)}><ArrowDownIcon size={16} /></button>
          <button type="button" className="icon-button" aria-label={`${ui.duplicateItem} ${index + 1}`} title={ui.duplicateItem} onClick={() => addItem(item)}><CopyIcon size={16} /></button>
          <button type="button" className="icon-button danger-text" aria-label={`${ui.removeItem} ${index + 1}`} title={ui.removeItem} onClick={() => removeItem(item, index)}><TrashIcon size={16} /></button>
        </div>
      </div>)}</div>
      {!invoice.items.length && <p className="empty-items">{ui.noItems}</p>}
      <div className="add-item-row"><button type="button" className="button add-item-button" onClick={() => addItem()}><PlusIcon size={17} />{ui.addItem}</button><label className="template-picker"><span className="sr-only">{ui.template}</span><select aria-label={ui.template} value="" onChange={e => addTemplate(e.target.value)}><option value="">{ui.template}</option><option value="design">{ui.design}</option><option value="software">{ui.software}</option><option value="general">{ui.general}</option></select></label></div>
      <p className="field-hint">{ui.numberHelp}</p>
    </section>
    <section className="paper-summary" id="section-05" aria-label={ui.adjustments}><div className="summary-content">
      <dl>
        <div><dt>{t.subtotal}</dt><dd>{money(sum.subtotal, invoice)}</dd></div>
        {discountOpen && <div className="adjustment-row"><dt>{t.discount}<button type="button" className="remove-adjustment" aria-label={ui.removeDiscount} onClick={() => { update({ discount: '' }); setDiscountOpen(false); }}><XIcon size={13} /></button></dt><dd><div className="adjustment-inputs"><InlineNumber label={ui.discount} value={invoice.discount} onChange={discount => update({ discount })} /><select aria-label={ui.discountType} value={invoice.discountType} className="inline-select" onChange={e => update({ discountType: e.target.value as Invoice['discountType'] })}><option value="percent">%</option><option value="fixed">{invoice.currency}</option></select></div><small>−{money(sum.discount, invoice)}</small></dd></div>}
        <div className="adjustment-row tax-row"><dt><InlineText label={ui.taxLabel} value={invoice.taxLabel} onChange={taxLabel => update({ taxLabel })} placeholder={t.tax} /></dt><dd><div className="adjustment-inputs"><InlineNumber label={ui.taxRate} value={invoice.tax} onChange={tax => update({ tax })} /><span>%</span></div><small>{money(sum.tax, invoice)}</small></dd></div>
        {shippingOpen && <div className="adjustment-row"><dt>{t.shipping}<button type="button" className="remove-adjustment" aria-label={ui.removeShipping} onClick={() => { update({ shipping: '' }); setShippingOpen(false); }}><XIcon size={13} /></button></dt><dd><InlineNumber label={`${ui.shipping} (${invoice.currency})`} value={invoice.shipping} onChange={shipping => update({ shipping })} invoice={invoice} currency /></dd></div>}
        {(paidOpen || invoice.status === 'paid') && <><div><dt>{t.total}</dt><dd>{money(sum.total, invoice)}</dd></div><div className="adjustment-row"><dt>{t.amountPaid}{invoice.status !== 'paid' && <button type="button" className="remove-adjustment" aria-label={ui.removePaid} onClick={() => { update({ paid: '' }); setPaidOpen(false); }}><XIcon size={13} /></button>}</dt><dd><InlineNumber label={`${ui.amountPaid} (${invoice.currency})`} value={invoice.status === 'paid' ? sum.paid.toString() : invoice.paid} onChange={paid => update({ paid })} invoice={invoice} currency disabled={invoice.status === 'paid'} /></dd></div></>}
        <div className="paper-balance"><dt>{t.balance}</dt><dd>{money(sum.balance, invoice)}</dd></div>
        {!sum.credit.isZero() && <div><dt>{t.credit}</dt><dd>{money(sum.credit, invoice)}</dd></div>}
      </dl>
      <div className="adjustment-actions">{options.map(([visible, label, action]) => visible && <button type="button" className="text-button" key={label} onClick={action}><PlusIcon size={13} />{label}</button>)}</div>
      <p className="field-hint">{ui.taxHelp}</p>
    </div></section>
    <footer className="paper-footer" id="section-06">
      {(['payment', 'notes', 'terms'] as const).map(key => <section key={key}><h3>{t[key]}</h3><InlineText label={ui[key]} value={invoice[key]} onChange={value => update({ [key]: value })} multiline placeholder={ui[`${key}Placeholder`]} /></section>)}
    </footer>
  </form>;
}
