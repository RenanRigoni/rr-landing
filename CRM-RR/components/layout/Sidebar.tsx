import Link from 'next/link'
import { NAV_GROUPS } from '@/lib/navigation'
import { signOut } from '@/lib/actions/auth'

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-white/[0.08] bg-surface-muted px-4 py-6">
      <div className="mb-8 px-2">
        <span className="font-display text-lg font-extrabold tracking-tight text-content-primary">
          CRM<span className="text-brand-400">·RR</span>
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-inner px-2 py-1.5 text-sm text-content-secondary transition-colors ease-spring hover:bg-white/[0.06] hover:text-content-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <form action={signOut} className="border-t border-white/[0.08] pt-4">
        <button
          type="submit"
          className="w-full rounded-inner px-2 py-1.5 text-left text-sm text-content-secondary transition-colors ease-spring hover:bg-white/[0.06] hover:text-content-primary"
        >
          Sair
        </button>
      </form>
    </aside>
  )
}
