import { listGlossaryTerms } from '@/lib/queries/glossary'

export default async function GlossaryPage() {
  const terms = await listGlossaryTerms()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-content-primary">Glossário</h1>
        <p className="text-sm text-content-secondary">Termos de Sales Ops usados neste CRM.</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
        {terms.map((t) => (
          <div key={t.id}>
            <dt className="text-sm font-medium text-content-primary">{t.term}</dt>
            <dd className="text-sm text-content-secondary">{t.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
