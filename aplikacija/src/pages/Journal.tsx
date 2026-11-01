import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, Check, BookOpen } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import { MOODS } from '../moods'

const C = { card:'#13131a', border:'#1e1e28', text:'#e8e8f0', muted:'rgba(232,232,240,0.4)', dim:'rgba(232,232,240,0.15)' }
const ACCENT = '#a78bfa'

export default function Journal() {
  const { data, saveJournal, deleteJournal } = useStore()
  const { t, lang, dateLocale } = useT()
  const today = format(new Date(), 'yyyy-MM-dd')
  const journal = data.journal ?? []
  const existing = journal.find(j => j.date === today)

  const [mood, setMood] = useState(existing?.mood ?? 3)
  const [line, setLine] = useState(existing?.line ?? '')
  const [more, setMore] = useState(existing?.more ?? '')
  const [showMore, setShowMore] = useState(!!existing?.more)
  const [saved, setSaved] = useState(false)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!line.trim()) return
    saveJournal({ date: today, mood, line: line.trim(), more: more.trim() || undefined })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  // Days in a row with an entry, counting back from today (or yesterday if today is still empty).
  const dates = new Set(journal.map(j => j.date))
  let streak = 0
  for (let i = dates.has(today) ? 0 : 1; dates.has(format(subDays(new Date(), i), 'yyyy-MM-dd')); i++) streak++
  const weekAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd')
  const thisWeek = journal.filter(j => j.date >= weekAgo).length

  const q = query.trim().toLowerCase()
  const list = [...journal]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(j => !q || j.line.toLowerCase().includes(q) || (j.more ?? '').toLowerCase().includes(q))

  return (
    <div style={{ padding:'28px 28px 40px', maxWidth:760, margin:'0 auto' }} className="fade-up page">
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.muted, marginBottom:6 }}>{t('JOURNAL')}</div>
        <h1 style={{ fontSize:'clamp(28px,4vw,38px)', fontWeight:900, color:C.text, letterSpacing:-1 }}>
          {t('Write it')} <span style={{ color:ACCENT }}>{t('down')}</span><span style={{ color:'rgba(232,232,240,0.3)' }}>.</span>
        </h1>
        <p style={{ color:C.muted, fontSize:13, marginTop:6 }}>{t('One line a day. Add more only if you want.')}</p>
      </div>

      {/* Today */}
      <form onSubmit={save} className="card" style={{ padding:20, marginBottom:16, display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span className="section-label">{format(new Date(), lang==='sl' ? 'EEEE, d. MMMM' : 'EEEE, MMMM do', { locale: dateLocale })}</span>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {MOODS.map((m, i) => (
            <button key={m} type="button" className="tap-btn" onClick={() => setMood(i + 1)} style={{
              flex:1, fontSize:24, padding:'6px 0', borderRadius:12, cursor:'pointer',
              border:`1px solid ${mood === i + 1 ? ACCENT : C.border}`,
              background: mood === i + 1 ? 'rgba(167,139,250,0.12)' : 'transparent',
              filter: mood === i + 1 ? 'none' : 'grayscale(0.7)', opacity: mood === i + 1 ? 1 : 0.6,
            }}>{m}</button>
          ))}
        </div>
        <input value={line} onChange={e => setLine(e.target.value)} maxLength={200}
          placeholder={t('How was today? One line is enough.')}
          style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14 }} />
        {showMore && (
          <textarea value={more} onChange={e => setMore(e.target.value)} rows={6}
            style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14, resize:'vertical', lineHeight:1.6 }} />
        )}
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <button type="button" className="tap-btn" onClick={() => setShowMore(!showMore)} style={{
            display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer',
            color:C.muted, fontSize:13, fontWeight:600, padding:'0 4px',
          }}>
            {showMore ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
            {showMore ? t('Hide') : t('Write more (optional)')}
          </button>
          <button type="submit" disabled={!line.trim()} style={{
            marginLeft:'auto', minHeight:44, padding:'0 20px', borderRadius:12, border:'none',
            cursor: line.trim() ? 'pointer' : 'default', opacity: line.trim() ? 1 : 0.5,
            background: saved ? 'rgba(16,185,129,0.15)' : `linear-gradient(135deg, ${ACCENT}, #7c3aed)`,
            color: saved ? '#10b981' : '#fff', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:6,
          }}>
            {saved ? <><Check size={15}/>{t('Saved!')}</> : existing ? t('Update today') : t('Save today')}
          </button>
        </div>
      </form>

      {/* Stats */}
      <div className="stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
        {[[streak, t('day streak'), streak > 0 ? '#f97316' : C.muted], [journal.length, t('entries'), C.text], [thisWeek, t('this week'), ACCENT]].map(([n, label, color]) => (
          <div key={label as string} className="card" style={{ padding:'16px 12px', textAlign:'center' }}>
            <div style={{ fontSize:28, fontWeight:900, color: color as string, letterSpacing:-1 }}>{n}</div>
            <div style={{ color:C.dim, fontSize:11, fontWeight:700, letterSpacing:1, marginTop:2, textTransform:'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Entries */}
      {journal.length > 3 && (
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Search…')}
          style={{ width:'100%', padding:'11px 14px', borderRadius:12, fontSize:14, marginBottom:12 }} />
      )}
      <div className="card" style={{ overflow:'hidden' }}>
        {list.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:C.dim }}>
            <BookOpen size={36} color={C.dim} style={{ margin:'0 auto 10px' }} />
            <p style={{ fontSize:14 }}>{t('No entries yet. Start with one line today.')}</p>
          </div>
        ) : list.map(j => (
          <div key={j.id} style={{ display:'flex', gap:12, padding:'12px 14px', borderBottom:`1px solid ${C.border}`, alignItems:'flex-start' }}>
            <div style={{ fontSize:22, lineHeight:1.2 }}>{MOODS[j.mood - 1] ?? '😐'}</div>
            <div style={{ flex:1, minWidth:0, cursor: j.more ? 'pointer' : 'default' }} onClick={() => j.more && setOpenId(openId === j.id ? null : j.id)}>
              <div style={{ color:C.dim, fontSize:11, fontWeight:700, letterSpacing:0.5, marginBottom:3 }}>
                {format(parseISO(j.date), lang==='sl' ? 'EEE, d. MMM yyyy' : 'EEE, MMM d yyyy', { locale: dateLocale })}
                {j.more && <span style={{ marginLeft:6, color:ACCENT }}>{openId === j.id ? '▴' : '▾'}</span>}
              </div>
              <div style={{ color:C.text, fontSize:14, lineHeight:1.5, wordBreak:'break-word' }}>{j.line}</div>
              {openId === j.id && j.more && (
                <div style={{ color:C.muted, fontSize:13, lineHeight:1.7, marginTop:8, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{j.more}</div>
              )}
            </div>
            <button className="icon-btn" onClick={() => { if (confirm(t('Delete this entry?'))) deleteJournal(j.id) }}
              style={{ background:'none', border:'none', cursor:'pointer', color:C.dim, padding:6 }}>
              <Trash2 size={14}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
