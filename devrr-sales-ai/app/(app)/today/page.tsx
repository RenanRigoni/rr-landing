import { redirect } from 'next/navigation'
import { getCurrentOrg } from '@/lib/queries/orgs'

export default async function TodayPage() {
  const org = await getCurrentOrg()

  if (!org) {
    redirect('/onboarding')
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-content-primary">Hoje</h1>
      <p className="mt-2 text-sm text-content-secondary">{org.name}</p>
    </div>
  )
}
