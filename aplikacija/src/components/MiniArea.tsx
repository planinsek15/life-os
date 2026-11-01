import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Small 7-day area chart for the dashboard. Loaded lazily so the chart library
// (the biggest part of the app) does not delay the first paint.
export interface MiniSeries { key: string; color: string; name: string }

export default function MiniArea({ data, series, unit = '' }: {
  data: Record<string, string | number>[]
  series: MiniSeries[]
  unit?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
        <defs>
          {series.map(s => (
            <linearGradient key={s.key} id={`mini-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <XAxis dataKey="d" tick={{ fontSize: 10, fill: 'rgba(232,232,240,0.25)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#1a1a24', border: '1px solid #2a2a38', borderRadius: 10, fontSize: 12, color: '#e8e8f0' }}
          labelStyle={{ color: 'rgba(232,232,240,0.35)' }}
          formatter={(v, name) => [`${v}${unit}`, name]}
        />
        {series.map(s => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} fill={`url(#mini-${s.key})`}
            strokeWidth={2} dot={{ r: 2, fill: s.color, strokeWidth: 0 }} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
