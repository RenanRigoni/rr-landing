import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPlaybook } from '@/lib/queries/playbooks'

interface PlaybookDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function PlaybookDetailPage({ params }: PlaybookDetailPageProps) {
  const { slug } = await params
  const playbook = await getPlaybook(slug)
  if (!playbook) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-content-primary">{playbook.title}</h1>
        {playbook.process_docs ? (
          <Link
            href={`/processes/${playbook.process_docs.slug}`}
            className="text-xs text-brand-400 hover:underline"
          >
            Processo relacionado: {playbook.process_docs.title}
          </Link>
        ) : null}
      </div>

      <div className="whitespace-pre-wrap rounded-card border border-white/[0.08] bg-surface-elevated p-6 text-sm leading-relaxed text-content-secondary">
        {playbook.content}
      </div>
    </div>
  )
}
