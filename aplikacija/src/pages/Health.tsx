import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import type { HealthMetric } from '../store/useStore'
import { format, parseISO, subDays } from 'date-fns'
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const C = { card:'#13131a', border:'#1e1e28', text:'#e8e8f0', muted:'rgba(232,232,240,0.4)', dim:'rgba(232,232,240,0.15)' }
const MOODS = ['','😵','😢','😣','😟','😐','🙂','😊','😄','😁','🤩']

function AddModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(h:Omit<HealthMetric,'id'>)=>void }) {
  const { t } = useT()
  const [form, setForm] = useState({
    date:format(new Date(),'yyyy-MM-dd'),
    weight:undefined as number|undefined, heartRate:undefined as number|undefined,
    waterIntake:undefined as number|undefined, steps:undefined as number|undefined,
    mood:7, energy:7, notes:'',
  })
  const submit = (e:React.FormEvent) => { e.preventDefault(); onAdd(form); onClose() }

  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex:60 }} />
      <div className="modal-wrap" style={{ position:'fixed', inset:0, zIndex:61, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}>
        <div className="modal" style={{ width:'100%', maxWidth:460, padding:28, margin:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
            <h2 style={{ color:C.text, fontWeight:800, fontSize:20 }}>{t('Log Health')}</h2>
            <button onClick={onClose} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.muted }}><X size={20}/></button>
          </div>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
              style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14 }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                {label: t('WEIGHT (kg)'), key:'weight', ph:'75.5', step:'0.1'},
                {label: t('HEART RATE (bpm)'), key:'heartRate', ph:'65'},
                {label: t('WATER (liters)'), key:'waterIntake', ph:'2.5', step:'0.1'},
                {label: t('STEPS'), key:'steps', ph:'10000'},
              ].map(f=>(
                <div key={f.key}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{f.label}</div>
                  <input type="number" step={f.step||'1'} placeholder={f.ph}
                    value={(form as Record<string,unknown>)[f.key] as number ?? ''}
                    onChange={e=>setForm(p=>({...p,[f.key]:e.target.value?Number(e.target.value):undefined}))}
                    style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13 }} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:8 }}>
                MOOD: <span style={{ fontSize:20 }}>{MOODS[form.mood]}</span> <span style={{ color:'#10b981', fontWeight:800 }}>{form.mood}/10</span>
              </div>
              <input type="range" min={1} max={10} value={form.mood} onChange={e=>setForm(f=>({...f,mood:Number(e.target.value)}))} style={{ width:'100%' }} />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:8 }}>
                ENERGY: <span style={{ color:'#eab308', fontWeight:800 }}>{form.energy}/10</span>
              </div>
              <input type="range" min={1} max={10} value={form.energy} onChange={e=>setForm(f=>({...f,energy:Number(e.target.value)}))} style={{ width:'100%' }} />
            </div>
            <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
              placeholder={t('Notes...')} style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14 }} />
            <button type="submit" style={{
              padding:'13px', borderRadius:12, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg,#10b981,#06b6d4)', color:'#fff', fontWeight:700, fontSize:15,
            }}>{t('Save Metrics')}</button>
          </form>
        </div>
      </div>
    </>
  )
}

export default function Health() {
  const { t } = useT()
  const { data, addHealth, deleteHealth } = useStore()
  const [showAdd, setShowAdd] = useState(false)

  const chart = Array.from({length:14},(_,i)=>{
    const d=format(subDays(new Date(),13-i),'yyyy-MM-dd')
    const h=data.health.find(x=>x.date===d)
    return {day:format(subDays(new Date(),13-i),'M/d'),m:h?.mood||null,e:h?.energy||null}
  })

  const sorted = [...data.health].sort((a,b)=>b.date.localeCompare(a.date))
  const latest = sorted[0]
  const avgM = sorted.length ? (sorted.slice(0,7).reduce((s,h)=>s+h.mood,0)/Math.min(7,sorted.length)).toFixed(1) : '—'
  const avgE = sorted.length ? (sorted.slice(0,7).reduce((s,h)=>s+h.energy,0)/Math.min(7,sorted.length)).toFixed(1) : '—'

  return (
    <div style={{ padding:'28px 28px 40px', maxWidth:860, margin:'0 auto' }} className="fade-up page">
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.muted, marginBottom:6 }}>{t('HEALTH METRICS')}</div>
          <h1 style={{ fontSize:'clamp(28px,4vw,38px)', fontWeight:900, color:C.text, letterSpacing:-1 }}>
            {t('Feel')} <span style={{ color:'#10b981' }}>{t('great')}</span><span style={{ color:'rgba(232,232,240,0.25)' }}>.</span>
          </h1>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{
          display:'flex', alignItems:'center', gap:8, padding:'12px 20px', borderRadius:14,
          border:'none', cursor:'pointer', background:'linear-gradient(135deg,#10b981,#06b6d4)',
          color:'#fff', fontWeight:700, fontSize:14, boxShadow:'0 4px 20px rgba(16,185,129,0.25)',
        }}><Plus size={16} strokeWidth={2.5}/>{t('Log Metrics')}</button>
      </div>

      <div className="stat-grid stat-grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          {label: t('Avg Mood'),value:avgM,color:'#10b981'},
          {label: t('Avg Energy'),value:avgE,color:'#eab308'},
          {label: t('Last Water'),value:latest?.waterIntake?`${latest.waterIntake}L`:'—',color:'#06b6d4'},
          {label: t('Last Weight'),value:latest?.weight?`${latest.weight}kg`:'—',color:C.text},
        ].map(s=>(
          <div key={s.label} className="card" style={{ padding:'16px', textAlign:'center' }}>
            <div style={{ fontSize:28, fontWeight:900, color:s.color, letterSpacing:-1 }}>{s.value}</div>
            <div style={{ color:C.dim, fontSize:10, fontWeight:700, letterSpacing:1, marginTop:4 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:'20px', marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.dim, marginBottom:14 }}>{t('MOOD & ENERGY (14 DAYS)')}</div>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={chart} margin={{top:0,right:0,bottom:0,left:-20}}>
            <XAxis dataKey="day" tick={{fontSize:10,fill:'rgba(232,232,240,0.25)'}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:'#1a1a24',border:'1px solid #2a2a38',borderRadius:10,fontSize:12}} labelStyle={{color:C.muted}}/>
            <Legend wrapperStyle={{fontSize:11,color:'rgba(232,232,240,0.4)'}}/>
            <Line type="monotone" dataKey="m" stroke="#10b981" strokeWidth={2} dot={{r:2,fill:'#10b981',strokeWidth:0}} connectNulls name="Mood"/>
            <Line type="monotone" dataKey="e" stroke="#eab308" strokeWidth={2} dot={{r:2,fill:'#eab308',strokeWidth:0}} connectNulls name="Energy"/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {sorted.length===0 ? (
          <div className="card" style={{ padding:48, textAlign:'center', color:C.dim }}>
            <div style={{ fontSize:40, marginBottom:12 }}>❤️</div>
            <p style={{ fontSize:14 }}>{t('No health data yet. Start tracking!')}</p>
          </div>
        ) : sorted.map(h=>(
          <div key={h.id} className="card" style={{ padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ fontSize:32 }}>{MOODS[h.mood]}</div>
                <div>
                  <div style={{ color:C.muted, fontSize:13, fontWeight:600, marginBottom:6 }}>{format(parseISO(h.date),'EEEE, MMM d')}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                    <span style={{ color:'#10b981', fontSize:13 }}>😊 {h.mood}/10</span>
                    <span style={{ color:'#eab308', fontSize:13 }}>⚡ {h.energy}/10</span>
                    {h.weight && <span style={{ color:C.muted, fontSize:13 }}>⚖️ {h.weight}kg</span>}
                    {h.waterIntake && <span style={{ color:'#06b6d4', fontSize:13 }}>💧 {h.waterIntake}L</span>}
                    {h.steps && <span style={{ color:'#6366f1', fontSize:13 }}>👟 {h.steps.toLocaleString()}</span>}
                    {h.heartRate && <span style={{ color:'#ef4444', fontSize:13 }}>❤️ {h.heartRate}bpm</span>}
                  </div>
                  {h.notes && <p style={{ color:C.dim, fontSize:12, marginTop:4 }}>{h.notes}</p>}
                </div>
              </div>
              <button onClick={()=>deleteHealth(h.id)} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.dim, padding:6 }}
                onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.color='#ef4444'}
                onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.color=C.dim}>
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        ))}
      </div>
      {showAdd && <AddModal onClose={()=>setShowAdd(false)} onAdd={addHealth}/>}
    </div>
  )
}
