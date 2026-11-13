import { useEffect, useRef, useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, ArrowSquareOutIcon, ArrowCounterClockwiseIcon, CaretDownIcon, CopyIcon, DownloadSimpleIcon, FileTextIcon, ImageIcon, ListBulletsIcon, PlusIcon, TrashIcon, XIcon } from '@phosphor-icons/react';
import { createInvoice, currencies, emptyItem, money, totals, uid, validateInvoice, type Invoice, type Item, type Language } from './model';
import { messages } from './i18n';
import { Field, Modal, NumberField, PartyFields, Section } from './FormParts';
import { InvoicePreview } from './InvoicePreview';

type Toast = { text: string; action?: () => void; error?: boolean };
type Theme = 'system' | 'light' | 'dark';

export function App() {
  const [invoice, setInvoice] = useState(() => createInvoice());
  const [language, setLanguage] = useState<Language>('id');
  const [theme, setTheme] = useState<Theme>('system');
  const [mobilePreview, setMobilePreview] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [resetting, setResetting] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfBusyRef = useRef(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const sum = totals(invoice);
  const t = messages(language);

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), toast.error ? 12_000 : 8_000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => { document.documentElement.lang = language; }, [language]);

  function notify(text: string, action?: () => void, error = false) { setToast({ text, action, error }); }
  function update(patch: Partial<Invoice>) { setInvoice(current => ({ ...current, ...patch })); }
  function updateItem(id: string, patch: Partial<Item>) { setInvoice(current => ({ ...current, items: current.items.map(i => i.id === id ? { ...i, ...patch } : i) })); }
  function addItem(after?: Item) {
    if (invoice.items.length >= 500) return notify(t.limit, undefined, true);
    const item = after ? { ...after, id: uid() } : emptyItem();
    setInvoice(current => {
      const items = [...current.items]; items.splice(after ? items.findIndex(i => i.id === after.id) + 1 : items.length, 0, item);
      return { ...current, items };
    });
    requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(`[data-item="${item.id}"] textarea`)?.focus());
  }
  function removeItem(item: Item, index: number) {
    const invoiceId = invoice.id;
    setInvoice(current => ({ ...current, items: current.items.filter(i => i.id !== item.id) }));
    notify(t.itemRemoved, () => setInvoice(current => {
      if (current.id !== invoiceId || current.items.some(i => i.id === item.id) || current.items.length >= 500) return current;
      const items = [...current.items]; items.splice(Math.min(index, items.length), 0, item); return { ...current, items };
    }));
  }
  function moveItem(index: number, direction: number) {
    setInvoice(current => {
      const items = [...current.items]; const target = index + direction;
      if (target < 0 || target >= items.length) return current;
      [items[index], items[target]] = [items[target], items[index]]; return { ...current, items };
    });
  }
  function addTemplate(kind: string) {
    if (!kind) return;
    const descriptions: Record<string, string[]> = language === 'id' ? {
      design: ['Riset & konsep desain', 'Desain final & revisi'], software: ['Pengembangan website', 'Pengujian & peluncuran'], general: ['Jasa profesional'],
    } : { design: ['Research & design concept', 'Final design & revisions'], software: ['Website development', 'Testing & launch'], general: ['Professional services'] };
    const items = invoice.items.filter(i => i.description || i.rate);
    if (items.length + descriptions[kind].length > 500) return notify(t.limit, undefined, true);
    update({ items: [...items, ...descriptions[kind].map(description => ({ ...emptyItem(), description }))] }); notify(t.example);
  }
  async function uploadLogo(file?: File) {
    const invoiceId = invoice.id;
    if (!file) return;
    try {
      if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2_000_000) throw new Error();
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas'); const scale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const logo = canvas.toDataURL('image/png'); if (logo.length > 200_000) throw new Error();
      setInvoice(current => current.id === invoiceId ? { ...current, sender: { ...current.sender, logo } } : current);
    } catch { notify(t.logoFailed, undefined, true); }
  }
  async function exportPdf() {
    if (pdfBusyRef.current) return;
    const validation = validateInvoice(invoice, language);
    if (validation.length) { setErrors(validation); return; }
    pdfBusyRef.current = true; setPdfBusy(true);
    try { const { createPdf } = await import('./pdf'); await createPdf(invoice); }
    catch { notify(t.pdfFailed, undefined, true); }
    finally { pdfBusyRef.current = false; setPdfBusy(false); }
  }

  return <>
    <a className="skip-link" href="#main">{language === 'id' ? 'Lewati ke konten' : 'Skip to content'}</a>
    <div className="app-shell">
      <header className="topbar"><a className="wordmark" href="#main">invoice<span>studio</span><span className="wordmark-dot">.</span></a>
        <div className="topbar-settings"><label className="theme-select"><span className="sr-only">{t.theme}</span><select aria-label={t.theme} value={theme} onChange={e => setTheme(e.target.value as Theme)}><option value="system">{t.system}</option><option value="light">{t.light}</option><option value="dark">{t.dark}</option></select></label><label className="language-select"><span className="sr-only">{t.language}</span><select aria-label={t.language} value={language} onChange={e => setLanguage(e.target.value as Language)}><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></label></div>
      </header>
      <main id="main" className="main-content">
        <div className="page-heading"><div><h1>{t.editInvoice}</h1><p>{t.subtitle}</p></div><div className="document-actions">
          <button type="button" className="button reset-button" onClick={() => setResetting(true)} disabled={pdfBusy}><ArrowCounterClockwiseIcon size={17} />{t.reset}</button>
          <button type="button" className="button primary" onClick={exportPdf} disabled={pdfBusy}><DownloadSimpleIcon size={18} />{pdfBusy ? t.preparing : t.downloadPdf}</button>
        </div></div>
        <div className="mobile-view-tabs"><button type="button" className={!mobilePreview ? 'selected' : ''} onClick={() => setMobilePreview(false)}><ListBulletsIcon size={18} />{t.edit}</button><button type="button" className={mobilePreview ? 'selected' : ''} onClick={() => setMobilePreview(true)}><FileTextIcon size={18} />{t.preview}</button></div>
        <div className={`workspace ${mobilePreview ? 'show-preview' : ''}`}>
          <form className="editor-pane" autoComplete="off" onSubmit={e => e.preventDefault()}>
            <div className="editor-status"><FileTextIcon size={15} /><span>{t.sessionOnly}</span><span className="session-hint">{t.refreshClears}</span></div>
            <nav className="editor-outline" aria-label={language === 'id' ? 'Bagian invoice' : 'Invoice sections'}>{[['01', language === 'id' ? 'Detail' : 'Details'], ['02', t.sender], ['03', language === 'id' ? 'Klien' : 'Client'], ['04', language === 'id' ? 'Item' : 'Items'], ['06', language === 'id' ? 'Pembayaran' : 'Payment']].map(([id, label]) => <a key={id} href={`#section-${id}`}>{label}</a>)}</nav>
            <Section n="01" title={t.details}><div className="field-grid">
              <Field label={t.number}><input value={invoice.number} maxLength={200} onChange={e => update({ number: e.target.value })} /></Field>
              <Field label={t.title}><input value={invoice.title} maxLength={200} placeholder="Invoice" onChange={e => update({ title: e.target.value })} /></Field>
              <Field label={t.issued}><input type="date" value={invoice.issued} onChange={e => { if (e.target.value && e.target.validity.valid && e.target.value.length === 10) update({ issued: e.target.value }); }} /></Field>
              <Field label={t.due}><input type="date" value={invoice.due} min={invoice.issued} onChange={e => { if (!e.target.value || (e.target.validity.valid && e.target.value.length === 10)) update({ due: e.target.value }); }} /></Field>
              <Field label={t.currency}><select value={invoice.currency} onChange={e => update({ currency: e.target.value as Invoice['currency'] })}>{currencies.map(c => <option key={c}>{c}</option>)}</select></Field>
              <Field label={t.status}><select value={invoice.status} onChange={e => update({ status: e.target.value as Invoice['status'] })}><option value="draft">{t.draft}</option><option value="sent">{t.sent}</option><option value="paid">{t.paid}</option></select></Field>
              <Field label={t.documentLanguage} className="span-2"><select value={invoice.language} onChange={e => update({ language: e.target.value as Language })}><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></Field>
            </div></Section>
            <Section n="02" title={t.sender}><PartyFields party={invoice.sender} update={patch => setInvoice(current => ({ ...current, sender: { ...current.sender, ...patch } }))} t={t} sender />
              <div className="logo-upload">{invoice.sender.logo && <img src={invoice.sender.logo} alt={invoice.sender.name || t.sender} width="64" height="44" />}<button type="button" className="button small" onClick={() => logoRef.current?.click()}><ImageIcon size={17} />{t.logo}</button>{invoice.sender.logo && <button type="button" className="icon-button" aria-label={t.removeLogo} onClick={() => update({ sender: { ...invoice.sender, logo: '' } })}><XIcon size={17} /></button>}<span>{t.logoHelp}</span></div>
            </Section>
            <Section n="03" title={t.client}><PartyFields party={invoice.client} update={patch => setInvoice(current => ({ ...current, client: { ...current.client, ...patch } }))} t={t} sender={false} /></Section>
            <Section n="04" title={t.items}>
              <div className="line-items">{!invoice.items.length && <div className="empty-items">{t.noItems}</div>}{invoice.items.map((item, index) => <div key={item.id} className="line-item" data-item={item.id}>
                <div className="item-topline"><span className="item-index">{String(index + 1).padStart(2, '0')}</span><div className="item-tools">
                  <button type="button" className="icon-button" aria-label={`${t.moveUp} ${index + 1}`} title={t.moveUp} disabled={index === 0} onClick={() => moveItem(index, -1)}><ArrowUpIcon size={16} /></button>
                  <button type="button" className="icon-button" aria-label={`${t.moveDown} ${index + 1}`} title={t.moveDown} disabled={index === invoice.items.length - 1} onClick={() => moveItem(index, 1)}><ArrowDownIcon size={16} /></button>
                  <button type="button" className="icon-button" aria-label={`${t.duplicateItem} ${index + 1}`} title={t.duplicateItem} onClick={() => addItem(item)}><CopyIcon size={16} /></button>
                  <button type="button" className="icon-button danger-text" aria-label={`${t.removeItem} ${index + 1}`} title={t.removeItem} onClick={() => removeItem(item, index)}><TrashIcon size={16} /></button>
                </div></div>
                <Field label={t.description}><textarea rows={2} value={item.description} maxLength={5000} placeholder={t.descriptionPlaceholder} onChange={e => updateItem(item.id, { description: e.target.value })} /></Field>
                <div className="item-numbers"><NumberField label={t.quantity} value={item.quantity} onChange={quantity => updateItem(item.id, { quantity })} /><Field label={t.unit}><input value={item.unit} maxLength={200} placeholder={t.unitPlaceholder} onChange={e => updateItem(item.id, { unit: e.target.value })} /></Field><NumberField label={`${t.rate} (${invoice.currency})`} value={item.rate} onChange={rate => updateItem(item.id, { rate })} /></div>
                <div className="item-total"><span>{t.amount}</span><strong>{money(sum.lines[index], invoice)}</strong></div>
              </div>)}</div>
              <p className="field-hint">{t.numberHelp}</p>
              <div className="add-item-row"><button type="button" className="button add-item-button" onClick={() => addItem()}><PlusIcon size={18} />{t.addItem}</button><label className="template-picker"><span className="sr-only">{t.template}</span><select aria-label={t.template} value="" onChange={e => addTemplate(e.target.value)}><option value="">{t.template}</option><option value="design">{t.design}</option><option value="software">{t.software}</option><option value="general">{t.general}</option></select><CaretDownIcon size={14} /></label></div>
            </Section>
            <Section n="05" title={t.adjustments}><div className="field-grid">
              <NumberField label={t.discount} value={invoice.discount} onChange={discount => update({ discount })} suffix={invoice.discountType === 'percent' ? '%' : invoice.currency} />
              <Field label={t.discountType}><select value={invoice.discountType} onChange={e => update({ discountType: e.target.value as Invoice['discountType'] })}><option value="percent">{t.percent}</option><option value="fixed">{t.fixed}</option></select></Field>
              <Field label={t.taxLabel}><input value={invoice.taxLabel} maxLength={200} onChange={e => update({ taxLabel: e.target.value })} /></Field><NumberField label={t.taxRate} value={invoice.tax} onChange={tax => update({ tax })} />
              <NumberField label={`${t.shipping} (${invoice.currency})`} value={invoice.shipping} onChange={shipping => update({ shipping })} /><NumberField label={`${t.amountPaid} (${invoice.currency})`} value={invoice.status === 'paid' ? sum.paid.toString() : invoice.paid} disabled={invoice.status === 'paid'} onChange={paid => update({ paid })} />
            </div><p className="field-hint">{t.taxHelp}</p></Section>
            <Section n="06" title={t.notesPayment}><div className="stack-fields">
              <Field label={t.payment}><textarea rows={3} value={invoice.payment} maxLength={5000} placeholder={t.paymentPlaceholder} onChange={e => update({ payment: e.target.value })} /></Field><Field label={t.notes}><textarea rows={2} value={invoice.notes} maxLength={5000} placeholder={t.notesPlaceholder} onChange={e => update({ notes: e.target.value })} /></Field><Field label={t.terms}><textarea rows={2} value={invoice.terms} maxLength={5000} placeholder={t.termsPlaceholder} onChange={e => update({ terms: e.target.value })} /></Field>
            </div></Section>
            <div className="editor-footer"><p>{t.localOnly}</p><button type="button" className="button primary" onClick={exportPdf} disabled={pdfBusy}><DownloadSimpleIcon size={17} />{pdfBusy ? t.preparing : t.downloadPdf}</button></div>
          </form>
          <aside className="preview-pane" tabIndex={0} aria-label={t.preview}><div className="preview-toolbar"><span><FileTextIcon size={16} />{t.preview}</span><span>A4 · {invoice.currency}</span></div><InvoicePreview invoice={invoice} /><div className="preview-bottom"><span>{t.previewHint}</span><span>{invoice.items.length} {language === 'id' ? 'item' : 'items'}</span></div></aside>
        </div>
        <footer className="site-footer"><span>Invoice Studio · Reza Prama</span><a href="https://github.com/rezaprama/invoice" target="_blank" rel="noreferrer">GitHub <ArrowSquareOutIcon size={13} /></a></footer>
      </main>
    </div>
    <input className="sr-only" tabIndex={-1} ref={logoRef} type="file" accept="image/png,image/jpeg" aria-label={t.logo} onChange={e => { uploadLogo(e.target.files?.[0]); e.target.value = ''; }} />
    {toast && <div className={`toast ${toast.error ? 'toast-error' : ''}`} role="status"><span>{toast.text}</span>{toast.action && <button type="button" onClick={() => { toast.action?.(); setToast(null); }}><ArrowCounterClockwiseIcon size={16} />{t.undo}</button>}<button type="button" className="icon-button" aria-label={t.close} onClick={() => setToast(null)}><XIcon size={17} /></button></div>}
    {errors && <Modal title={t.validation} closeLabel={t.close} onClose={() => setErrors(null)}><ul className="validation-errors">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul><div className="modal-actions"><button type="button" className="button primary" onClick={() => { setErrors(null); setMobilePreview(false); }}>{t.edit}</button></div></Modal>}
    {resetting && <Modal title={t.resetTitle} closeLabel={t.close} onClose={() => setResetting(false)}><p>{t.resetHint}</p><div className="modal-actions"><button type="button" className="button" onClick={() => setResetting(false)}>{t.cancel}</button><button type="button" className="button danger" onClick={() => { setInvoice(createInvoice(language)); setResetting(false); setMobilePreview(false); setToast(null); window.scrollTo({ top: 0 }); }}>{t.reset}</button></div></Modal>}
  </>;
}
