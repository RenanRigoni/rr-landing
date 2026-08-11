import { DealForm } from '@/components/deals/DealForm'
import { getDefaultPipeline, listPipelineStages } from '@/lib/queries/pipeline'
import { listCompanies } from '@/lib/queries/companies'
import { listContacts } from '@/lib/queries/contacts'
import { listLeadSources } from '@/lib/queries/lead-sources'

export default async function NewDealPage() {
  const pipeline = await getDefaultPipeline()
  const [stages, companies, contacts, leadSources] = await Promise.all([
    listPipelineStages(pipeline.id),
    listCompanies(),
    listContacts(),
    listLeadSources(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-sans text-2xl font-semibold text-content-primary">Nova oportunidade</h1>
      <DealForm
        pipelineId={pipeline.id}
        stages={stages}
        companies={companies}
        contacts={contacts}
        leadSources={leadSources}
      />
    </div>
  )
}
