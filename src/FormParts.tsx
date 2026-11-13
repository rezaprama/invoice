import { useEffect, useRef, type ReactNode } from 'react';
import { XIcon } from '@phosphor-icons/react';

export function Modal({ title, children, onClose, closeLabel }: { title: string; children: ReactNode; onClose: () => void; closeLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current!; el.showModal(); return () => el.close(); }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
    <header><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" aria-label={closeLabel} onClick={onClose}><XIcon size={20} /></button></header>{children}
  </dialog>;
}
