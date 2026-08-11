export function ScoreBar({ label, score, maxScore }: { label: string; score: number; maxScore: number }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0
  const color = pct >= 80 ? 'bg-success' : pct <= 40 ? 'bg-danger' : 'bg-brand-500'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-content-secondary">{label}</span>
        <span className="font-mono text-content-primary">
          {score}/{maxScore}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-pill bg-white/[0.06]">
        <div className={`h-full rounded-pill ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
