import { cn } from '@/lib/utils/cn'

interface StageBadgeProps {
  label: string
  color: string | null
}

// docs/DESIGN_SYSTEM.md → Badge de estágio. `color` (quando existir — hoje
// nenhum estágio semeado por seed_org_defaults tem cor, só via configuração
// futura) é hex de 6 dígitos; "26" no fim é o alfa (~15%) pro fundo
// translúcido, texto usa a cor sólida. Sem cor: fallback neutro do spec.
export function StageBadge({ label, color }: StageBadgeProps) {
  return (
    <span
      className={cn(
        'w-fit rounded-pill px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
        color ? undefined : 'bg-white/[0.06] text-content-secondary',
      )}
      style={color ? { backgroundColor: `${color}26`, color } : undefined}
    >
      {label}
    </span>
  )
}
