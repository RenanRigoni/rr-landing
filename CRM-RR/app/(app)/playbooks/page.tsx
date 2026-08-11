import Link from 'next/link'
import { listPlaybooks } from '@/lib/queries/playbooks'

const TYPE_LABELS: Record<string, string> = {
  playbook: 'Playbook',
  tutorial: 'Tutorial',
  faq: 'FAQ',
  checklist: 'Checklist',
  script: 'Script',
  onboarding: 'Onboarding',
}

export default async function PlaybooksPage() {
  const playbooks = await listPlaybooks()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-content-primary">Playbooks</h1>
        <p className="text-sm text-content-secondary">Material de treinamento e referência operacional.</p>
      </div>

      <div className="flex flex-col gap-3">
        {playbooks.map((p) => (
          <Link
            key={p.id}
            href={`/playbooks/${p.slug}`}
            className="flex items-center justify-between rounded-card border border-white/[0.08] bg-surface-elevated p-4 transition-colors ease-spring hover:border-brand-500"
          >
            <h2 className="text-sm font-medium text-content-primary">{p.title}</h2>
            <span className="rounded-pill bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-content-muted">
              {TYPE_LABELS[p.type] ?? p.type}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
