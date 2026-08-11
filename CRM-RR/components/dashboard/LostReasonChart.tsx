'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface LostReasonRow {
  label: string
  deals_lost: number
  value_lost_cents: number
}

export function LostReasonChart({ data }: { data: LostReasonRow[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-content-secondary">Nenhuma oportunidade perdida ainda.</p>
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
          <XAxis type="number" stroke="#64748B" fontSize={11} allowDecimals={false} />
          <YAxis type="category" dataKey="label" stroke="#64748B" fontSize={11} width={140} />
          <Tooltip
            contentStyle={{ background: '#10101E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
            labelStyle={{ color: '#F1F5F9' }}
            formatter={(value) => [`${value} deals`, 'Perdidos']}
          />
          <Bar dataKey="deals_lost" fill="#F87171" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
