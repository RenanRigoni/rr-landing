// docs/DESIGN_SYSTEM.md checklist: "Estado de carregamento existe (skeleton
// com surface-elevated)". Next mostra isto automaticamente enquanto
// TodayPage (Server Component) resolve getTodayActions().
export default function TodayLoading() {
  return (
    <div>
      <div className="h-7 w-24 animate-pulse rounded-md bg-surface-elevated" />
      <div className="mt-2 h-4 w-40 animate-pulse rounded-md bg-surface-elevated" />

      <div className="mt-8 space-y-2">
        <div className="mb-3 h-4 w-20 animate-pulse rounded-md bg-surface-elevated" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[68px] animate-pulse rounded-lg border border-white/[0.06] bg-surface-elevated" />
        ))}
      </div>
    </div>
  )
}
