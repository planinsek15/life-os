import { useState } from 'react'
import { Plus, Trash2, X, ExternalLink, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import type { Brand, BrandTask } from '../store/useStore'

const C = {
  card:'#13131a', border:'#1e1e28',
  text:'#e8e8f0', muted:'rgba(232,232,240,0.4)', dim:'rgba(232,232,240,0.15)',
}

const STATUS_STYLE: Record<Brand['status'], { color:string; bg:string }> = {
  idea:     { color:'#eab308', bg:'rgba(234,179,8,0.1)' },
  building: { color:'#6366f1', bg:'rgba(99,102,241,0.1)' },
  launched: { color:'#10b981', bg:'rgba(16,185,129,0.1)' },
  growing:  { color:'#06b6d4', bg:'rgba(6,182,212,0.1)' },
  paused:   { color:'rgba(232,232,240,0.3)', bg:'rgba(255,255,255,0.04)' },
}

const ICONS = ['🚀','💎','🔥','⚡','🌟','💡','🎯','💰','🏆','🎨','🛍️','📱','💻','🎵','📸','🎬','🏋️','🌱','🤖','🦁']

function AddModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(b:Omit<Brand,'id'|'createdAt'|'tasks'|'metrics'>)=>void }) {
  const { t } = useT()
  const [form, setForm] = useState({
    name:'', description:'', status:'idea' as Brand['status'],
    color:'#f59e0b', icon:'🚀', website:'',
    revenue: undefined as number|undefined, followers: undefined as number|undefined,
  })
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!form.name.trim()) return; onAdd(form); onClose() }

  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex:60 }} />
      <div className="modal-wrap" style={{ position:'fixed', inset:0, zIndex:61, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}>
        <div className="modal" style={{ width:'100%', maxWidth:480, padding:28, margin:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
            <h2 style={{ color:C.text, fontWeight:800, fontSize:20 }}>{t('New Brand / Project')}</h2>
            <button onClick={onClose} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.muted }}><X size={20}/></button>
          </div>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              placeholder={t('Brand name *')} required autoFocus
              style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14 }} />
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              placeholder={t('What does this brand do?')} rows={2}
              style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14, resize:'none' }} />
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:8 }}>{t('ICON')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {ICONS.map(ic => (
                  <button key={ic} type="button" onClick={()=>setForm(f=>({...f,icon:ic}))} style={{
                    width:36, height:36, borderRadius:8, border:`1px solid ${form.icon===ic?'rgba(245,158,11,0.4)':C.border}`,
                    background:form.icon===ic?'rgba(245,158,11,0.08)':'transparent',
                    fontSize:18, cursor:'pointer',
                  }}>{ic}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('STATUS')}</div>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as Brand['status']}))}
                  style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13 }}>
                  {(['idea','building','launched','growing','paused'] as Brand['status'][]).map(s=>(
                    <option key={s} value={s}>{t(s)}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('WEBSITE')}</div>
                <input type="url" value={form.website} onChange={e=>setForm(f=>({...f,website:e.target.value}))}
                  placeholder={t('https://')}
                  style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13 }} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('REVENUE ($)')}</div>
                <input type="number" min={0} value={form.revenue??''} placeholder="0"
                  onChange={e=>setForm(f=>({...f,revenue:e.target.value?Number(e.target.value):undefined}))}
                  style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13 }} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('FOLLOWERS')}</div>
                <input type="number" min={0} value={form.followers??''} placeholder="0"
                  onChange={e=>setForm(f=>({...f,followers:e.target.value?Number(e.target.value):undefined}))}
                  style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13 }} />
              </div>
            </div>
            <button type="submit" style={{
              padding:'13px', borderRadius:12, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg,#06b6d4,#6366f1)',
              color:'#fff', fontWeight:700, fontSize:15, marginTop:4,
            }}>{t('Add Brand')}</button>
          </form>
        </div>
      </div>
    </>
  )
}

function BrandCard({ brand, onDelete, onAddTask, onToggleTask, onDelTask, onUpdate }: {
  brand:Brand; onDelete:()=>void; onAddTask:(t:Omit<BrandTask,'id'>)=>void
  onToggleTask:(id:string)=>void; onDelTask:(id:string)=>void; onUpdate:(u:Partial<Brand>)=>void
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [editRev, setEditRev] = useState(false)
  const [revInput, setRevInput] = useState(brand.revenue?.toString()||'0')
  const ss = STATUS_STYLE[brand.status]
  const doneT = brand.tasks.filter(t=>t.completed).length

  const addTask = () => { if (!newTask.trim()) return; onAddTask({text:newTask.trim(),priority:'medium',completed:false}); setNewTask('') }

  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <div style={{ height:3, background:`linear-gradient(90deg, ${brand.color||'#f59e0b'}, #06b6d4)` }} />
      <div style={{ padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12, flex:1, minWidth:0 }}>
            <span style={{ fontSize:28, flexShrink:0 }}>{brand.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ color:C.text, fontWeight:700, fontSize:17 }}>{brand.name}</span>
                <span style={{ fontSize:11, padding:'2px 9px', borderRadius:100, background:ss.bg, color:ss.color, fontWeight:600 }}>
                  {t(brand.status)}
                </span>
              </div>
              {brand.description && <p style={{ color:C.muted, fontSize:13, marginTop:4 }}>{brand.description}</p>}
              <div style={{ display:'flex', gap:16, marginTop:8, flexWrap:'wrap', alignItems:'center' }}>
                {brand.revenue!==undefined && (
                  editRev ? (
                    <input type="number" value={revInput} autoFocus
                      onChange={e=>setRevInput(e.target.value)}
                      onBlur={()=>{onUpdate({revenue:Number(revInput)});setEditRev(false)}}
                      onKeyDown={e=>e.key==='Enter'&&(onUpdate({revenue:Number(revInput)}),setEditRev(false))}
                      style={{ width:100, padding:'4px 8px', borderRadius:8, fontSize:13, color:'#10b981' }} />
                  ) : (
                    <span onClick={()=>setEditRev(true)} style={{ color:'#10b981', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                      ${(brand.revenue||0).toLocaleString()}
                    </span>
                  )
                )}
                {brand.followers!==undefined && <span style={{ color:C.muted, fontSize:13 }}>{(brand.followers||0).toLocaleString()} followers</span>}
                {brand.tasks.length>0 && <span style={{ color:C.dim, fontSize:12 }}>{doneT}/{brand.tasks.length} tasks</span>}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            {brand.website && (
              <a href={brand.website} target="_blank" rel="noopener noreferrer" style={{ padding:6, color:C.dim, display:'flex' }}
                onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.color='#06b6d4'}
                onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.color=C.dim}>
                <ExternalLink size={14}/>
              </a>
            )}
            <button onClick={()=>setOpen(!open)} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, padding:6 }}>
              {open?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
            </button>
            <button onClick={onDelete} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.dim, padding:6 }}
              onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.color='#ef4444'}
              onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.color=C.dim}>
              <Trash2 size={14}/>
            </button>
          </div>
        </div>

        {open && (
          <div className="fade-up" style={{ marginTop:18 }}>
            {/* Status switcher */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, marginBottom:8 }}>{t('STATUS')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {(['idea','building','launched','growing','paused'] as Brand['status'][]).map(s => {
                  const st = STATUS_STYLE[s]; const act = brand.status===s
                  return (
                    <button key={s} onClick={()=>onUpdate({status:s})} style={{
                      padding:'6px 14px', borderRadius:8,
                      border:`1px solid ${act?st.color+'60':C.border}`,
                      background:act?st.bg:'transparent', color:act?st.color:C.muted,
                      fontWeight:600, fontSize:12, cursor:'pointer', textTransform:'capitalize',
                    }}>{t(s)}</button>
                  )
                })}
              </div>
            </div>
            {/* Tasks */}
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, marginBottom:8 }}>{t('TASKS')}</div>
              {brand.tasks.map(t => (
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, marginBottom:4, background:'#0e0e12' }}>
                  <button onClick={()=>onToggleTask(t.id)} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', flexShrink:0, padding:0, display:'flex' }}>
                    {t.completed?<CheckCircle2 size={15} color="#10b981"/>:<Circle size={15} color={C.dim}/>}
                  </button>
                  <span style={{ flex:1, color:t.completed?C.dim:C.muted, fontSize:13, textDecoration:t.completed?'line-through':'none' }}>{t.text}</span>
                  <button onClick={()=>onDelTask(t.id)} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.dim, padding:2 }}
                    onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.color='#ef4444'}
                    onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.color=C.dim}>
                    <X size={12}/>
                  </button>
                </div>
              ))}
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <input value={newTask} onChange={e=>setNewTask(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addTask()}
                  placeholder={t('Add task...')}
                  style={{ flex:1, padding:'9px 12px', borderRadius:10, fontSize:13 }} />
                <button onClick={addTask} style={{
                  padding:'9px 16px', borderRadius:10, border:'none', cursor:'pointer',
                  background:'rgba(6,182,212,0.12)', color:'#06b6d4', fontWeight:600, fontSize:13,
                }}>{t('Add')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Brands() {
  const { t } = useT()
  const { data, addBrand, updateBrand, deleteBrand, addBrandTask, toggleBrandTask } = useStore()
  const [showAdd, setShowAdd] = useState(false)

  const totalRev = data.brands.reduce((s,b)=>s+(b.revenue||0),0)
  const live = data.brands.filter(b=>b.status==='launched'||b.status==='growing').length

  const delTask = (brandId:string, taskId:string) => {
    const b = data.brands.find(x=>x.id===brandId); if(!b) return
    updateBrand(brandId,{tasks:b.tasks.filter(t=>t.id!==taskId)})
  }

  return (
    <div style={{ padding:'28px 28px 40px', maxWidth:900, margin:'0 auto' }} className="fade-up page">
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.muted, marginBottom:6 }}>{t('BRANDS & PROJECTS')}</div>
          <h1 style={{ fontSize:'clamp(28px,4vw,38px)', fontWeight:900, color:C.text, letterSpacing:-1 }}>
            {t('Build your')} <span style={{ color:'#06b6d4' }}>{t('empire')}</span><span style={{ color:'rgba(232,232,240,0.25)' }}>.</span>
          </h1>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{
          display:'flex', alignItems:'center', gap:8, padding:'12px 20px', borderRadius:14,
          border:'none', cursor:'pointer', background:'linear-gradient(135deg,#06b6d4,#6366f1)',
          color:'#fff', fontWeight:700, fontSize:14, boxShadow:'0 4px 20px rgba(6,182,212,0.25)',
        }}>
          <Plus size={16} strokeWidth={2.5}/>{t('Add Brand')}
        </button>
      </div>

      <div className="stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
        {[
          {label: t('Projects'), value:data.brands.length, color:C.text},
          {label: t('Total Revenue'), value:`$${totalRev.toLocaleString()}`, color:'#10b981'},
          {label: t('Live / Growing'), value:live, color:'#06b6d4'},
        ].map(s=>(
          <div key={s.label} className="card" style={{ padding:'18px 20px', textAlign:'center' }}>
            <div style={{ fontSize:30, fontWeight:900, color:s.color, letterSpacing:-1 }}>{s.value}</div>
            <div style={{ color:C.dim, fontSize:11, fontWeight:700, letterSpacing:1, marginTop:4 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {data.brands.length===0 ? (
        <div className="card" style={{ padding:40, textAlign:'center', border:'1px solid rgba(6,182,212,0.12)', background:'rgba(6,182,212,0.03)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🚀</div>
          <h3 style={{ color:C.text, fontWeight:800, fontSize:20, marginBottom:8 }}>{t('Start Building Your Empire')}</h3>
          <p style={{ color:C.muted, fontSize:14, maxWidth:360, margin:'0 auto 20px', lineHeight:1.7 }}>
            {t('Track brands, projects, side hustles — revenue, tasks, status — all in one view.')}
          </p>
          <button onClick={()=>setShowAdd(true)} style={{
            display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px', borderRadius:12,
            border:'none', cursor:'pointer', background:'linear-gradient(135deg,#06b6d4,#6366f1)',
            color:'#fff', fontWeight:700, fontSize:14,
          }}><Plus size={15}/>{t('Add first brand')}</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {data.brands.map(b=>(
            <BrandCard key={b.id} brand={b}
              onDelete={()=>deleteBrand(b.id)}
              onAddTask={t=>addBrandTask(b.id,t)}
              onToggleTask={tId=>toggleBrandTask(b.id,tId)}
              onDelTask={tId=>delTask(b.id,tId)}
              onUpdate={u=>updateBrand(b.id,u)}
            />
          ))}
        </div>
      )}
      {showAdd && <AddModal onClose={()=>setShowAdd(false)} onAdd={addBrand}/>}
    </div>
  )
}
