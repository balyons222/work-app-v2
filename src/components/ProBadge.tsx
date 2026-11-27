// "Pro" pill for Contractor Pro subscribers (same look as the profile page header).
export default function ProBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm ${className}`}
      title="Contractor Pro member"
    >
      Pro
    </span>
  )
}
