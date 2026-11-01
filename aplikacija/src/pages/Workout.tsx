import { useState } from 'react'
import { Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import type { WorkoutLog, Exercise } from '../store/useStore'
import { format, parseISO, subDays } from 'date-fns'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const C = { card:'#13131a', border:'#1e1e28', text:'#e8e8f0', muted:'rgba(232,232,240,0.4)', dim:'rgba(232,232,240,0.15)' }
const TYPES = ['Strength','Cardio','HIIT','Yoga','Cycling','Running','Swimming','Boxing','Calisthenics','Other']

function AddModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(w:Omit<WorkoutLog,'id'>)=>void }) {
  const { t } = useT()
  const [form, setForm] = useState({ date:format(new Date(),'yyyy-MM-dd'), type:'Strength', duration:45, calories:300, notes:'', exercises:[] as Exercise[] })
  const [ex, setEx] = useState({ name:'', sets:3, reps:10, weight:0 })

  const addEx = () => { if (!ex.name.trim()) return; setForm(f=>({...f,exercises:[...f.exercises,{...ex}]})); setEx({name:'',sets:3,reps:10,weight:0}) }
  const submit = (e: React.FormEvent) => { e.preventDefault(); onAdd(form); onClose() }

  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex:60 }} />
      <div className="modal-wrap" style={{ position:'fixed', inset:0, zIndex:61, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}>
        <div className="modal" style={{ width:'100%', maxWidth:480, padding:28, margin:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
            <h2 style={{ color:C.text, fontWeight:800, fontSize:20 }}>{t('Log Workout')}</h2>
            <button onClick={onClose} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.muted }}><X size={20}/></button>
          </div>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('DATE')}</div>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                  style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13 }} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('TYPE')}</div>
                <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                  style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13 }}>
                  {TYPES.map(ty=><option key={ty} value={ty}>{t(ty)}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('DURATION (min)')}</div>
                <input type="number" min={1} value={form.duration} onChange={e=>setForm(f=>({...f,duration:Number(e.target.value)}))}
                  style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13 }} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('CALORIES')}</div>
                <input type="number" min={0} value={form.calories} onChange={e=>setForm(f=>({...f,calories:Number(e.target.value)}))}
                  style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13 }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:8 }}>{t('EXERCISES (optional)')}</div>
              {form.exercises.map((e,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'#0e0e12', marginBottom:4, fontSize:13 }}>
                  <span style={{ color:C.muted, flex:1 }}>{e.name}</span>
                  <span style={{ color:C.dim }}>{e.sets}×{e.reps}{e.weight>0?` @${e.weight}kg`:''}</span>
                  <button type="button" onClick={()=>setForm(f=>({...f,exercises:f.exercises.filter((_,j)=>j!==i)}))}
                    style={{ background:'none', border:'none', cursor:'pointer', color:C.dim }}><X size={12}/></button>
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:6 }}>
                <input placeholder={t('Name')} value={ex.name} onChange={e=>setEx(n=>({...n,name:e.target.value}))}
                  style={{ padding:'9px 10px', borderRadius:10, fontSize:12 }} />
                <input type="number" placeholder={t('Sets')} value={ex.sets} onChange={e=>setEx(n=>({...n,sets:Number(e.target.value)}))}
                  style={{ padding:'9px 10px', borderRadius:10, fontSize:12 }} />
                <input type="number" placeholder={t('Reps')} value={ex.reps} onChange={e=>setEx(n=>({...n,reps:Number(e.target.value)}))}
                  style={{ padding:'9px 10px', borderRadius:10, fontSize:12 }} />
                <input type="number" placeholder={t('kg')} value={ex.weight||''} onChange={e=>setEx(n=>({...n,weight:Number(e.target.value)}))}
                  style={{ padding:'9px 10px', borderRadius:10, fontSize:12 }} />
              </div>
              <button type="button" onClick={addEx} style={{
                marginTop:8, padding:'8px 16px', borderRadius:10, border:'none', cursor:'pointer',
                background:'rgba(249,115,22,0.1)', color:'#f97316', fontWeight:600, fontSize:13,
              }}>{t('+ Add exercise')}</button>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('NOTES')}</div>
              <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                placeholder={t('How did it go?')} rows={2}
                style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13, resize:'none' }} />
            </div>
            <button type="submit" style={{
              padding:'13px', borderRadius:12, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', fontWeight:700, fontSize:15,
            }}>{t('Save Workout')}</button>
          </form>
        </div>
      </div>
    </>
  )
}

export default function Workout() {
  const { t } = useT()
  const { data, addWorkout, deleteWorkout } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [openId, setOpenId] = useState<string|null>(null)

  const chartData = Array.from({length:7},(_,i)=>{
    const d = format(subDays(new Date(),6-i),'yyyy-MM-dd')
    const ws = data.workouts.filter(w=>w.date===d)
    return { day:format(subDays(new Date(),6-i),'EEE'), min:ws.reduce((s,w)=>s+w.duration,0), kcal:ws.reduce((s,w)=>s+w.calories,0) }
  })

  const week = data.workouts.filter(w=>parseISO(w.date)>=subDays(new Date(),7))
  const sorted = [...data.workouts].sort((a,b)=>b.date.localeCompare(a.date))

  return (
    <div style={{ padding:'28px 28px 40px', maxWidth:860, margin:'0 auto' }} className="fade-up page">
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.muted, marginBottom:6 }}>{t('WORKOUT')}</div>
          <h1 style={{ fontSize:'clamp(28px,4vw,38px)', fontWeight:900, color:C.text, letterSpacing:-1 }}>
            {t('Train')} <span style={{ color:'#f97316' }}>{t('hard')}</span><span style={{ color:'rgba(232,232,240,0.25)' }}>.</span>
          </h1>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{
          display:'flex', alignItems:'center', gap:8, padding:'12px 20px', borderRadius:14,
          border:'none', cursor:'pointer', background:'linear-gradient(135deg,#f97316,#ef4444)',
          color:'#fff', fontWeight:700, fontSize:14, boxShadow:'0 4px 20px rgba(249,115,22,0.25)',
        }}><Plus size={16} strokeWidth={2.5}/>{t('Log Workout')}</button>
      </div>

      <div className="stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          {label: t('This Week'), value:week.length, color:C.text},
          {label: t('Calories'), value:week.reduce((s,w)=>s+w.calories,0).toLocaleString(), color:'#f97316'},
          {label: t('Minutes'), value:week.reduce((s,w)=>s+w.duration,0), color:C.text},
        ].map(s=>(
          <div key={s.label} className="card" style={{ padding:'18px 20px', textAlign:'center' }}>
            <div style={{ fontSize:32, fontWeight:900, color:s.color, letterSpacing:-1 }}>{s.value}</div>
            <div style={{ color:C.dim, fontSize:11, fontWeight:700, letterSpacing:1, marginTop:4 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:'20px', marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.dim, marginBottom:14 }}>{t('WEEKLY ACTIVITY (minutes)')}</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} margin={{top:0,right:0,bottom:0,left:-20}}>
            <XAxis dataKey="day" tick={{fontSize:11,fill:'rgba(232,232,240,0.25)'}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:'#1a1a24',border:'1px solid #2a2a38',borderRadius:10,fontSize:12}} labelStyle={{color:C.muted}} itemStyle={{color:'#f97316'}} formatter={(v)=>[`${v} min`,t('Duration')]}/>
            <Bar dataKey="min" radius={[6,6,0,0]}>
              {chartData.map((_,i)=><Cell key={i} fill={i===6?'#f97316':'rgba(249,115,22,0.35)'}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {sorted.length===0 ? (
          <div className="card" style={{ padding:48, textAlign:'center', color:C.dim }}>
            <div style={{ fontSize:40, marginBottom:12 }}>💪</div>
            <p style={{ fontSize:14 }}>{t('No workouts logged yet. Time to sweat!')}</p>
          </div>
        ) : sorted.map(w=>(
          <div key={w.id} className="card" style={{ overflow:'hidden' }}>
            <div style={{ height:3, background:'linear-gradient(90deg,#f97316,#ef4444)' }} />
            <div style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ color:C.text, fontWeight:700, fontSize:16 }}>{t(w.type)}</span>
                    <span style={{ color:C.dim, fontSize:13 }}>{format(parseISO(w.date),'MMM d, yyyy')}</span>
                  </div>
                  <div style={{ display:'flex', gap:14, marginTop:5 }}>
                    <span style={{ color:C.muted, fontSize:13 }}>⏱ {w.duration} min</span>
                    <span style={{ color:'#f97316', fontSize:13, fontWeight:600 }}>🔥 {w.calories} kcal</span>
                  </div>
                  {w.notes && <p style={{ color:C.dim, fontSize:12, marginTop:4 }}>{w.notes}</p>}
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  {w.exercises.length>0 && (
                    <button onClick={()=>setOpenId(openId===w.id?null:w.id)} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, padding:6 }}>
                      {openId===w.id?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
                    </button>
                  )}
                  <button onClick={()=>deleteWorkout(w.id)} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.dim, padding:6 }}
                    onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.color='#ef4444'}
                    onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.color=C.dim}>
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
              {openId===w.id && w.exercises.length>0 && (
                <div className="fade-up" style={{ marginTop:12, display:'flex', flexDirection:'column', gap:4 }}>
                  {w.exercises.map((ex,i)=>(
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', borderRadius:10, background:'#0e0e12', fontSize:13 }}>
                      <span style={{ color:C.muted }}>{ex.name}</span>
                      <span style={{ color:C.dim }}>{ex.sets}×{ex.reps}{ex.weight>0?` @ ${ex.weight}kg`:''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {showAdd && <AddModal onClose={()=>setShowAdd(false)} onAdd={addWorkout}/>}
    </div>
  )
}
