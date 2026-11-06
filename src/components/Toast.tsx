import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import type { ToastMessage } from '../types'

export function ToastViewport({ items, dismiss }: { items: ToastMessage[]; dismiss: (id: number) => void }) {
  return <div className="toast-viewport" aria-live="polite">{items.map(item => <div className={`toast toast-${item.tone}`} key={item.id}>
    {item.tone === 'success' ? <CheckCircle2 size={19} /> : item.tone === 'error' ? <XCircle size={19} /> : <Info size={19} />}
    <div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}</div>
    <button className="icon-button toast-close" aria-label="Tutup notifikasi" onClick={() => dismiss(item.id)}><X size={16} /></button>
  </div>)}</div>
}
