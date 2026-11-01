import { useMemo, useState, lazy, Suspense } from 'react'
import { CheckSquare, Target, Dumbbell, Moon, Heart, Briefcase, TrendingUp, Plus, BookOpen, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import type { Page } from '../components/Layout'
import { MOODS } from '../moods'

const MiniArea = lazy(() => import('../components/MiniArea'))
import { format, subDays, parseISO } from 'date-fns'

const HOUR_GREETINGS: Record<number, string> = {
  5: 'Early bird', 6: 'Early bird', 7: 'Good morning', 8: 'Good morning',
  9: 'Good morning', 10: 'Good morning', 11: 'Good morning',
  12: 'Good afternoon', 13: 'Good afternoon', 14: 'Good afternoon',
  15: 'Good afternoon', 16: 'Good afternoon', 17: 'Good evening',
  18: 'Good evening', 19: 'Good evening', 20: 'Good evening',
  21: 'Night mode', 22: 'Night mode', 23: 'Night mode', 0: 'Still up?',
  1: 'Still up?', 2: 'Still up?', 3: 'Insomniac', 4: 'Insomniac',
}

interface DashboardProps { setPage: (p: Page) => void }

export default function Dashboard({ setPage }: DashboardProps) {
  const { t, lang, dateLocale } = useT()
  const { data, saveJournal } = useStore()
  const h = new Date().getHours()
  const greeting = t(HOUR_GREETINGS[h] ?? 'Hey')

  const today = format(new Date(), 'yyyy-MM-dd')
  // Same rule as the tablet page: due today, or created today (local time) without a due date.
  const todayTodos = data.todos.filter(t =>
    t.dueDate ? t.dueDate === today : format(parseISO(t.createdAt), 'yyyy-MM-dd') === today)
  const doneTodos  = todayTodos.filter(t => t.completed).length
  const pct = todayTodos.length > 0 ? Math.round((doneTodos / todayTodos.length) * 100) : 0

  const weekWorkouts = data.workouts.filter(w => parseISO(w.date) >= subDays(new Date(), 7))
  const activeGoals  = data.goals.filter(g => !g.completed)
  const totalFails   = data.goals.reduce((s, g) => s + g.failCount, 0)

  const avgSleep = useMemo(() => {
    const r = data.sleep.slice(-7)
    return r.length ? (r.reduce((s, x) => s + x.hours, 0) / r.length).toFixed(1) : '—'
  }, [data.sleep])

  // Journal one-liner (same entry the Journal page edits)
  const todayJournal = (data.journal ?? []).find(j => j.date === today)
  const [jMood, setJMood] = useState(3)
  const [jLine, setJLine] = useState('')
  const saveLine = (e: React.FormEvent) => {
    e.preventDefault()
    if (!jLine.trim()) return
    saveJournal({ date: today, mood: jMood, line: jLine.trim() })
    setJLine('')
  }

  const lastHealth = [...data.health].sort((a, b) => b.date.localeCompare(a.date))[0]

  const sleepData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
    const l = data.sleep.find(s => s.date === d)
    return { d: format(subDays(new Date(), 6 - i), 'EEE', { locale: dateLocale }), v: l?.hours || 0 }
  }), [data.sleep, dateLocale])

  const moodData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
    const l = data.health.find(h => h.date === d)
    return { d: format(subDays(new Date(), 6 - i), 'EEE', { locale: dateLocale }), m: l?.mood || 0, e: l?.energy || 0 }
  }), [data.health, dateLocale])

  const C = {
    bg:    '#0e0e12',
    card:  '#13131a',
    border:'#1e1e28',
    text:  '#e8e8f0',
    muted: 'rgba(232,232,240,0.35)',
    dim:   'rgba(232,232,240,0.15)',
  }


  return (
    <div style={{ padding: '28px 28px 28px', maxWidth: 1200, margin: '0 auto' }} className="fade-up page">

      {/* ── Hero Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ color: C.muted, fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            {greeting} — {format(new Date(), lang === 'sl' ? 'EEEE, d. MMM' : 'EEEE, MMM d', { locale: dateLocale })}
          </p>
          <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, color: C.text, letterSpacing: -1, lineHeight: 1.1 }}>
            {data.userName}<span style={{ color: '#f59e0b' }}>.</span>
          </h1>
        </div>
        {todayTodos.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 6, fontWeight: 600, letterSpacing: 1 }}>{t('TODAY')}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: pct === 100 ? '#10b981' : C.text, letterSpacing: -1 }}>{pct}%</div>
            <div style={{ height: 3, width: 80, background: '#1e1e28', borderRadius: 2, marginTop: 6, marginLeft: 'auto' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : '#f59e0b', borderRadius: 2, transition: 'width 0.6s' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Bento Grid ── */}
      <div className="bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'auto', gap: 12 }}>

        {/* 0. Journal one-liner — first on phones, bottom row on desktop */}
        <div className="card" style={{ gridColumn: '1 / 5', gridRow: '4', padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="section-label">{t('Today in one line')}</span>
            <BookOpen size={15} color="rgba(167,139,250,0.7)" strokeWidth={2} />
          </div>
          {todayJournal ? (
            <div onClick={() => setPage('journal')} style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ fontSize: 26 }}>{MOODS[todayJournal.mood - 1]}</span>
              <span style={{ color: C.text, fontSize: 14, lineHeight: 1.5, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{todayJournal.line}</span>
              <Check size={16} color="#10b981" />
            </div>
          ) : (
            <form onSubmit={saveLine} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {MOODS.map((m, i) => (
                  <button key={m} type="button" className="icon-btn" onClick={() => setJMood(i + 1)} style={{
                    background: jMood === i + 1 ? 'rgba(167,139,250,0.15)' : 'none', border: 'none', borderRadius: 10,
                    fontSize: 20, cursor: 'pointer', opacity: jMood === i + 1 ? 1 : 0.45, padding: 4,
                  }}>{m}</button>
                ))}
              </div>
              <input value={jLine} onChange={e => setJLine(e.target.value)} maxLength={200}
                placeholder={t('How was today? One line is enough.')}
                style={{ flex: '1 1 220px', minWidth: 0, padding: '11px 14px', borderRadius: 12, fontSize: 14 }} />
              <button type="submit" disabled={!jLine.trim()} style={{
                minHeight: 44, padding: '0 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'rgba(167,139,250,0.15)', color: '#a78bfa', fontWeight: 700, fontSize: 14,
                opacity: jLine.trim() ? 1 : 0.5,
              }}>{t('Save')}</button>
            </form>
          )}
        </div>

        {/* 1. Tasks — tall left */}
        <div
          className="card card-lift"
          style={{ gridColumn: '1', gridRow: '1 / 3', padding: 22, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
          onClick={() => setPage('todos')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="section-label">{t('Daily Tasks')}</span>
            <CheckSquare size={15} color="rgba(245,158,11,0.6)" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 'clamp(36px,5vw,52px)', fontWeight: 900, color: C.text, letterSpacing: -2, lineHeight: 1 }}>
            {doneTodos}<span style={{ color: C.dim, fontWeight: 400, fontSize: '55%' }}>/{todayTodos.length}</span>
          </div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 6, fontWeight: 500 }}>{t('completed today')}</div>
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            {data.todos.filter(t => !t.completed).slice(0, 4).map(todo => (
              <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: todo.priority === 'high' ? '#ef4444' : todo.priority === 'medium' ? '#f59e0b' : '#10b981'
                }} />
                <span style={{ color: C.muted, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{todo.text}</span>
              </div>
            ))}
            {data.todos.length === 0 && (
              <div style={{ color: C.dim, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Plus size={12} color="#f59e0b" />
                <span>{t('Add your first task')}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Goals */}
        <div
          className="card card-lift"
          style={{ gridColumn: '2 / 4', gridRow: '1', padding: 22, cursor: 'pointer' }}
          onClick={() => setPage('goals')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="section-label">{t('Goals & Fails')}</span>
            <Target size={15} color="rgba(239,68,68,0.6)" strokeWidth={2} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
            <div>
              <div style={{ fontSize: 'clamp(36px,4vw,48px)', fontWeight: 900, color: '#ef4444', letterSpacing: -2, lineHeight: 1 }}>
                {totalFails}
              </div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 4, fontWeight: 500 }}>{t('total fails = progress')}</div>
            </div>
            <div style={{ borderLeft: '1px solid #1e1e28', paddingLeft: 20 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -1 }}>{activeGoals.length}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{t('active goals')}</div>
            </div>
          </div>
          {activeGoals.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeGoals.slice(0, 2).map(g => (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: C.muted, fontSize: 12 }}>{g.title}</span>
                    <span style={{ color: C.dim, fontSize: 11 }}>{g.failCount}/{g.failTarget}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(100,(g.failCount/g.failTarget)*100)}%`, background: '#ef4444' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeGoals.length === 0 && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: C.dim, fontSize: 12 }}>
              <Plus size={12} color="#ef4444" /><span>{t('Set your first goal')}</span>
            </div>
          )}
        </div>

        {/* 3. Workout */}
        <div
          className="card card-lift"
          style={{ gridColumn: '4', gridRow: '1', padding: 22, cursor: 'pointer' }}
          onClick={() => setPage('workout')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="section-label">{t('Workout')}</span>
            <Dumbbell size={15} color="rgba(249,115,22,0.6)" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 'clamp(32px,4vw,44px)', fontWeight: 900, color: C.text, letterSpacing: -1, lineHeight: 1 }}>
            {weekWorkouts.length}
          </div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{t('sessions this week')}</div>
          {weekWorkouts.length > 0 && (
            <div style={{ marginTop: 10, color: '#f97316', fontSize: 12, fontWeight: 600 }}>
              🔥 {weekWorkouts.reduce((s,w) => s+w.calories,0).toLocaleString()} {t('kcal burned')}
            </div>
          )}
        </div>

        {/* 4. Sleep Chart */}
        <div className="card" style={{ gridColumn: '2 / 4', gridRow: '2', padding: 22, cursor: 'pointer' }} onClick={() => setPage('sleep')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Moon size={15} color="rgba(99,102,241,0.8)" strokeWidth={2} />
              <span className="section-label">{t('Sleep')}</span>
            </div>
            <span style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '2px 8px', fontSize: 11, color: '#818cf8', fontWeight: 700 }}>
              {avgSleep}h {t('avg')}
            </span>
          </div>
          <Suspense fallback={<div style={{ height: 80 }} />}>
            <MiniArea data={sleepData} unit="h" series={[{ key: 'v', color: '#6366f1', name: t('Sleep') }]} />
          </Suspense>
        </div>

        {/* 5. Health / Mood */}
        <div className="card card-lift" style={{ gridColumn: '4', gridRow: '2', padding: 22, cursor: 'pointer' }} onClick={() => setPage('health')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="section-label">{t('Health')}</span>
            <Heart size={15} color="rgba(16,185,129,0.6)" strokeWidth={2} />
          </div>
          {lastHealth ? (
            <>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#10b981', letterSpacing: -1, lineHeight: 1 }}>{lastHealth.mood}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{t('mood / 10')}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#eab308' }}>{lastHealth.energy}</div>
                  <div style={{ color: C.dim, fontSize: 10 }}>{t('energy')}</div>
                </div>
                {lastHealth.waterIntake && (
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#06b6d4' }}>{lastHealth.waterIntake}L</div>
                    <div style={{ color: C.dim, fontSize: 10 }}>{t('water')}</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: C.dim, fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={12} color="#10b981" /><span>{t('Log health')}</span>
            </div>
          )}
        </div>

        {/* 6. Brands */}
        <div className="card" style={{ gridColumn: '1 / 3', gridRow: '3', padding: 22, cursor: 'pointer' }} onClick={() => setPage('brands')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={15} color="rgba(6,182,212,0.7)" strokeWidth={2} />
              <span className="section-label">{t('Brands')}</span>
            </div>
            {data.brands.length > 0 && (
              <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>
                ${data.brands.reduce((s,b) => s+(b.revenue||0),0).toLocaleString()}
              </span>
            )}
          </div>
          {data.brands.length === 0 ? (
            <div style={{ color: C.dim, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={12} color="#06b6d4" /><span>{t('Add your first brand/project')}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {data.brands.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0e0e12', border: '1px solid #1e1e28', borderRadius: 10, padding: '7px 12px' }}>
                  <span style={{ fontSize: 18 }}>{b.icon}</span>
                  <div>
                    <div style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                    <div style={{ color: C.dim, fontSize: 11 }}>{t(b.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7. Mood chart */}
        <div className="card" style={{ gridColumn: '3 / 5', gridRow: '3', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={15} color="rgba(16,185,129,0.6)" strokeWidth={2} />
              <span className="section-label">{t('Mood & Energy')}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: C.dim, fontWeight: 600 }}>
              <span>● <span style={{ color: '#10b981' }}>{t('Mood')}</span></span>
              <span>● <span style={{ color: '#eab308' }}>{t('Energy')}</span></span>
            </div>
          </div>
          <Suspense fallback={<div style={{ height: 80 }} />}>
            <MiniArea data={moodData} series={[{ key: 'm', color: '#10b981', name: t('Mood') }, { key: 'e', color: '#eab308', name: t('Energy') }]} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
