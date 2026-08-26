import { redirect } from 'next/navigation'
import { getCurrentOrg } from '@/lib/queries/orgs'
import { getTodayActions } from '@/lib/queries/today'
import { TodayActionsList } from '@/components/today/TodayActionsList'

export default async function TodayPage() {
  const org = await getCurrentOrg()

  if (!org) {
    redirect('/onboarding')
  }

  const { overdue, dueToday, withoutAction, timezone } = await getTodayActions()

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-content-primary">Hoje</h1>
      <p className="mt-1 text-sm text-content-secondary">{org.name}</p>

      <div className="mt-6">
        <TodayActionsList overdue={overdue} dueToday={dueToday} withoutAction={withoutAction} timezone={timezone} />
      </div>
    </div>
  )
}
