import { Orbit } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}>
    <div className="brand-mark"><Orbit size={22} strokeWidth={2.3} /></div>
    {!compact && <div className="brand-copy"><strong>KAMPUSVERSE</strong><span>ONE KNOWLEDGE ECOSYSTEM</span></div>}
  </div>
}
