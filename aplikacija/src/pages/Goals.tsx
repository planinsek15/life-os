import { useState } from 'react'
import { Target, Plus, Trash2, X, Flame, Trophy, CheckCircle2, Circle, ChevronDown, ChevronUp, AlertTriangle, Zap } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import type { GoalCategory, Goal } from '../store/useStore'
import { format, parseISO } from 'date-fns'

const CAT_ICON: Record<GoalCategory, string> = {
  health: '❤️', fitness: '💪', business: '🚀', personal: '🌟', learning: '🧠', finance: '💰'
}
const CAT_COLOR: Record<GoalCategory, string> = {
  health: '#10b981', fitness: '#f97316', business: '#f59e0b',
  personal: '#ec4899', learning: '#6366f1', finance: '#eab308'
}

const C = {
  bg: '#0e0e12', card: '#13131a', border: '#1e1e28',
  text: '#e8e8f0', muted: 'rgba(232,232,240,0.4)', dim: 'rgba(232,232,240,0.15)',
}

/* ── Fail Counter Hero ── */
function FailHero({ goal, onFail }: { goal: Goal; onFail: () => void }) {
  const { t } = useT()
  const [burst, setBurst] = useState(false)
  const pct = Math.min(100, Math.round((goal.failCount / goal.failTarget) * 100))
  const left = goal.failTarget - goal.failCount

  const handleFail = () => {
    if (goal.completed) return
    setBurst(true); setTimeout(() => setBurst(false), 500)
    onFail()
  }

  const motivMsg = () => {
    if (goal.failCount === 0) return t('Every fail is a rep. Start failing!')
    if (pct < 20) return t('Early days. Each fail means you tried.')
    if (pct < 40) return t('Building momentum. Keep going.')
    if (pct < 60) return t('Past the halfway mark. Most people quit here.')
    if (pct < 80) return t("You're in rare territory. Don't stop now.")
    if (pct < 100) return t("Only {n} fails left. You're almost there!", { n: left })
    return t("🏆 You've earned it through relentless persistence.")
  }

  return (
    <div style={{ background: '#0a0a0e', border: '1px solid #1e1e28', borderRadius: 20, padding: 24, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Big counter */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.muted, marginBottom: 8 }}>
            {t('FAIL COUNTER')}
          </div>
          <div
            className={burst ? 'fail-burst' : ''}
            style={{ fontSize: 'clamp(56px,10vw,96px)', fontWeight: 900, lineHeight: 1, letterSpacing: -3, color: goal.completed ? '#10b981' : '#ef4444' }}
          >
            {goal.failCount}
          </div>
          <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
            {t('out of')} <strong style={{ color: C.text }}>{goal.failTarget}</strong> {t('fails needed')}
          </div>
          {!goal.completed && left > 0 && (
            <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>
              {left} {t('more to go')}
            </div>
          )}
        </div>

        {/* Fail button */}
        {!goal.completed ? (
          <button
            onClick={handleFail}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '20px 24px', borderRadius: 18,
              background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.25)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.5)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.25)' }}
          >
            <Flame size={36} color="#ef4444" strokeWidth={1.5} />
            <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>{t('I FAILED')}</span>
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 24px' }}>
            <Trophy size={42} color="#f59e0b" strokeWidth={1.5} />
            <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: 13 }}>{t('ACHIEVED')}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: C.dim, fontSize: 11 }}>0</span>
          <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>{pct}% {t('of goal')}</span>
          <span style={{ color: C.dim, fontSize: 11 }}>{goal.failTarget} {t('fails')}</span>
        </div>
        <div style={{ height: 8, background: '#1e1e28', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${pct}%`,
            background: goal.completed
              ? '#10b981'
              : `linear-gradient(90deg, ${CAT_COLOR[goal.category]}, #ef4444)`,
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      </div>

      {/* Motivation */}
      <div style={{ marginTop: 14, padding: '10px 14px', background: '#13131a', borderRadius: 12, border: '1px solid #1e1e28' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <Zap size={13} color="#f59e0b" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>{motivMsg()}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Add Modal ── */
function AddGoalModal({ onClose, onAdd }: {
  onClose: () => void
  onAdd: (g: Omit<Goal, 'id'|'createdAt'|'failCount'|'progress'|'completed'|'milestones'>) => void
}) {
  const { t } = useT()
  const [form, setForm] = useState({
    title: '', description: '',
    category: 'personal' as GoalCategory,
    targetDate: format(new Date(Date.now() + 90*86400000), 'yyyy-MM-dd'),
    failTarget: 100, color: '',
    attemptTarget: '', attemptUnit: '',
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const { attemptTarget, attemptUnit, ...rest } = form
    onAdd({
      ...rest, color: `linear-gradient(90deg, ${CAT_COLOR[form.category]}, #ef4444)`,
      ...(Number(attemptTarget) > 0 ? { attemptTarget: Number(attemptTarget), attemptUnit: attemptUnit.trim() } : {}),
    })
    onClose()
  }

  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex: 60 }} />
      <div className="modal-wrap" style={{
        position: 'fixed', inset: 0, zIndex: 61, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}>
        <div className="modal" style={{ width: '100%', maxWidth: 480, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ color: C.text, fontWeight: 800, fontSize: 20 }}>{t('New Goal')}</h2>
            <button onClick={onClose} className="icon-btn" style={{ background:'none', border:'none', cursor: 'pointer', color: C.muted }}>
              <X size={20} />
            </button>
          </div>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>{t('GOAL *')}</label>
              <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                placeholder={t('e.g. Launch my SaaS')} required autoFocus
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>{t('DESCRIPTION')}</label>
              <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                placeholder={t('What does success look like?')}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14, resize: 'none' }} rows={2} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>{t('CATEGORY')}</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value as GoalCategory}))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14 }}>
                  {(Object.keys(CAT_ICON) as GoalCategory[]).map(c => (
                    <option key={c} value={c}>{CAT_ICON[c]} {t(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>{t('TARGET DATE')}</label>
                <input type="date" value={form.targetDate} onChange={e => setForm(f => ({...f, targetDate: e.target.value}))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14 }} />
              </div>
            </div>

            {/* One attempt = reach this (optional) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>{t('ONE ATTEMPT = REACH')}</label>
                <input type="number" min={1} value={form.attemptTarget} onChange={e => setForm(f => ({...f, attemptTarget: e.target.value}))}
                  placeholder={t('e.g. 10 (optional)')}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>{t('UNIT')}</label>
                <input value={form.attemptUnit} onChange={e => setForm(f => ({...f, attemptUnit: e.target.value}))}
                  placeholder={t('e.g. clean pull-ups')}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14 }} />
              </div>
            </div>

            {/* Fail target slider */}
            <div>
              <label style={{ display: 'block', color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>
                FAIL TARGET: <span style={{ color: '#ef4444', fontSize: 18, fontWeight: 900 }}>{form.failTarget}</span>
              </label>
              <input type="range" min={10} max={500} step={10}
                value={form.failTarget} onChange={e => setForm(f => ({...f, failTarget: Number(e.target.value)}))}
                style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: C.dim, fontSize: 11, marginTop: 4 }}>
                <span>10</span><span>250</span><span>500</span>
              </div>
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <AlertTriangle size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
                    Your goal: fail <strong style={{ color: '#ef4444' }}>{form.failTarget} times</strong>. Each fail = one attempt.
                    {t("Fail fast enough and you'll reach success before someone who never tried.")}
                  </p>
                </div>
              </div>
            </div>

            <button type="submit" style={{
              padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              color: '#fff', fontWeight: 800, fontSize: 15, marginTop: 4,
            }}>
              {t('Create Goal')}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

/* ── Goal Card ── */
function GoalCard({ goal, onFail, onDelete, onToggleMilestone, onAddMilestone }: {
  goal: Goal; onFail: () => void; onDelete: () => void
  onToggleMilestone: (mId: string) => void; onAddMilestone: (t: string) => void
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [msInput, setMsInput] = useState('')

  const addMs = () => { if (!msInput.trim()) return; onAddMilestone(msInput.trim()); setMsInput('') }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Color top bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${CAT_COLOR[goal.category]}, #ef4444)` }} />
      <div style={{ padding: '18px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{CAT_ICON[goal.category]}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>{goal.title}</span>
                {goal.completed && <Trophy size={14} color="#f59e0b" />}
              </div>
              {goal.description && <p style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>{goal.description}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', color: C.muted }}>
                  {goal.category}
                </span>
                <span style={{ fontSize: 11, color: C.dim }}>
                  by {format(parseISO(goal.targetDate), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setOpen(!open)} className="icon-btn" style={{ background:'none', border:'none', cursor: 'pointer', color: C.muted, padding: 4 }}>
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={onDelete} className="icon-btn" style={{ background:'none', border:'none', cursor: 'pointer', color: C.dim, padding: 4 }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color='#ef4444'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color=C.dim}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Compact fail row (collapsed) */}
        {!open && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>{goal.failCount}</span>
                <span style={{ color: C.dim, fontSize: 12, alignSelf: 'flex-end' }}>/{goal.failTarget} {t('fails')}</span>
              </div>
              <div style={{ height: 6, background: '#1e1e28', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, transition: 'width 0.5s',
                  width: `${Math.min(100, Math.round((goal.failCount / goal.failTarget) * 100))}%`,
                  background: goal.completed ? '#10b981' : `linear-gradient(90deg, ${CAT_COLOR[goal.category]}, #ef4444)`,
                }} />
              </div>
            </div>
            {!goal.completed && (
              <button className="tap-btn" onClick={onFail} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.08)', cursor: 'pointer', color: '#ef4444',
                fontWeight: 700, fontSize: 13, transition: 'all 0.12s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(239,68,68,0.18)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(239,68,68,0.08)' }}>
                <Flame size={15} />
                {t('FAIL')}
              </button>
            )}
          </div>
        )}

        {/* Expanded */}
        {open && (
          <div className="fade-up">
            <FailHero goal={goal} onFail={onFail} />

            {/* Milestones */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.dim, marginBottom: 10 }}>{t('MILESTONES')}</div>
              {goal.milestones.map(m => (
                <button key={m.id} onClick={() => onToggleMilestone(m.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 12px', borderRadius: 10, marginBottom: 4,
                  background: '#0e0e12', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                }}>
                  {m.completed
                    ? <CheckCircle2 size={15} color="#10b981" />
                    : <Circle size={15} color={C.dim} />
                  }
                  <span style={{ color: m.completed ? C.dim : C.muted, fontSize: 13, textDecoration: m.completed ? 'line-through' : 'none' }}>{m.text}</span>
                </button>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={msInput} onChange={e => setMsInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMs()}
                  placeholder={t('Add milestone...')}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 13 }} />
                <button onClick={addMs} style={{
                  padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600, fontSize: 13,
                }}>{t('Add')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Page ── */
export default function Goals() {
  const { t } = useT()
  const { data, addGoal, deleteGoal, incrementFail, addMilestone, toggleMilestone } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all'|'active'|'done'>('all')

  const filtered = data.goals
    .filter(g => filter === 'all' || (filter === 'active' ? !g.completed : g.completed))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const totalFails = data.goals.reduce((s, g) => s + g.failCount, 0)
  const done = data.goals.filter(g => g.completed).length

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 860, margin: '0 auto' }} className="fade-up page">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.muted, marginBottom: 6 }}>{t('GOALS & FAILS')}</div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,38px)', fontWeight: 900, color: C.text, letterSpacing: -1, lineHeight: 1 }}>
            {t('Fail your way')}<br />{t('to')} <span style={{ color: '#ef4444' }}>{t('success')}</span><span style={{ color: '#f59e0b' }}>.</span>
          </h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>
            {t('Set a goal. Track every failed attempt. Fail {n}× = achieved.', { n: data.goals[0]?.failTarget ?? 100 })}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            color: '#fff', fontWeight: 700, fontSize: 14,
            boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          {t('New Goal')}
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: t('Goals'), value: data.goals.length, color: C.text },
          { label: t('Total Fails'), value: totalFails, color: '#ef4444' },
          { label: t('Achieved'), value: done, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: s.color, letterSpacing: -1, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: C.dim, fontSize: 12, marginTop: 4, fontWeight: 600, letterSpacing: 0.5 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Philosophy banner (empty state) */}
      {data.goals.length === 0 && (
        <div style={{ background: '#13131a', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 18, padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 40, flexShrink: 0 }}>💡</div>
            <div>
              <h3 style={{ color: C.text, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{t('The Fail 100× Method')}</h3>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
                {t("Don't set a success target. Set a")} <strong style={{ color: '#ef4444' }}>{t('fail target')}</strong>.
                {t('Every rejection, bad pitch, failed workout, or missed shot counts as a fail.')}
                By the time you hit 100 fails you'll have the experience, data, and resilience to win.
                <br/><br/>
                Most people quit after 3 failures. You're aiming for 100.
              </p>
              <button onClick={() => setShowAdd(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                color: '#fff', fontWeight: 700, fontSize: 14,
              }}>
                <Target size={15} />Set your first goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {data.goals.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['all','active','done'] as const).map(f => (
            <button className="tap-btn" key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 16px', borderRadius: 10, border: `1px solid ${filter===f ? 'rgba(245,158,11,0.3)' : '#1e1e28'}`,
              background: filter===f ? 'rgba(245,158,11,0.1)' : 'transparent',
              color: filter===f ? '#f59e0b' : C.muted,
              fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>
      )}

      {/* Goals list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onFail={() => {
              if (!goal.attemptTarget) return incrementFail(goal.id)
              const v = prompt(`How many ${goal.attemptUnit || ''} did you reach? (target ${goal.attemptTarget})`)
              if (v !== null && v.trim() !== '' && !isNaN(Number(v))) incrementFail(goal.id, Number(v))
            }}
            onDelete={() => deleteGoal(goal.id)}
            onToggleMilestone={mId => toggleMilestone(goal.id, mId)}
            onAddMilestone={t => addMilestone(goal.id, t)}
          />
        ))}
      </div>

      {showAdd && (
        <AddGoalModal
          onClose={() => setShowAdd(false)}
          onAdd={g => addGoal(g)}
        />
      )}
    </div>
  )
}
