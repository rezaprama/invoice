import { Children, cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import {
  ArrowDownIcon, ArrowUpIcon, ArrowSquareOutIcon, ArrowCounterClockwiseIcon, CheckIcon,
  CaretDownIcon, CopyIcon, DownloadSimpleIcon, FileTextIcon, FolderOpenIcon, HardDrivesIcon,
  ImageIcon, ListBulletsIcon, PlusIcon, PrinterIcon, TrashIcon, UploadSimpleIcon,
  UsersIcon, XIcon, WarningCircleIcon, MagnifyingGlassIcon,
} from '@phosphor-icons/react';
import {
  STORAGE_KEY, createInvoice, currencies, download, emptyBackup, emptyItem, localDate, mergeBackup,
  money, nextNumber, parseBackup, safeFilename, totals, uid, validateInvoice,
  type Backup, type Invoice, type Item, type Language, type Party,
} from './model';
import { messages, type Messages } from './i18n';
import { InvoicePreview } from './InvoicePreview';

type Page = 'editor' | 'history' | 'profiles' | 'backup';
type Toast = { text: string; action?: () => void; error?: boolean };
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { return { data: parseBackup(raw), raw: '', blocked: false }; }
      catch { return { data: emptyBackup(), raw, blocked: true }; }
    }
    return { data: { ...emptyBackup(), invoices: [createInvoice([])] }, raw: '', blocked: false };
  } catch { return { data: { ...emptyBackup(), invoices: [createInvoice([])] }, raw: '', blocked: false }; }
}
function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  const labelId = useId();
  const attachLabel = (nodes: ReactNode): ReactNode => Children.map(nodes, node => {
    if (!isValidElement(node)) return node;
    const child = node as ReactElement<{ children?: ReactNode; 'aria-labelledby'?: string }>;
    if (['input', 'textarea', 'select'].includes(String(child.type))) return cloneElement(child, { 'aria-labelledby': labelId });
    return child.props.children ? cloneElement(child, { children: attachLabel(child.props.children) }) : child;
  });
  return <label className={`field ${className}`}><span id={labelId}>{label}</span>{attachLabel(children)}</label>;
}
function NumberField({ label, value, onChange, suffix, disabled }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; disabled?: boolean }) {
  return <Field label={label}><span className="number-wrap"><input type="text" inputMode="decimal" value={value} placeholder="0" disabled={disabled}
    onChange={e => { const val = e.target.value.replace(',', '.'); if (/^(?:\d{1,12}(?:\.\d{0,4})?|)$/.test(val)) onChange(val); }} />{suffix && <span>{suffix}</span>}</span></Field>;
}
function Section({ n, title, children, aside }: { n: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return <section className="form-section" id={`section-${n}`}><div className="section-heading"><h2><span>{n}</span>{title}</h2>{aside}</div>{children}</section>;
}
function Modal({ title, children, onClose, closeLabel }: { title: string; children: ReactNode; onClose: () => void; closeLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current!; el.showModal(); return () => el.close(); }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
    <header><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label={closeLabel} onClick={onClose}><XIcon size={20} /></button></header>
    {children}
  </dialog>;
}
function PartyFields({ party, update, t, sender }: { party: Party; update: (p: Partial<Party>) => void; t: Messages; sender: boolean }) {
  return <div className="field-grid">
    <Field label={t.name} className="span-2"><input value={party.name} maxLength={200} placeholder={sender ? t.senderName : t.clientName} onChange={e => update({ name: e.target.value })} autoComplete="organization" /></Field>
    <Field label={t.email}><input type="email" value={party.email} maxLength={200} placeholder="nama@contoh.com" onChange={e => update({ email: e.target.value })} /></Field>
    <Field label={t.phone}><input type="tel" value={party.phone} maxLength={200} placeholder="+62" onChange={e => update({ phone: e.target.value })} /></Field>
    <Field label={t.address} className="span-2"><textarea rows={2} value={party.address} maxLength={5000} placeholder={t.address} onChange={e => update({ address: e.target.value })} /></Field>
    <Field label={t.taxId} className="span-2"><input value={party.taxId} maxLength={200} placeholder={t.optional} onChange={e => update({ taxId: e.target.value })} /></Field>
  </div>;
}

export function App() {
  const [initial] = useState(load);
  const [data, setData] = useState<Backup>(initial.data);
  const [activeId, setActiveId] = useState(() => {
    try { const selected = sessionStorage.getItem('invoice-studio:active'); if (initial.data.invoices.some(i => i.id === selected)) return selected!; } catch { /* Private sessions may block preferences. */ }
    return initial.data.invoices[0]?.id || '';
  });
  const [language, setLanguage] = useState<Language>(initial.data.invoices.find(i => i.id === activeId)?.language || 'id');
  const [page, setPage] = useState<Page>('editor');
  const [mobilePreview, setMobilePreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [corrupt, setCorrupt] = useState(initial.blocked);
  const [recovered, setRecovered] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [incoming, setIncoming] = useState<Backup | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [theme, setTheme] = useState(() => { try { const stored = localStorage.getItem('invoice-studio:theme'); return stored && ['system', 'light', 'dark'].includes(stored) ? stored : 'system'; } catch { return 'system'; } });
  const importRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const invoice = data.invoices.find(i => i.id === activeId);
  const sum = invoice ? totals(invoice) : null;
  const t = messages(language);
  const dataRef = useRef(data); dataRef.current = data;
  const blockedRef = useRef(corrupt || conflict); blockedRef.current = corrupt || conflict;
  const unsavedRef = useRef(false);

  const notify = useCallback((text: string, action?: () => void, error = false) => setToast({ text, action, error }), []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), toast.error ? 12_000 : 8_000); return () => clearTimeout(timer); }, [toast]);
  const persist = useCallback(() => {
    if (blockedRef.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dataRef.current)); setSaved(true); setStorageError(false); unsavedRef.current = false; }
    catch { setStorageError(true); setSaved(false); unsavedRef.current = true; }
  }, []);
  useEffect(() => {
    if (corrupt || conflict) return;
    setSaved(false); unsavedRef.current = true;
    const timer = setTimeout(persist, 300);
    return () => clearTimeout(timer);
  }, [data, corrupt, conflict, persist]);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden' && unsavedRef.current) persist(); };
    const unload = (e: BeforeUnloadEvent) => { if (unsavedRef.current) { persist(); if (unsavedRef.current) { e.preventDefault(); e.returnValue = ''; } } };
    const otherTab = (e: StorageEvent) => { if ((e.key === STORAGE_KEY || e.key === null) && e.newValue !== JSON.stringify(dataRef.current)) { blockedRef.current = true; setConflict(true); } };
    document.addEventListener('visibilitychange', hide); window.addEventListener('beforeunload', unload); window.addEventListener('storage', otherTab);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('beforeunload', unload); window.removeEventListener('storage', otherTab); };
  }, [persist]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    apply(); media.addEventListener('change', apply);
    try { localStorage.setItem('invoice-studio:theme', theme); } catch { /* Preferences can remain session-only. */ }
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => { try { sessionStorage.setItem('invoice-studio:active', activeId); } catch { /* Selection can remain session-only. */ } }, [activeId]);

  function update(patch: Partial<Invoice>) {
    setData(current => ({ ...current, invoices: current.invoices.map(i => i.id === activeId ? { ...i, ...patch, updatedAt: Date.now() } : i) }));
  }
  function addInvoice(source?: Invoice) {
    if (data.invoices.length >= 1000) return notify(t.limit, undefined, true);
    const fresh = source ? { ...structuredClone(source), id: uid(), number: nextNumber(data.invoices), status: 'draft' as const, paid: '', createdAt: Date.now(), updatedAt: Date.now() }
      : createInvoice(data.invoices, invoice?.sender || data.profiles[0], language);
    if (!source && invoice) { fresh.payment = invoice.payment; fresh.terms = invoice.terms; fresh.currency = invoice.currency; }
    setData(current => ({ ...current, invoices: [fresh, ...current.invoices] }));
    setActiveId(fresh.id); setLanguage(fresh.language); setPage('editor'); setMobilePreview(false);
    window.scrollTo({ top: 0 });
  }
  function updateItem(id: string, patch: Partial<Item>) { if (invoice) update({ items: invoice.items.map(i => i.id === id ? { ...i, ...patch } : i) }); }
  function addItem(after?: Item) {
    if (!invoice) return;
    if (invoice.items.length >= 500) return notify(t.limit, undefined, true);
    const item = after ? { ...after, id: uid() } : emptyItem();
    const index = after ? invoice.items.findIndex(i => i.id === after.id) + 1 : invoice.items.length;
    const items = [...invoice.items]; items.splice(index, 0, item); update({ items });
    requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(`[data-item="${item.id}"] textarea`)?.focus());
  }
  function removeItem(item: Item, index: number) {
    if (!invoice) return;
    const invoiceId = invoice.id;
    update({ items: invoice.items.filter(i => i.id !== item.id) });
    notify(t.itemRemoved, () => setData(current => ({ ...current, invoices: current.invoices.map(i => {
      if (i.id !== invoiceId || i.items.some(x => x.id === item.id) || i.items.length >= 500) return i;
      const items = [...i.items]; items.splice(Math.min(index, items.length), 0, item); return { ...i, items, updatedAt: Date.now() };
    }) })));
  }
  function moveItem(index: number, direction: number) {
    if (!invoice) return;
    const items = [...invoice.items]; const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]]; update({ items });
  }
  function addTemplate(kind: string) {
    if (!invoice || !kind) return;
    const descriptions: Record<string, string[]> = language === 'id' ? {
      design: ['Riset & konsep desain', 'Desain final & revisi'], software: ['Pengembangan website', 'Pengujian & peluncuran'], general: ['Jasa profesional'],
    } : { design: ['Research & design concept', 'Final design & revisions'], software: ['Website development', 'Testing & launch'], general: ['Professional services'] };
    const items = invoice.items.filter(i => i.description || i.rate);
    if (items.length + descriptions[kind].length > 500) return notify(t.limit, undefined, true);
    update({ items: [...items, ...descriptions[kind].map(description => ({ ...emptyItem(), description }))] }); notify(t.example);
  }
  function saveProfile() {
    if (!invoice?.sender.name.trim()) return notify(t.profileRequired, undefined, true);
    const existing = data.profiles.find(p => p.name.trim().toLowerCase() === invoice.sender.name.trim().toLowerCase());
    if (!existing && data.profiles.length >= 100) return notify(t.limit, undefined, true);
    setData(current => ({ ...current, profiles: existing ? current.profiles.map(p => p.id === existing.id ? { ...invoice.sender, id: p.id } : p) : [...current.profiles, { ...invoice.sender, id: uid() }] }));
    notify(t.profileSaved);
  }
  async function uploadLogo(file?: File) {
    const target = invoice?.id;
    if (!file || !target) return;
    try {
      if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2_000_000) throw new Error();
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas'); const scale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const logo = canvas.toDataURL('image/png'); if (logo.length > 200_000) throw new Error();
      setData(current => ({ ...current, invoices: current.invoices.map(i => i.id === target ? { ...i, sender: { ...i.sender, logo }, updatedAt: Date.now() } : i) }));
    } catch { notify(t.logoFailed, undefined, true); }
  }
  function exportBackup() { download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `invoice-studio-${localDate()}.json`); notify(t.backupExported); }
  async function importBackup(file?: File) {
    if (!file) return;
    try { if (file.size > 20_000_000) throw new Error(); setIncoming(parseBackup(await file.text())); }
    catch { notify(t.importFailed, undefined, true); }
  }
  async function exportPdf(print = false) {
    if (!invoice || pdfBusy) return;
    const validation = validateInvoice(invoice, data.invoices, language);
    if (validation.length) { setErrors(validation); return; }
    if (print) { document.title = safeFilename(invoice.number); window.print(); document.title = 'Invoice Studio · Reza Prama'; return; }
    setPdfBusy(true);
    try { const { createPdf } = await import('./pdf'); await createPdf(invoice); }
    catch { notify(t.pdfFailed, undefined, true); }
    finally { setPdfBusy(false); }
  }
  const nav = [
    { id: 'editor' as const, label: t.editor, icon: FileTextIcon },
    { id: 'history' as const, label: t.history, icon: FolderOpenIcon },
    { id: 'profiles' as const, label: t.profiles, icon: UsersIcon },
    { id: 'backup' as const, label: t.backup, icon: HardDrivesIcon },
  ];

  return <>
    <a className="skip-link" href="#main">{language === 'id' ? 'Lewati ke konten' : 'Skip to content'}</a>
    <div className="app-shell">
      <aside className="sidebar">
        <a className="wordmark" href="#main" onClick={() => setPage('editor')}>invoice<span>studio</span><span className="wordmark-dot">.</span></a>
        <p className="byline">by Reza Prama</p>
        <button className="button primary new-button" onClick={() => addInvoice()}><PlusIcon size={18} />{t.newInvoice}</button>
        <nav aria-label="Main">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-button ${page === id ? 'active' : ''}`} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}>
          <Icon size={21} weight={page === id ? 'fill' : 'regular'} /><span>{label}</span>{id === 'history' && <span className="nav-count">{data.invoices.length}</span>}
        </button>)}</nav>
        <div className="sidebar-bottom">
          <p>{t.privacy}</p><a href="https://github.com/rezaprama/invoice" target="_blank" rel="noreferrer">GitHub <ArrowSquareOutIcon size={13} /></a>
        </div>
      </aside>
      <main id="main" className={`main-content page-${page}`}>
        <header className="topbar"><div className="breadcrumb">{t[page]}<span>/</span><strong>{page === 'editor' && invoice ? invoice.number : 'Invoice Studio'}</strong></div>
          <div className="topbar-settings"><label className="theme-select"><span className="sr-only">{t.theme}</span><select aria-label={t.theme} value={theme} onChange={e => setTheme(e.target.value)}><option value="system">{t.system}</option><option value="light">{t.light}</option><option value="dark">{t.dark}</option></select></label><label className="language-select"><span className="sr-only">{t.language}</span><select aria-label={t.language} value={language} onChange={e => setLanguage(e.target.value as Language)}><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></label></div>
        </header>
        {(storageError || conflict || corrupt) && <div className="storage-alert" role="alert"><WarningCircleIcon size={22} /><div><p>{corrupt ? t.storageCorrupt : conflict ? t.conflict : t.storageFailed}</p>
          {corrupt ? <><button className="button" onClick={() => { download(new Blob([initial.raw], { type: 'application/json' }), 'invoice-studio-recovery.json'); setRecovered(true); }}>{t.recovery}</button><button className="button" disabled={!recovered} onClick={() => { const fresh = createInvoice([]); setData({ ...emptyBackup(), invoices: [fresh] }); setActiveId(fresh.id); setCorrupt(false); }}>{t.resetStorage}</button></>
            : <><button className="button" onClick={exportBackup}>{t.exportBackup}</button>{conflict && <button className="button" onClick={() => location.reload()}>{t.reload}</button>}</>}
        </div></div>}
        {page === 'editor' && invoice && <>
          <div className="page-heading"><div><h1>{t.editInvoice}</h1><p>{t.subtitle}</p></div><div className="document-actions">
            <button className="button print-button" onClick={() => exportPdf(true)} disabled={pdfBusy}><PrinterIcon size={18} />{t.print}</button>
            <button className="button primary" onClick={() => exportPdf()} disabled={pdfBusy}><DownloadSimpleIcon size={18} />{pdfBusy ? t.preparing : t.downloadPdf}</button>
          </div></div>
          <div className="mobile-view-tabs"><button className={!mobilePreview ? 'selected' : ''} onClick={() => setMobilePreview(false)}><ListBulletsIcon size={18} />{t.edit}</button><button className={mobilePreview ? 'selected' : ''} onClick={() => setMobilePreview(true)}><FileTextIcon size={18} />{t.preview}</button></div>
          <div className={`workspace ${mobilePreview ? 'show-preview' : ''}`}>
            <div className="editor-pane">
              <div className="editor-status"><span className="status-dot" />{t[invoice.status]}<span className={`save-status ${storageError || conflict || corrupt ? 'save-error' : ''}`} role="status">{saved && !conflict && !corrupt ? <><CheckIcon size={14} />{t.saved}</> : storageError || conflict || corrupt ? <WarningCircleIcon size={16} /> : t.saving}</span></div>
              <nav className="editor-outline" aria-label={language === 'id' ? 'Bagian invoice' : 'Invoice sections'}>{[['01', language === 'id' ? 'Detail' : 'Details'], ['02', t.sender], ['03', language === 'id' ? 'Klien' : 'Client'], ['04', language === 'id' ? 'Item' : 'Items'], ['06', language === 'id' ? 'Pembayaran' : 'Payment']].map(([id, label]) => <a key={id} href={`#section-${id}`}>{label}</a>)}</nav>
              <Section n="01" title={t.details}>
                <div className="field-grid">
                  <Field label={t.number}><input value={invoice.number} maxLength={200} onChange={e => update({ number: e.target.value })} /></Field>
                  <Field label={t.title}><input value={invoice.title} maxLength={200} placeholder="Invoice" onChange={e => update({ title: e.target.value })} /></Field>
                  <Field label={t.issued}><input type="date" value={invoice.issued} onChange={e => { if (e.target.value && e.target.validity.valid && e.target.value.length === 10) update({ issued: e.target.value }); }} /></Field>
                  <Field label={t.due}><input type="date" value={invoice.due} min={invoice.issued} onChange={e => { if (!e.target.value || (e.target.validity.valid && e.target.value.length === 10)) update({ due: e.target.value }); }} /></Field>
                  <Field label={t.currency}><select value={invoice.currency} onChange={e => update({ currency: e.target.value as Invoice['currency'] })}>{currencies.map(c => <option key={c}>{c}</option>)}</select></Field>
                  <Field label={t.status}><select value={invoice.status} onChange={e => update({ status: e.target.value as Invoice['status'] })}><option value="draft">{t.draft}</option><option value="sent">{t.sent}</option><option value="paid">{t.paid}</option></select></Field>
                  <Field label={t.documentLanguage} className="span-2"><select value={invoice.language} onChange={e => update({ language: e.target.value as Language })}><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></Field>
                </div>
              </Section>
              <Section n="02" title={t.sender} aside={<button className="text-button" onClick={saveProfile}>{t.saveProfile}</button>}>
                {data.profiles.length > 0 && <Field label={t.useProfile} className="profile-picker"><select value="" onChange={e => { const p = data.profiles.find(p => p.id === e.target.value); if (p) { const { id: _, ...sender } = p; update({ sender }); } }}><option value="">{t.useProfile}</option>{data.profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>}
                <PartyFields party={invoice.sender} update={patch => update({ sender: { ...invoice.sender, ...patch } })} t={t} sender />
                <div className="logo-upload">{invoice.sender.logo && <img src={invoice.sender.logo} alt={invoice.sender.name || t.sender} width="64" height="44" />}<button className="button small" onClick={() => logoRef.current?.click()}><ImageIcon size={17} />{t.logo}</button>{invoice.sender.logo && <button className="icon-button" aria-label={t.removeLogo} onClick={() => update({ sender: { ...invoice.sender, logo: '' } })}><XIcon size={17} /></button>}<span>{t.logoHelp}</span></div>
              </Section>
              <Section n="03" title={t.client}><PartyFields party={invoice.client} update={patch => update({ client: { ...invoice.client, ...patch } })} t={t} sender={false} /></Section>
              <Section n="04" title={t.items}>
                <div className="line-items">{!invoice.items.length && <div className="empty-items">{t.noItems}</div>}{invoice.items.map((item, index) => <div key={item.id} className="line-item" data-item={item.id}>
                  <div className="item-topline"><span className="item-index">{String(index + 1).padStart(2, '0')}</span><div className="item-tools">
                    <button className="icon-button" aria-label={`${t.moveUp} ${index + 1}`} title={t.moveUp} disabled={index === 0} onClick={() => moveItem(index, -1)}><ArrowUpIcon size={16} /></button>
                    <button className="icon-button" aria-label={`${t.moveDown} ${index + 1}`} title={t.moveDown} disabled={index === invoice.items.length - 1} onClick={() => moveItem(index, 1)}><ArrowDownIcon size={16} /></button>
                    <button className="icon-button" aria-label={`${t.duplicateItem} ${index + 1}`} title={t.duplicateItem} onClick={() => addItem(item)}><CopyIcon size={16} /></button>
                    <button className="icon-button danger-text" aria-label={`${t.removeItem} ${index + 1}`} title={t.removeItem} onClick={() => removeItem(item, index)}><TrashIcon size={16} /></button>
                  </div></div>
                  <Field label={t.description}><textarea rows={2} value={item.description} maxLength={5000} placeholder={t.descriptionPlaceholder} onChange={e => updateItem(item.id, { description: e.target.value })} /></Field>
                  <div className="item-numbers"><NumberField label={t.quantity} value={item.quantity} onChange={quantity => updateItem(item.id, { quantity })} />
                    <Field label={t.unit}><input value={item.unit} maxLength={200} placeholder={t.unitPlaceholder} onChange={e => updateItem(item.id, { unit: e.target.value })} /></Field>
                    <NumberField label={`${t.rate} (${invoice.currency})`} value={item.rate} onChange={rate => updateItem(item.id, { rate })} />
                  </div><div className="item-total"><span>{t.amount}</span><strong>{money(sum!.lines[index], invoice)}</strong></div>
                </div>)}</div>
                <div className="add-item-row"><button className="button add-item-button" onClick={() => addItem()}><PlusIcon size={18} />{t.addItem}</button><label className="template-picker"><span className="sr-only">{t.template}</span><select value="" onChange={e => addTemplate(e.target.value)}><option value="">{t.template}</option><option value="design">{t.design}</option><option value="software">{t.software}</option><option value="general">{t.general}</option></select><CaretDownIcon size={14} /></label></div>
              </Section>
              <Section n="05" title={t.adjustments}>
                <div className="field-grid">
                  <NumberField label={t.discount} value={invoice.discount} onChange={discount => update({ discount })} suffix={invoice.discountType === 'percent' ? '%' : invoice.currency} />
                  <Field label={language === 'id' ? 'Jenis diskon' : 'Discount type'}><select value={invoice.discountType} onChange={e => update({ discountType: e.target.value as Invoice['discountType'] })}><option value="percent">{t.percent}</option><option value="fixed">{t.fixed}</option></select></Field>
                  <Field label={t.taxLabel}><input value={invoice.taxLabel} maxLength={200} onChange={e => update({ taxLabel: e.target.value })} /></Field>
                  <NumberField label={t.taxRate} value={invoice.tax} onChange={tax => update({ tax })} />
                  <NumberField label={`${t.shipping} (${invoice.currency})`} value={invoice.shipping} onChange={shipping => update({ shipping })} />
                  <NumberField label={`${t.amountPaid} (${invoice.currency})`} value={invoice.status === 'paid' ? sum!.paid.toString() : invoice.paid} disabled={invoice.status === 'paid'} onChange={paid => update({ paid })} />
                </div><p className="field-hint">{t.taxHelp}</p>
              </Section>
              <Section n="06" title={t.notesPayment}>
                <div className="stack-fields"><Field label={t.payment}><textarea rows={3} value={invoice.payment} maxLength={5000} placeholder={t.paymentPlaceholder} onChange={e => update({ payment: e.target.value })} /></Field>
                  <Field label={t.notes}><textarea rows={2} value={invoice.notes} maxLength={5000} placeholder={t.notesPlaceholder} onChange={e => update({ notes: e.target.value })} /></Field>
                  <Field label={t.terms}><textarea rows={2} value={invoice.terms} maxLength={5000} placeholder={t.termsPlaceholder} onChange={e => update({ terms: e.target.value })} /></Field></div>
              </Section>
              <div className="editor-footer"><span>{t.localOnly}</span><button className="text-button" onClick={exportBackup}><DownloadSimpleIcon size={15} />{t.exportBackup}</button></div>
            </div>
            <aside className="preview-pane" tabIndex={0} aria-label={t.preview}><div className="preview-toolbar"><span><FileTextIcon size={16} />{t.preview}</span><span>A4 · {invoice.currency}</span></div><InvoicePreview invoice={invoice} /><div className="preview-bottom"><span>{t.previewHint}</span><span>{invoice.items.length} {language === 'id' ? 'item' : 'items'}</span></div></aside>
          </div>
        </>}
        {page === 'editor' && !invoice && <div className="empty-page"><FileTextIcon size={40} weight="light" /><h1>{t.noHistory}</h1><button className="button primary" onClick={() => addInvoice()}><PlusIcon size={18} />{t.createFirst}</button></div>}
        {page === 'history' && <div className="utility-page"><div className="page-heading"><div><h1>{t.history}</h1><p>{t.historySubtitle}</p></div></div>
          <div className="history-filters"><label className="search-box"><MagnifyingGlassIcon size={19} /><span className="sr-only">{t.search}</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} /></label><label><span className="sr-only">{t.status}</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">{t.all}</option>{(['draft', 'sent', 'paid'] as const).map(s => <option key={s} value={s}>{t[s]}</option>)}</select></label></div>
          <div className="history-list">{data.invoices.filter(i => (filter === 'all' || filter === i.status) && `${i.number} ${i.client.name} ${i.sender.name}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.updatedAt - a.updatedAt).map(i => <article className="history-row" key={i.id}>
            <button className="history-open" onClick={() => { setActiveId(i.id); setLanguage(i.language); setPage('editor'); setMobilePreview(false); window.scrollTo({ top: 0 }); }} aria-label={`${t.open} ${i.number}`}><span className="history-document"><FileTextIcon size={22} /></span><span><strong>{i.number || 'Invoice'}</strong><span>{i.client.name || t.clientEmpty}<span className="history-sender"> · {i.sender.name || t.senderName}</span></span></span></button>
            <span className={`invoice-state state-${i.status}`}>{t[i.status]}</span><strong className="history-amount">{money(totals(i).total, i)}</strong><div className="history-tools"><button className="icon-button" aria-label={`${t.duplicate} ${i.number}`} onClick={() => addInvoice(i)}><CopyIcon size={18} /></button><button className="icon-button danger-text" aria-label={`${t.delete} ${i.number}`} onClick={() => setDeleting(i)}><TrashIcon size={18} /></button></div>
          </article>)}</div>
          {!data.invoices.some(i => (filter === 'all' || filter === i.status) && `${i.number} ${i.client.name} ${i.sender.name}`.toLowerCase().includes(search.toLowerCase())) && <div className="empty-page"><FolderOpenIcon size={40} weight="light" /><h2>{data.invoices.length ? t.noResults : t.noHistory}</h2>{!data.invoices.length && <button className="button primary" onClick={() => addInvoice()}>{t.createFirst}</button>}</div>}
        </div>}
        {page === 'profiles' && <div className="utility-page"><div className="page-heading"><div><h1>{t.profiles}</h1><p>{t.profilesSubtitle}</p></div></div>
          {!data.profiles.length && <div className="empty-page"><UsersIcon size={40} weight="light" /><h2>{t.noProfiles}</h2><p>{t.profileHint}</p><button className="button" onClick={() => invoice ? setPage('editor') : addInvoice()}>{t.editor}</button></div>}
          <div className="profile-list">{data.profiles.map(p => <article className="profile-card" key={p.id}><div><h2>{p.name}</h2><p>{p.email || p.address}</p></div><div className="profile-actions"><button className="button" onClick={() => { if (invoice) { const { id: _, ...sender } = p; update({ sender }); setPage('editor'); notify(t.profileUsed); } else { const fresh = createInvoice(data.invoices, p, language); setData(c => ({ ...c, invoices: [fresh, ...c.invoices] })); setActiveId(fresh.id); setPage('editor'); } }}>{t.use}</button><button className="icon-button danger-text" aria-label={`${t.delete} ${p.name}`} onClick={() => { setData(c => ({ ...c, profiles: c.profiles.filter(x => x.id !== p.id) })); notify(t.profileDeleted, () => setData(c => ({ ...c, profiles: [...c.profiles, p] }))); }}><TrashIcon size={18} /></button></div></article>)}</div>
        </div>}
        {page === 'backup' && <div className="utility-page backup-page"><div className="page-heading"><div><h1>{t.backup}</h1><p>{t.backupSubtitle}</p></div></div><div className="backup-counts"><span><strong>{data.invoices.length}</strong> {t.invoiceCount}</span><span><strong>{data.profiles.length}</strong> {t.profileCount}</span></div>
          <section className="backup-section"><DownloadSimpleIcon size={26} weight="light" /><div><h2>{t.exportBackup}</h2><p>{t.backupDescription}</p><button className="button primary" onClick={exportBackup}><DownloadSimpleIcon size={18} />{t.exportBackup}</button></div></section>
          <section className="backup-section"><UploadSimpleIcon size={26} weight="light" /><div><h2>{t.importBackup}</h2><p>{t.importDescription}</p><button className="button" onClick={() => importRef.current?.click()}><UploadSimpleIcon size={18} />{t.importBackup}</button></div></section>
        </div>}
      </main>
    </div>
    <input className="sr-only" tabIndex={-1} ref={importRef} type="file" accept=".json,application/json" aria-label={t.importBackup} onChange={e => { importBackup(e.target.files?.[0]); e.target.value = ''; }} />
    <input className="sr-only" tabIndex={-1} ref={logoRef} type="file" accept="image/png,image/jpeg" aria-label={t.logo} onChange={e => { uploadLogo(e.target.files?.[0]); e.target.value = ''; }} />
    {toast && <div className={`toast ${toast.error ? 'toast-error' : ''}`} role="status"><span>{toast.text}</span>{toast.action && <button onClick={() => { toast.action?.(); setToast(null); }}><ArrowCounterClockwiseIcon size={16} />{t.undo}</button>}<button className="icon-button" aria-label={t.close} onClick={() => setToast(null)}><XIcon size={17} /></button></div>}
    {errors && <Modal title={t.validation} closeLabel={t.close} onClose={() => setErrors(null)}><ul className="validation-errors">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul><div className="modal-actions"><button className="button primary" onClick={() => { setErrors(null); setMobilePreview(false); }}>{t.edit}</button></div></Modal>}
    {incoming && <Modal title={t.importConfirm} closeLabel={t.close} onClose={() => setIncoming(null)}><p>{incoming.invoices.filter(i => !data.invoices.some(c => c.id === i.id)).length} {t.newCount} · {incoming.invoices.filter(i => data.invoices.some(c => c.id === i.id)).length} {t.skippedCount}</p><p>{t.importDescription}</p><div className="modal-actions"><button className="button" onClick={() => setIncoming(null)}>{t.cancel}</button><button className="button primary" onClick={() => { try { const merged = mergeBackup(data, incoming); setData(merged); if (!invoice && merged.invoices.length) setActiveId(merged.invoices[0].id); setIncoming(null); notify(t.imported); } catch { notify(t.limit, undefined, true); } }}>{t.importApply}</button></div></Modal>}
    {deleting && <Modal title={t.deleteInvoice} closeLabel={t.close} onClose={() => setDeleting(null)}><p><strong>{deleting.number}</strong></p><p>{t.deleteHint}</p><div className="modal-actions"><button className="button" onClick={() => setDeleting(null)}>{t.cancel}</button><button className="button danger" onClick={() => { const removed = deleting; setData(c => ({ ...c, invoices: c.invoices.filter(i => i.id !== removed.id) })); if (activeId === removed.id) setActiveId(data.invoices.find(i => i.id !== removed.id)?.id || ''); setDeleting(null); notify(t.invoiceDeleted, () => setData(c => ({ ...c, invoices: c.invoices.some(i => i.id === removed.id) ? c.invoices : [...c.invoices, removed] }))); }}>{t.delete}</button></div></Modal>}
  </>;
}
