import Link from 'next/link'

// docs/DESIGN_SYSTEM.md → Estado vazio: sem ilustração, frase honesta +
// botão que resolve. `font-display` é a única aparição legítima dela fora
// da tela de login.
export function LeadsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-white/[0.08] bg-surface-elevated px-8 py-16 text-center">
      <h2 className="font-display text-xl font-extrabold tracking-tight text-content-primary">Nenhum lead ainda.</h2>
      <p className="mt-2 max-w-sm text-sm text-content-secondary">
        Cadastre o primeiro pedido de orçamento que chegou — é o começo de tudo por aqui.
      </p>
      <Link
        href="/leads/new"
        className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors ease-spring hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        Novo lead
      </Link>
    </div>
  )
}
