import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import type { SleepLog } from '../store/useStore'
import { format, parseISO, subDays } from 'date-fns'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

const C = { card:'#13131a', border:'#1e1e28', text:'#e8e8f0', muted:'rgba(232,232,240,0.4)', dim:'rgba(232,232,240,0.15)' }
const Q_LABEL = ['','Terrible','Poor','Below Avg','Average','Good','Very Good','Great','Excellent','Perfect','Legendary']
const Q_COLOR = ['','#ef4444','#f97316','#eab308','#84cc16','#22c55e','#10b981','#06b6d4','#3b82f6','#6366f1','#a855f7']

function Stars({ q, onChange }: { q:number; onChange?:(v:number)=>void }) {
  return (
    <div style={{ display:'flex', gap:3 }}>
      {Array.from({length:10},(_,i)=>i+1).map(n=>(
        <button key={n} type="button" onClick={()=>onChange?.(n)} disabled={!onChange}
          style={{ background:'none', border:'none', cursor:onChange?'pointer':'default', padding:1, fontSize:13,
            color: n<=q ? '#f59e0b' : 'rgba(232,232,240,0.15)' }}>★</button>
      ))}
    </div>
  )
}

function AddModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(s:Omit<SleepLog,'id'>)=>void }) {
  const { t } = useT()
  const [form, setForm] = useState({ date:format(new Date(),'yyyy-MM-dd'), bedtime:'23:00', wakeup:'07:00', quality:7, notes:'' })
  const hours = (() => {
    const [bh,bm]=form.bedtime.split(':').map(Number), [wh,wm]=form.wakeup.split(':').map(Number)
    let m=(wh*60+wm)-(bh*60+bm); if(m<0)m+=1440
    return Math.round(m/60*10)/10
  })()
  const submit = (e:React.FormEvent) => { e.preventDefault(); onAdd({...form,hours}); onClose() }

  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex:60 }} />
      <div className="modal-wrap" style={{ position:'fixed', inset:0, zIndex:61, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div className="modal" style={{ width:'100%', maxWidth:440, padding:28 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
            <h2 style={{ color:C.text, fontWeight:800, fontSize:20 }}>{t('Log Sleep')}</h2>
            <button onClick={onClose} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.muted }}><X size={20}/></button>
          </div>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
              style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14 }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('BEDTIME')}</div>
                <input type="time" value={form.bedtime} onChange={e=>setForm(f=>({...f,bedtime:e.target.value}))}
                  style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14 }} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('WAKE UP')}</div>
                <input type="time" value={form.wakeup} onChange={e=>setForm(f=>({...f,wakeup:e.target.value}))}
                  style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14 }} />
              </div>
            </div>
            <div style={{ textAlign:'center', padding:'14px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.18)', borderRadius:14 }}>
              <div style={{ fontSize:48, fontWeight:900, color:'#6366f1', letterSpacing:-2, lineHeight:1 }}>{hours}h</div>
              <div style={{ color:C.muted, fontSize:13, marginTop:4 }}>{t('total sleep')}</div>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:8 }}>
                {t('QUALITY')}: <span style={{ color:Q_COLOR[form.quality], fontWeight:800 }}>{t(Q_LABEL[form.quality])}</span>
              </div>
              <Stars q={form.quality} onChange={v=>setForm(f=>({...f,quality:v}))} />
              <input type="range" min={1} max={10} value={form.quality}
                onChange={e=>setForm(f=>({...f,quality:Number(e.target.value)}))}
                style={{ width:'100%', marginTop:8 }} />
            </div>
            <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
              placeholder={t('Notes (optional)')} style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14 }} />
            <button type="submit" style={{
              padding:'13px', borderRadius:12, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg,#6366f1,#3b82f6)', color:'#fff', fontWeight:700, fontSize:15,
            }}>{t('Save Sleep')}</button>
          </form>
        </div>
      </div>
    </>
  )
}

export default function Sleep() {
  const { t } = useT()
  const { data, addSleep, deleteSleep } = useStore()
  const [showAdd, setShowAdd] = useState(false)

  const chart = Array.from({length:14},(_,i)=>{
    const d=format(subDays(new Date(),13-i),'yyyy-MM-dd')
    const l=data.sleep.find(s=>s.date===d)
    return {day:format(subDays(new Date(),13-i),'M/d'),h:l?.hours||0,q:l?.quality||0}
  })

  const sorted = [...data.sleep].sort((a,b)=>b.date.localeCompare(a.date))
  const avg7 = sorted.length ? (sorted.slice(0,7).reduce((s,x)=>s+x.hours,0)/Math.min(7,sorted.length)).toFixed(1) : '—'
  const avgQ = sorted.length ? (sorted.slice(0,7).reduce((s,x)=>s+x.quality,0)/Math.min(7,sorted.length)).toFixed(1) : '—'
  const best = sorted.length ? Math.max(...sorted.map(s=>s.hours)) : 0

  return (
    <div style={{ padding:'28px 28px 40px', maxWidth:860, margin:'0 auto' }} className="fade-up page">
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.muted, marginBottom:6 }}>{t('SLEEP TRACKER')}</div>
          <h1 style={{ fontSize:'clamp(28px,4vw,38px)', fontWeight:900, color:C.text, letterSpacing:-1 }}>
            {t('Rest')} <span style={{ color:'#6366f1' }}>{t('smart')}</span><span style={{ color:'rgba(232,232,240,0.25)' }}>.</span>
          </h1>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{
          display:'flex', alignItems:'center', gap:8, padding:'12px 20px', borderRadius:14,
          border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366f1,#3b82f6)',
          color:'#fff', fontWeight:700, fontSize:14, boxShadow:'0 4px 20px rgba(99,102,241,0.25)',
        }}><Plus size={16} strokeWidth={2.5}/>{t('Log Sleep')}</button>
      </div>

      <div className="stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[{label: t('7-day Avg'),value:`${avg7}h`,color:'#6366f1'},{label: t('Avg Quality'),value:`${avgQ}/10`,color:'#f59e0b'},{label: t('Best Sleep'),value:`${best}h`,color:'#10b981'}].map(s=>(
          <div key={s.label} className="card" style={{ padding:'18px 20px', textAlign:'center' }}>
            <div style={{ fontSize:32, fontWeight:900, color:s.color, letterSpacing:-1 }}>{s.value}</div>
            <div style={{ color:C.dim, fontSize:11, fontWeight:700, letterSpacing:1, marginTop:4 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:'20px', marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.dim, marginBottom:14 }}>{t('SLEEP HOURS (14 DAYS)')}</div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chart} margin={{top:0,right:0,bottom:0,left:-20}}>
            <defs>
              <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{fontSize:10,fill:'rgba(232,232,240,0.25)'}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:'#1a1a24',border:'1px solid #2a2a38',borderRadius:10,fontSize:12}} labelStyle={{color:C.muted}} formatter={(v)=>[`${v}h`,t('Sleep')]}/>
            <Area type="monotone" dataKey="h" stroke="#6366f1" fill="url(#sg2)" strokeWidth={2} dot={{r:2,fill:'#6366f1',strokeWidth:0}}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {sorted.length===0 ? (
          <div className="card" style={{ padding:48, textAlign:'center', color:C.dim }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🌙</div>
            <p style={{ fontSize:14 }}>{t('No sleep logs yet. Start tracking your rest!')}</p>
          </div>
        ) : sorted.map(log=>(
          <div key={log.id} className="card" style={{ padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:18 }}>
                <div style={{ textAlign:'center', minWidth:54 }}>
                  <div style={{ fontSize:32, fontWeight:900, color:'#6366f1', letterSpacing:-1, lineHeight:1 }}>{log.hours}h</div>
                  <div style={{ color:C.dim, fontSize:11, marginTop:2 }}>{format(parseISO(log.date),'MMM d')}</div>
                </div>
                <div>
                  <div style={{ color:C.muted, fontSize:13, marginBottom:6 }}>{log.bedtime} → {log.wakeup}</div>
                  <Stars q={log.quality}/>
                  <div style={{ fontSize:12, marginTop:4, color:Q_COLOR[log.quality], fontWeight:600 }}>{t(Q_LABEL[log.quality])}</div>
                  {log.notes && <p style={{ color:C.dim, fontSize:12, marginTop:4 }}>{log.notes}</p>}
                </div>
              </div>
              <button onClick={()=>deleteSleep(log.id)} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.dim, padding:6 }}
                onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.color='#ef4444'}
                onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.color=C.dim}>
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        ))}
      </div>
      {showAdd && <AddModal onClose={()=>setShowAdd(false)} onAdd={addSleep}/>}
    </div>
  )
}
