import Link from 'next/link'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { getPipelineBoard } from '@/lib/queries/pipeline'
import { listLostReasons } from '@/lib/queries/lost-reasons'

export default async function PipelinePage() {
  const [board, lostReasons] = await Promise.all([getPipelineBoard(), listLostReasons()])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-content-primary">{board.pipeline.name}</h1>
          <p className="text-sm text-content-secondary">Arraste os cards entre estágios.</p>
        </div>
        <Link
          href="/deals/new"
          className="rounded-pill bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-all ease-spring hover:bg-brand-500 hover:scale-[1.02]"
        >
          Nova oportunidade
        </Link>
      </div>

      <KanbanBoard initialStages={board.stages} lostReasons={lostReasons} />
    </div>
  )
}
