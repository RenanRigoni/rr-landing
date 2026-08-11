'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface DurationRow {
  stage_name: string
  avg_days: number | null
  transitions_out: number
}

export function StageDurationChart({ data }: { data: DurationRow[] }) {
  const withData = data.filter((d) => d.avg_days !== null)
  if (withData.length === 0) {
    return <p className="text-sm text-content-secondary">Sem transições de estágio registradas ainda.</p>
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="stage_name" stroke="#64748B" fontSize={10} angle={-20} textAnchor="end" height={60} />
          <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#10101E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
            labelStyle={{ color: '#F1F5F9' }}
            formatter={(value) => [`${value} dias`, 'Média']}
          />
          <Bar dataKey="avg_days" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
