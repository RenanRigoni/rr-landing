import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { listProcessDocs } from '@/lib/queries/processes'

export default async function ProcessesPage() {
  const processes = await listProcessDocs()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-content-primary">Processos</h1>
        <p className="text-sm text-content-secondary">Documentação AS-IS/TO-BE dos processos comerciais.</p>
      </div>

      <div className="flex flex-col gap-3">
        {processes.map((p) => (
          <Link
            key={p.id}
            href={`/processes/${p.slug}`}
            className="flex items-center justify-between rounded-card border border-white/[0.08] bg-surface-elevated p-4 transition-colors ease-spring hover:border-brand-500"
          >
            <div>
              <h2 className="text-sm font-medium text-content-primary">{p.title}</h2>
              <p className="text-xs text-content-secondary">{p.objective}</p>
            </div>
            <span className="font-mono text-[10px] text-content-muted">
              {p.last_reviewed_at ? format(new Date(p.last_reviewed_at), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
