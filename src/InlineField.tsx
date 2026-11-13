import { useLayoutEffect, useRef, useState } from 'react';
import { money, type Invoice } from './model';

type TextProps = {
  label: string; value: string; onChange: (value: string) => void;
  placeholder?: string; multiline?: boolean; className?: string; type?: 'text' | 'email' | 'tel';
  maxLength?: number;
};
export function InlineText({ label, value, onChange, placeholder, multiline, className = '', type = 'text', maxLength = multiline ? 5000 : 200 }: TextProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => { element.style.height = '0px'; element.style.height = `${element.scrollHeight}px`; };
    resize();
    const observer = new ResizeObserver(resize);
    const parent = element.parentElement;
    if (parent) observer.observe(parent, { box: 'border-box' });
    return () => observer.disconnect();
  }, [value]);
  const shared = { 'aria-label': label, value, placeholder: placeholder || label, maxLength, autoComplete: 'off', className: `inline-field ${className}`, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value) };
  return multiline ? <textarea {...shared} ref={ref} rows={1} /> : <input {...shared} type={type} />;
}

export function InlineNumber({ label, value, onChange, invoice, currency, disabled = false }: {
  label: string; value: string; onChange: (value: string) => void;
  invoice?: Pick<Invoice, 'currency' | 'language'>; currency?: boolean; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return <input aria-label={label} className="inline-field inline-number" type="text" inputMode="decimal" autoComplete="off" disabled={disabled}
    value={!focused && currency && invoice ? money(value || '0', invoice) : value} placeholder="0"
    onFocus={event => { const input = event.currentTarget; input.value = value; input.select(); setFocused(true); }}
    onBlur={() => setFocused(false)}
    onChange={event => { const next = event.target.value.replace(',', '.'); if (/^(?:\d{1,12}(?:\.\d{0,4})?|)$/.test(next)) onChange(next); }} />;
}
