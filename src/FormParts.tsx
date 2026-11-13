import { Children, cloneElement, isValidElement, useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react';
import { XIcon } from '@phosphor-icons/react';
import type { Party } from './model';
import type { Messages } from './i18n';

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  const labelId = useId();
  const attachLabel = (nodes: ReactNode): ReactNode => Children.map(nodes, node => {
    if (!isValidElement(node)) return node;
    const child = node as ReactElement<{ children?: ReactNode; 'aria-labelledby'?: string; autoComplete?: string }>;
    if (['input', 'textarea', 'select'].includes(String(child.type))) return cloneElement(child, { 'aria-labelledby': labelId, autoComplete: 'off' });
    return child.props.children ? cloneElement(child, { children: attachLabel(child.props.children) }) : child;
  });
  return <label className={`field ${className}`}><span id={labelId}>{label}</span>{attachLabel(children)}</label>;
}
export function NumberField({ label, value, onChange, suffix, disabled }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; disabled?: boolean }) {
  return <Field label={label}><span className="number-wrap"><input type="text" inputMode="decimal" value={value} placeholder="0" disabled={disabled}
    onChange={e => { const val = e.target.value.replace(',', '.'); if (/^(?:\d{1,12}(?:\.\d{0,4})?|)$/.test(val)) onChange(val); }} />{suffix && <span>{suffix}</span>}</span></Field>;
}
export function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return <section className="form-section" id={`section-${n}`}><div className="section-heading"><h2><span>{n}</span>{title}</h2></div>{children}</section>;
}
export function Modal({ title, children, onClose, closeLabel }: { title: string; children: ReactNode; onClose: () => void; closeLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current!; el.showModal(); return () => el.close(); }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
    <header><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" aria-label={closeLabel} onClick={onClose}><XIcon size={20} /></button></header>{children}
  </dialog>;
}
export function PartyFields({ party, update, t, sender }: { party: Party; update: (p: Partial<Party>) => void; t: Messages; sender: boolean }) {
  return <div className="field-grid">
    <Field label={t.name} className="span-2"><input value={party.name} maxLength={200} placeholder={sender ? t.senderName : t.clientName} onChange={e => update({ name: e.target.value })} /></Field>
    <Field label={t.email}><input type="email" value={party.email} maxLength={200} placeholder="nama@contoh.com" onChange={e => update({ email: e.target.value })} /></Field>
    <Field label={t.phone}><input type="tel" value={party.phone} maxLength={200} placeholder="+62" onChange={e => update({ phone: e.target.value })} /></Field>
    <Field label={t.address} className="span-2"><textarea rows={2} value={party.address} maxLength={5000} placeholder={t.address} onChange={e => update({ address: e.target.value })} /></Field>
    <Field label={t.taxId} className="span-2"><input value={party.taxId} maxLength={200} placeholder={t.optional} onChange={e => update({ taxId: e.target.value })} /></Field>
  </div>;
}
