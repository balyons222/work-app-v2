import type { ReactNode } from 'react'
import Link from 'next/link'

// Building blocks for the /help pages. Server components only (no client state).

export type TocItem = { id: string; label: string }

const TABS = [
  { href: '/help', label: 'Getting started' },
  { href: '/help/contractors', label: 'For contractors' },
  { href: '/help/organizers', label: 'For organizers' },
]

export function HelpShell({ active, title, intro, toc, children }: {
  active: string
  title: string
  intro: ReactNode
  toc?: TocItem[]
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <nav aria-label="Help sections" className="flex flex-wrap gap-2 mb-8">
          {TABS.map(t => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active === t.href ? 'page' : undefined}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                active === t.href
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-secondary hover:text-primary'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-secondary mb-2">Help Center</p>
          <h1 className="text-3xl md:text-4xl font-black text-primary mb-3">{title}</h1>
          <div className="text-slate-600 text-lg leading-relaxed max-w-3xl">{intro}</div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {toc && toc.length > 0 && (
            <aside className="w-full lg:w-56 lg:sticky lg:top-28 shrink-0">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">On this page</p>
                <ol className="space-y-1 text-sm">
                  {toc.map(item => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="block py-1 text-slate-600 hover:text-secondary font-medium">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          )}
          <div className="flex-1 min-w-0 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

// One numbered step of a guide. The id is the deep-link anchor (e.g. /help/contractors#stripe).
export function Section({ id, n, title, children }: { id: string; n?: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
      <h2 className="flex items-center gap-3 text-xl font-black text-slate-900 mb-4">
        {n !== undefined && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary text-sm">
            {n}
          </span>
        )}
        {title}
      </h2>
      <div className="space-y-4 text-slate-600 leading-relaxed">{children}</div>
    </section>
  )
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal pl-6 space-y-2 marker:font-bold marker:text-slate-400">{children}</ol>
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-6 space-y-2 marker:text-slate-300">{children}</ul>
}

// Names of on-screen buttons and labels, so readers can spot them in the app.
export function UI({ children }: { children: ReactNode }) {
  return <strong className="font-bold text-slate-900">{children}</strong>
}

export function Tip({ children, tone = 'tip' }: { children: ReactNode; tone?: 'tip' | 'warn' }) {
  const styles = tone === 'warn'
    ? 'bg-amber-50 border-amber-200 text-amber-900'
    : 'bg-teal-50 border-teal-100 text-teal-900'
  return <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}>{children}</div>
}

export function Table({ head, rows }: { head: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-900">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-bold align-bottom">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-3 align-top ${j === 0 ? 'font-bold text-slate-900' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group border-b border-slate-100 last:border-0 py-3">
      <summary className="cursor-pointer list-none flex justify-between items-center gap-4 font-bold text-slate-900">
        {q}
        <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
      </summary>
      <div className="mt-2 text-slate-600 leading-relaxed">{children}</div>
    </details>
  )
}

export function NextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-secondary font-bold hover:underline">
      {children}
    </Link>
  )
}
