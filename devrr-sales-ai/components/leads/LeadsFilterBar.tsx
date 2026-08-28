import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import type { Database } from '@/lib/types/database.types'

type Stage = Pick<Database['sales']['Tables']['pipeline_stages']['Row'], 'id' | 'key' | 'label'>
type Source = Pick<Database['sales']['Tables']['lead_sources']['Row'], 'id' | 'name'>
type LeadStatus = Database['sales']['Enums']['lead_status']

interface LeadsFilterBarProps {
  stages: Stage[]
  sources: Source[]
  activeStageKey?: string
  activeSourceId?: string
  activeStatus?: LeadStatus
}

interface FilterState {
  stage?: string
  source?: string
  status?: string
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'open', label: 'Aberto' },
  { value: 'won', label: 'Ganho' },
  { value: 'lost', label: 'Perdido' },
]

// Filtro é estado de URL, não de cliente (docs/IMPLEMENTATION_PLAN.md → 3.5)
// — cada chip é um <Link> pra um search param diferente, zero 'use client'
// aqui. Estágio usa `key` (estável pra código, DATABASE.md), não o uuid —
// URL mais legível e não muda se o estágio for recriado com o mesmo `key`.
function buildHref(current: FilterState, key: keyof FilterState, value: string | undefined): string {
  const next: FilterState = { ...current, [key]: value }
  const params = new URLSearchParams()
  if (next.stage) params.set('stage', next.stage)
  if (next.source) params.set('source', next.source)
  if (next.status) params.set('status', next.status)

  const query = params.toString()
  return query ? `/leads?${query}` : '/leads'
}

// Exportação em massa (7.9): baixa CSV/JSON dos leads que casam com os
// filtros ATUAIS. Rota autenticada pela sessão (`/api/leads/export`, D-041) —
// `<a>` simples, é navegação de download, não roteamento de app.
function buildExportHref(current: FilterState, format: 'csv' | 'json'): string {
  const params = new URLSearchParams({ format })
  if (current.stage) params.set('stage', current.stage)
  if (current.source) params.set('source', current.source)
  if (current.status) params.set('status', current.status)
  return `/api/leads/export?${params.toString()}`
}

function FilterChip({ href, isActive, children }: { href: string; isActive: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-pill px-2.5 py-1 text-xs font-medium transition-colors ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        isActive
          ? 'bg-brand-600/15 text-brand-400'
          : 'bg-white/[0.04] text-content-secondary hover:bg-white/[0.08] hover:text-content-primary',
      )}
    >
      {children}
    </Link>
  )
}

export function LeadsFilterBar({ stages, sources, activeStageKey, activeSourceId, activeStatus }: LeadsFilterBarProps) {
  const current: FilterState = { stage: activeStageKey, source: activeSourceId, status: activeStatus }

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-content-muted">Estágio</p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip href={buildHref(current, 'stage', undefined)} isActive={!activeStageKey}>
            Todos
          </FilterChip>
          {stages.map((stage) => (
            <FilterChip key={stage.id} href={buildHref(current, 'stage', stage.key)} isActive={activeStageKey === stage.key}>
              {stage.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-content-muted">Fonte</p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip href={buildHref(current, 'source', undefined)} isActive={!activeSourceId}>
            Todas
          </FilterChip>
          {sources.map((source) => (
            <FilterChip key={source.id} href={buildHref(current, 'source', source.id)} isActive={activeSourceId === source.id}>
              {source.name}
            </FilterChip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-content-muted">Status</p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip href={buildHref(current, 'status', undefined)} isActive={!activeStatus}>
            Todos
          </FilterChip>
          {STATUS_OPTIONS.map((option) => (
            <FilterChip key={option.value} href={buildHref(current, 'status', option.value)} isActive={activeStatus === option.value}>
              {option.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-content-muted">Exportar</p>
        <div className="flex flex-wrap gap-1.5">
          <a
            href={buildExportHref(current, 'csv')}
            className="rounded-pill bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-content-secondary transition-colors ease-spring hover:bg-white/[0.08] hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            CSV
          </a>
          <a
            href={buildExportHref(current, 'json')}
            className="rounded-pill bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-content-secondary transition-colors ease-spring hover:bg-white/[0.08] hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            JSON
          </a>
        </div>
      </div>
    </div>
  )
}
