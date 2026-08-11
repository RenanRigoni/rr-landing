import { createClient } from '@/lib/supabase/server'

export interface MyDayActivity {
  id: string
  subject: string
  type: string
  due_at: string | null
  deal_id: string | null
  deal_title: string | null
  company_name: string | null
}

export interface MyDayDeal {
  id: string
  title: string
  value_cents: number
  company_name: string | null
  stage_name: string | null
  last_activity_at: string | null
  qualification_score: number | null
}

export interface MyDayData {
  overdue: MyDayActivity[]
  today: MyDayActivity[]
  noNextAction: MyDayDeal[]
  stale: MyDayDeal[]
  highPriority: MyDayDeal[]
}

const STALE_THRESHOLD_DAYS = 14
const HIGH_PRIORITY_SCORE_THRESHOLD = 70

export async function getMyDayData(): Promise<MyDayData> {
  const supabase = await createClient()
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const { data: pendingActivities, error: activitiesError } = await supabase
    .from('activities')
    .select('id, subject, type, due_at, deal_id, deals(title, companies(company_name))')
    .eq('status', 'pending')
    .not('due_at', 'is', null)
    .order('due_at', { ascending: true })

  if (activitiesError) throw new Error(activitiesError.message)

  const overdue: MyDayActivity[] = []
  const today: MyDayActivity[] = []

  for (const activity of pendingActivities ?? []) {
    if (!activity.due_at) continue
    const dueAt = new Date(activity.due_at)
    const mapped: MyDayActivity = {
      id: activity.id,
      subject: activity.subject,
      type: activity.type,
      due_at: activity.due_at,
      deal_id: activity.deal_id,
      deal_title: activity.deals?.title ?? null,
      company_name: activity.deals?.companies?.company_name ?? null,
    }
    if (dueAt < todayStart) overdue.push(mapped)
    else if (dueAt <= todayEnd) today.push(mapped)
  }

  const { data: openDeals, error: dealsError } = await supabase
    .from('deals')
    .select('id, title, value_cents, created_at, qualification_score, companies(company_name), pipeline_stages(name)')
    .eq('status', 'open')

  if (dealsError) throw new Error(dealsError.message)

  const dealIds = (openDeals ?? []).map((d) => d.id)
  const lastActivityByDeal = new Map<string, string>()
  const pendingByDeal = new Set<string>()

  if (dealIds.length > 0) {
    const { data: allActivities } = await supabase
      .from('activities')
      .select('deal_id, status, created_at, completed_at')
      .in('deal_id', dealIds)
      .order('created_at', { ascending: false })

    for (const activity of allActivities ?? []) {
      if (!activity.deal_id) continue
      if (activity.status === 'pending') pendingByDeal.add(activity.deal_id)
      const at = activity.completed_at ?? activity.created_at
      if (!lastActivityByDeal.has(activity.deal_id)) lastActivityByDeal.set(activity.deal_id, at)
    }
  }

  const noNextAction: MyDayDeal[] = []
  const stale: MyDayDeal[] = []
  const highPriority: MyDayDeal[] = []
  const staleThresholdMs = STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000

  for (const deal of openDeals ?? []) {
    const mapped: MyDayDeal = {
      id: deal.id,
      title: deal.title,
      value_cents: deal.value_cents,
      company_name: deal.companies?.company_name ?? null,
      stage_name: deal.pipeline_stages?.name ?? null,
      last_activity_at: lastActivityByDeal.get(deal.id) ?? null,
      qualification_score: deal.qualification_score,
    }

    if (!pendingByDeal.has(deal.id)) noNextAction.push(mapped)

    const referenceDate = lastActivityByDeal.get(deal.id) ?? deal.created_at
    if (now.getTime() - new Date(referenceDate).getTime() > staleThresholdMs) {
      stale.push(mapped)
    }

    if (deal.qualification_score !== null && deal.qualification_score >= HIGH_PRIORITY_SCORE_THRESHOLD) {
      highPriority.push(mapped)
    }
  }

  highPriority.sort((a, b) => (b.qualification_score ?? 0) - (a.qualification_score ?? 0))

  return { overdue, today, noNextAction, stale, highPriority }
}
