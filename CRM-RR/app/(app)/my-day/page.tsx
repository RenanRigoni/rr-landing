import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getMyDayData } from '@/lib/queries/my-day'

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

export default async function MyDayPage() {
  const { overdue, today, noNextAction, stale } = await getMyDayData()

  const isEmpty = overdue.length === 0 && today.length === 0 && noNextAction.length === 0 && stale.length === 0

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-content-primary">Meu Dia</h1>
        <p className="text-sm text-content-secondary">O que precisa da sua atenção agora.</p>
      </div>

      {isEmpty ? (
        <p className="text-sm text-content-secondary">
          Nada pendente hoje. Crie oportunidades e atividades no{' '}
          <Link href="/pipeline" className="text-brand-400 hover:underline">
            pipeline
          </Link>
          .
        </p>
      ) : null}

      {overdue.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-danger">
            Atrasado ({overdue.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {overdue.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center justify-between rounded-inner border border-danger/20 bg-danger/5 px-4 py-3"
              >
                <div>
                  <span className="text-sm text-content-primary">{activity.subject}</span>
                  {activity.deal_id ? (
                    <Link
                      href={`/deals/${activity.deal_id}`}
                      className="ml-2 text-xs text-content-secondary hover:text-brand-400"
                    >
                      {activity.deal_title} {activity.company_name ? `· ${activity.company_name}` : ''}
                    </Link>
                  ) : null}
                </div>
                <span className="font-mono text-xs text-danger">
                  {activity.due_at ? formatDistanceToNow(new Date(activity.due_at), { addSuffix: true, locale: ptBR }) : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {today.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
            Hoje ({today.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {today.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center justify-between rounded-inner border border-white/[0.08] bg-surface-elevated px-4 py-3"
              >
                <div>
                  <span className="text-sm text-content-primary">{activity.subject}</span>
                  {activity.deal_id ? (
                    <Link
                      href={`/deals/${activity.deal_id}`}
                      className="ml-2 text-xs text-content-secondary hover:text-brand-400"
                    >
                      {activity.deal_title} {activity.company_name ? `· ${activity.company_name}` : ''}
                    </Link>
                  ) : null}
                </div>
                <span className="font-mono text-xs text-content-secondary">
                  {activity.due_at ? format(new Date(activity.due_at), 'HH:mm', { locale: ptBR }) : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {noNextAction.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-warning">
            Sem próxima ação ({noNextAction.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {noNextAction.map((deal) => (
              <li key={deal.id}>
                <Link
                  href={`/deals/${deal.id}`}
                  className="flex items-center justify-between rounded-inner border border-warning/20 bg-warning/5 px-4 py-3 transition-colors ease-spring hover:border-warning/40"
                >
                  <div>
                    <span className="text-sm text-content-primary">{deal.title}</span>
                    {deal.company_name ? (
                      <span className="ml-2 text-xs text-content-secondary">{deal.company_name}</span>
                    ) : null}
                  </div>
                  <span className="font-mono text-xs text-content-secondary">{deal.stage_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {stale.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
            Sem interação há mais de 14 dias ({stale.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {stale.map((deal) => (
              <li key={deal.id}>
                <Link
                  href={`/deals/${deal.id}`}
                  className="flex items-center justify-between rounded-inner border border-white/[0.08] bg-surface-elevated px-4 py-3 transition-colors ease-spring hover:border-brand-500"
                >
                  <div>
                    <span className="text-sm text-content-primary">{deal.title}</span>
                    {deal.company_name ? (
                      <span className="ml-2 text-xs text-content-secondary">{deal.company_name}</span>
                    ) : null}
                  </div>
                  <span className="font-mono text-xs text-content-secondary">{formatCurrency(deal.value_cents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
