import { useEffect, useRef, useState } from 'react';
import { ArrowSquareOutIcon, ArrowCounterClockwiseIcon, DownloadSimpleIcon, PencilSimpleIcon, XIcon } from '@phosphor-icons/react';
import { createInvoice, currencies, emptyItem, uid, validateInvoice, type Invoice, type Item, type Language } from './model';
import { messages } from './i18n';
import { Modal } from './FormParts';
import { InvoiceEditor } from './InvoiceEditor';
import { applyFormat, categories, templates, type InvoiceTemplate } from './templates';

type Toast = { text: string; action?: () => void; error?: boolean };
type Theme = 'system' | 'light' | 'dark';

export function App() {
  const [invoice, setInvoice] = useState(() => createInvoice());
  const [language, setLanguage] = useState<Language>('id');
  const [theme, setTheme] = useState<Theme>('system');
  const [toast, setToast] = useState<Toast | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [resetting, setResetting] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<InvoiceTemplate | null>(null);
  const [replaceFormatItems, setReplaceFormatItems] = useState(false);
  const pdfBusyRef = useRef(false);
  const logoRef = useRef<HTMLInputElement>(null);
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
  function chooseFormat(id: string) {
    if (id === 'blank') { update({ formatId: 'blank' }); return; }
    const format = templates.find(entry => entry.id === id);
    if (!format) return;
    if (invoice.items.some(item => item.description.trim() || item.rate !== '')) {
      setPendingFormat(format); setReplaceFormatItems(false);
    } else { setInvoice(current => applyFormat(current, format, true)); notify(t.formatApplied); }
  }
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
        <div className="page-heading"><div><h1>{t.editInvoice}</h1><p>{t.subtitle}</p></div><div className="document-actions"><button type="button" className="button reset-button" onClick={() => setResetting(true)} disabled={pdfBusy}><ArrowCounterClockwiseIcon size={17} />{t.reset}</button><button type="button" className="button primary" onClick={exportPdf} disabled={pdfBusy}><DownloadSimpleIcon size={18} />{pdfBusy ? t.preparing : t.downloadPdf}</button></div></div>
        <div className="document-toolbar" aria-label={t.documentSettings}>
          <label className="format-picker"><span>{t.format}</span><select aria-label={t.format} value={invoice.formatId} onChange={e => chooseFormat(e.target.value)}><option value="blank">{t.blankFormat}</option>{(Object.keys(categories) as (keyof typeof categories)[]).map(category => <optgroup key={category} label={categories[category][language]}>{templates.filter(format => format.category === category).map(format => <option key={format.id} value={format.id}>{format.name[language]}</option>)}</optgroup>)}</select></label>
          <label><span>{t.currency}</span><select aria-label={t.currency} value={invoice.currency} onChange={e => update({ currency: e.target.value as Invoice['currency'] })}>{currencies.map(c => <option key={c}>{c}</option>)}</select></label>
          <label><span>{t.documentLanguage}</span><select aria-label={t.documentLanguage} value={invoice.language} onChange={e => update({ language: e.target.value as Language })}><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></label>
          <label><span>{t.status}</span><select aria-label={t.status} value={invoice.status} onChange={e => update({ status: e.target.value as Invoice['status'] })}><option value="draft">{t.draft}</option><option value="sent">{t.sent}</option><option value="paid">{t.paid}</option></select></label>
          <div className="document-hint"><PencilSimpleIcon size={16} /><span>{t.clickToEdit}</span></div>
        </div>
        <div className="session-notice"><span>{t.sessionOnly}</span><span>{t.refreshClears}</span></div>
        <div className="workspace"><InvoiceEditor key={invoice.id} invoice={invoice} ui={t} uiLanguage={language} update={update} updateItem={updateItem} addItem={addItem} removeItem={removeItem} moveItem={moveItem} addTemplate={addTemplate} chooseLogo={() => logoRef.current?.click()} /></div>
        <div className="document-bottom"><span>{t.localOnly}</span><button type="button" className="button primary" onClick={exportPdf} disabled={pdfBusy}><DownloadSimpleIcon size={17} />{pdfBusy ? t.preparing : t.downloadPdf}</button></div>
        <footer className="site-footer"><span>Invoice Studio · Reza Prama</span><a href="https://github.com/rezaprama/invoice" target="_blank" rel="noreferrer">GitHub <ArrowSquareOutIcon size={13} /></a></footer>
      </main>
    </div>
    <input className="sr-only" tabIndex={-1} ref={logoRef} type="file" accept="image/png,image/jpeg" aria-label={t.logo} onChange={e => { uploadLogo(e.target.files?.[0]); e.target.value = ''; }} />
    {toast && <div className={`toast ${toast.error ? 'toast-error' : ''}`} role="status"><span>{toast.text}</span>{toast.action && <button type="button" onClick={() => { toast.action?.(); setToast(null); }}><ArrowCounterClockwiseIcon size={16} />{t.undo}</button>}<button type="button" className="icon-button" aria-label={t.close} onClick={() => setToast(null)}><XIcon size={17} /></button></div>}
    {errors && <Modal title={t.validation} closeLabel={t.close} onClose={() => setErrors(null)}><ul className="validation-errors">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul><div className="modal-actions"><button type="button" className="button primary" onClick={() => { setErrors(null); document.querySelector<HTMLInputElement>('#section-02 input')?.focus(); }}>{t.edit}</button></div></Modal>}
    {resetting && <Modal title={t.resetTitle} closeLabel={t.close} onClose={() => setResetting(false)}><p>{t.resetHint}</p><div className="modal-actions"><button type="button" className="button" onClick={() => setResetting(false)}>{t.cancel}</button><button type="button" className="button danger" onClick={() => { setInvoice(createInvoice(language)); setResetting(false); setToast(null); window.scrollTo({ top: 0 }); }}>{t.reset}</button></div></Modal>}
    {pendingFormat && <Modal title={t.formatConfirm} closeLabel={t.close} onClose={() => setPendingFormat(null)}><p><strong>{pendingFormat.name[language]}</strong></p><p>{t.formatHint}</p><label className="checkbox-label"><input type="checkbox" checked={replaceFormatItems} onChange={e => setReplaceFormatItems(e.target.checked)} />{t.replaceExamples}</label><ul className="format-examples">{pendingFormat.items.map((item, index) => <li key={index}>{item.description[language]} · {item.unit[language]}</li>)}</ul><p>{t.examplesOnly}</p><div className="modal-actions"><button type="button" className="button" onClick={() => setPendingFormat(null)}>{t.cancel}</button><button type="button" className="button primary" onClick={() => { setInvoice(current => applyFormat(current, pendingFormat, replaceFormatItems)); setPendingFormat(null); notify(t.formatApplied); }}>{t.applyFormat}</button></div></Modal>}
  </>;
}
