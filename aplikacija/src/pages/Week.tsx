import { useState } from 'react'
import { ArrowUp, ArrowDown, Minus, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO, startOfWeek, addDays, subWeeks } from 'date-fns'
import { useStore } from '../store/useStore'
import type { AppData, WeeklyReport } from '../store/useStore'
import { useT } from '../i18n'

const C = { card:'#13131a', border:'#1e1e28', text:'#e8e8f0', muted:'rgba(232,232,240,0.4)', dim:'rgba(232,232,240,0.15)' }
const ACCENT = '#22d3ee'

// Same week rules as the server script (streznik/lifeos-porocilo), so the numbers match the report.
function weekStats(d: AppData, start: Date) {
  const a = format(start, 'yyyy-MM-dd'), b = format(addDays(start, 6), 'yyyy-MM-dd')
  const inW = (day?: string) => !!day && day.slice(0, 10) >= a && day.slice(0, 10) <= b
  const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length * 10) / 10 : null
  const todos = d.todos.filter(t => inW(t.dueDate || t.createdAt))
  const wk = d.workouts.filter(w => inW(w.date))
  const sl = d.sleep.filter(s => inW(s.date))
  const he = d.health.filter(h => inW(h.date))
  return {
    tasks: todos.filter(t => t.completed).length,
    tasksAll: todos.length,
    workouts: wk.length,
    minutes: wk.reduce((s, w) => s + (w.duration || 0), 0),
    sleep: avg(sl.map(s => s.hours || 0)),
    journal: (d.journal ?? []).filter(j => inW(j.date)).length,
    attempts: d.goals.flatMap(g => g.attempts ?? []).filter(x => inW(x.at)).length,
    steps: avg(he.filter(h => h.steps).map(h => h.steps!)),
  }
}

function Delta({ now, before, lowerIsBetter = false }: { now: number | null; before: number | null; lowerIsBetter?: boolean }) {
  if (now === null || before === null || now === before) return <Minus size={14} color={C.dim} />
  const up = now > before
  const good = lowerIsBetter ? !up : up
  const Icon = up ? ArrowUp : ArrowDown
  return <Icon size={14} color={good ? '#10b981' : '#ef4444'} />
}

function ReportCard({ r, open, onToggle }: { r: WeeklyReport; open: boolean; onToggle: () => void }) {
  const { t, lang, dateLocale } = useT()
  const fmt = (s: string) => format(parseISO(s), lang === 'sl' ? 'd. MMM' : 'MMM d', { locale: dateLocale })
  const color = (r.ocena ?? 0) >= 7 ? '#10b981' : (r.ocena ?? 0) >= 4 ? '#f59e0b' : '#ef4444'
  return (
    <div className="card" style={{ padding:18, marginBottom:12 }}>
      <div onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:14, cursor:'pointer' }}>
        <div style={{ fontSize:30, fontWeight:900, color, letterSpacing:-1, minWidth:54, textAlign:'center' }}>
          {r.ocena ?? '—'}<span style={{ fontSize:13, color:C.dim, fontWeight:600 }}>/10</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:C.dim, fontSize:11, fontWeight:700, letterSpacing:0.5 }}>
            {fmt(r.from)} – {fmt(r.to)}
            {r.boljse === true && <span style={{ color:'#10b981', marginLeft:8 }}>▲ {t('better')}</span>}
            {r.boljse === false && <span style={{ color:'#ef4444', marginLeft:8 }}>▼ {t('worse')}</span>}
          </div>
          <div style={{ color:C.text, fontSize:14, lineHeight:1.5, marginTop:3 }}>{r.povzetek}</div>
        </div>
        {open ? <ChevronUp size={16} color={C.muted}/> : <ChevronDown size={16} color={C.muted}/>}
      </div>
      {open && (
        <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:12, fontSize:13, lineHeight:1.6 }}>
          {r.dobro.length > 0 && <div>
            <div className="section-label" style={{ color:'#10b981', marginBottom:4 }}>{t('Went well')}</div>
            {r.dobro.map((x, i) => <div key={i} style={{ color:C.text }}>✓ {x}</div>)}
          </div>}
          {r.izboljsaj.length > 0 && <div>
            <div className="section-label" style={{ color:'#f59e0b', marginBottom:4 }}>{t('Improve')}</div>
            {r.izboljsaj.map((x, i) => <div key={i} style={{ color:C.text }}>→ {x}</div>)}
          </div>}
          {r.fokus && <div style={{ background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', borderRadius:12, padding:'10px 14px' }}>
            <div className="section-label" style={{ color:ACCENT, marginBottom:4 }}>{t('Focus for next week')}</div>
            <div style={{ color:C.text, fontWeight:600 }}>{r.fokus}</div>
          </div>}
        </div>
      )}
    </div>
  )
}

export default function Week() {
  const { data } = useStore()
  const { t } = useT()
  const thisStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const now = weekStats(data, thisStart)
  const before = weekStats(data, subWeeks(thisStart, 1))
  const reports = [...(data.reports ?? [])].sort((a, b) => b.week.localeCompare(a.week))
  const [openId, setOpenId] = useState<string | null>(reports[0]?.id ?? null)

  const rows: [string, number | null, number | null, string?][] = [
    [t('Tasks done'), now.tasks, before.tasks, `/${now.tasksAll}`],
    [t('Workouts'), now.workouts, before.workouts],
    [t('Workout minutes'), now.minutes, before.minutes],
    [t('Avg sleep (h)'), now.sleep, before.sleep],
    [t('Journal days'), now.journal, before.journal, '/7'],
    [t('Goal attempts'), now.attempts, before.attempts],
    [t('Avg steps'), now.steps, before.steps],
  ]

  return (
    <div style={{ padding:'28px 28px 40px', maxWidth:760, margin:'0 auto' }} className="fade-up page">
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.muted, marginBottom:6 }}>{t('WEEKLY REVIEW')}</div>
        <h1 style={{ fontSize:'clamp(28px,4vw,38px)', fontWeight:900, color:C.text, letterSpacing:-1 }}>
          {t('Better than')} <span style={{ color:ACCENT }}>{t('last week')}</span><span style={{ color:'rgba(232,232,240,0.3)' }}>?</span>
        </h1>
      </div>

      {/* This week vs last week */}
      <div className="card" style={{ padding:'6px 18px', marginBottom:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto 20px', gap:'0 14px', alignItems:'center' }}>
          <span />
          <span style={{ color:C.dim, fontSize:10, fontWeight:700, letterSpacing:1, padding:'10px 0', textAlign:'right' }}>{t('THIS WEEK')}</span>
          <span style={{ color:C.dim, fontSize:10, fontWeight:700, letterSpacing:1, textAlign:'right' }}>{t('LAST')}</span>
          <span />
          {rows.map(([label, n, b, suffix]) => [
            <span key={label + 'l'} style={{ color:C.muted, fontSize:13, padding:'9px 0', borderTop:`1px solid ${C.border}` }}>{label}</span>,
            <span key={label + 'n'} style={{ color:C.text, fontSize:15, fontWeight:800, textAlign:'right', padding:'9px 0', borderTop:`1px solid ${C.border}` }}>
              {n ?? '—'}{suffix && n !== null && <span style={{ color:C.dim, fontSize:11, fontWeight:600 }}>{suffix}</span>}
            </span>,
            <span key={label + 'b'} style={{ color:C.dim, fontSize:13, textAlign:'right', padding:'9px 0', borderTop:`1px solid ${C.border}` }}>{b ?? '—'}</span>,
            <span key={label + 'd'} style={{ padding:'9px 0', borderTop:`1px solid ${C.border}`, display:'flex' }}><Delta now={n} before={b} /></span>,
          ])}
        </div>
      </div>

      {/* Score trend */}
      {reports.length > 1 && (
        <div className="card" style={{ padding:18, marginBottom:20 }}>
          <div className="section-label" style={{ marginBottom:12 }}>{t('Score trend')}</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:70 }}>
            {[...reports].reverse().slice(-12).map(r => (
              <div key={r.id} title={`${r.week}: ${r.ocena}/10`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ width:'100%', maxWidth:28, height:`${(r.ocena ?? 0) * 6}px`, borderRadius:4,
                  background:(r.ocena ?? 0) >= 7 ? '#10b981' : (r.ocena ?? 0) >= 4 ? '#f59e0b' : '#ef4444' }} />
                <span style={{ color:C.dim, fontSize:9 }}>{r.week.slice(-3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claude reports */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <Sparkles size={15} color={ACCENT} />
        <span className="section-label">{t('Claude reports')}</span>
      </div>
      {reports.length === 0 ? (
        <div className="card" style={{ padding:'32px 20px', textAlign:'center', color:C.dim, fontSize:14, lineHeight:1.6 }}>
          {t('The first report arrives on Sunday at 19:00.')}
        </div>
      ) : reports.map(r => (
        <ReportCard key={r.id} r={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} />
      ))}
    </div>
  )
}
