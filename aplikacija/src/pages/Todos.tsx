import { useState } from 'react'
import { Plus, Trash2, X, CheckCircle2, Circle, Flame } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Todo, Priority } from '../store/useStore'
import { format } from 'date-fns'
import { useT } from '../i18n'

const C = {
  card: '#13131a', border: '#1e1e28',
  text: '#e8e8f0', muted: 'rgba(232,232,240,0.4)', dim: 'rgba(232,232,240,0.15)',
}
const PRI_COLOR: Record<Priority, string> = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }
const PRI_BG: Record<Priority, string> = {
  high: 'rgba(239,68,68,0.1)', medium: 'rgba(245,158,11,0.1)', low: 'rgba(16,185,129,0.1)'
}
const CATEGORIES = ['Work','Personal','Health','Learning','Business','Finance','Other']

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Omit<Todo,'id'|'createdAt'>) => void }) {
  const { t } = useT()
  const [form, setForm] = useState({ text:'', priority:'medium' as Priority, category:'Personal', completed:false, dueDate:'' })
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!form.text.trim()) return; onAdd(form); onClose() }

  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex: 60 }} />
      <div className="modal-wrap" style={{ position:'fixed', inset:0, zIndex:61, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div className="modal" style={{ width:'100%', maxWidth:460, padding:28 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
            <h2 style={{ color:C.text, fontWeight:800, fontSize:20 }}>{t('New Task')}</h2>
            <button onClick={onClose} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.muted }}><X size={20}/></button>
          </div>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <input value={form.text} onChange={e => setForm(f=>({...f,text:e.target.value}))}
              placeholder={t('What needs to be done?')} required autoFocus
              style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14 }} />
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:8 }}>{t('PRIORITY')}</div>
              <div style={{ display:'flex', gap:8 }}>
                {(['high','medium','low'] as Priority[]).map(p => (
                  <button key={p} type="button" onClick={() => setForm(f=>({...f,priority:p}))} style={{
                    flex:1, padding:'9px', borderRadius:10, border:`1px solid ${form.priority===p ? PRI_COLOR[p] : C.border}`,
                    background: form.priority===p ? PRI_BG[p] : 'transparent',
                    color: form.priority===p ? PRI_COLOR[p] : C.muted,
                    fontWeight:600, fontSize:13, cursor:'pointer', textTransform:'capitalize',
                  }}>{t(p)}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('CATEGORY')}</div>
                <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}
                  style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13 }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{t(c)}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('DUE DATE')}</div>
                <input type="date" value={form.dueDate} onChange={e => setForm(f=>({...f,dueDate:e.target.value}))}
                  style={{ width:'100%', padding:'11px 12px', borderRadius:12, fontSize:13 }} />
              </div>
            </div>
            <button type="submit" style={{
              padding:'13px', borderRadius:12, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg, #f59e0b, #f97316)',
              color:'#fff', fontWeight:700, fontSize:15, marginTop:4,
            }}>{t('Add Task')}</button>
          </form>
        </div>
      </div>
    </>
  )
}

function TaskItem({ todo, onToggle, onDelete }: { todo: Todo; onToggle:()=>void; onDelete:()=>void }) {
  const { t, dateLocale } = useT()
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
        borderBottom:`1px solid ${C.border}`, transition:'background 0.12s',
        background: hov ? 'rgba(255,255,255,0.02)' : 'transparent',
        opacity: todo.completed ? 0.45 : 1,
      }}
    >
      <button onClick={onToggle} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', flexShrink:0, padding:0, display:'flex' }}>
        {todo.completed
          ? <CheckCircle2 size={19} color="#10b981" />
          : <Circle size={19} color={C.dim} />}
      </button>
      <div style={{ flex:1, minWidth:0 }}>
        <span style={{ color:C.text, fontSize:14, fontWeight:500, textDecoration:todo.completed?'line-through':'none',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>
          {todo.text}
        </span>
        <div style={{ display:'flex', gap:8, marginTop:3, alignItems:'center' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:PRI_COLOR[todo.priority], flexShrink:0 }} />
          <span style={{ color:C.dim, fontSize:12 }}>{t(todo.category)}</span>
          {todo.dueDate && <span style={{ color:C.dim, fontSize:12 }}>· {format(new Date(todo.dueDate),'d MMM',{ locale: dateLocale })}</span>}
        </div>
      </div>
      {hov && (
        <button onClick={onDelete} className="icon-btn" style={{ background:'none', border:'none', cursor:'pointer', color:C.dim, padding:2 }}
          onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.color='#ef4444'}
          onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.color=C.dim}>
          <Trash2 size={14}/>
        </button>
      )}
    </div>
  )
}

export default function Todos() {
  const { data, addTodo, toggleTodo, deleteTodo } = useStore()
  const { t, lang, dateLocale } = useT()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all'|'active'|'done'>('all')
  const [priFilter, setPriFilter] = useState<Priority|'all'>('all')
  const [quick, setQuick] = useState('')

  const quickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quick.trim()) return
    addTodo({ text:quick.trim(), priority:'medium', category:'Personal', completed:false })
    setQuick('')
  }

  const list = data.todos
    .filter(t => filter==='all'||(filter==='active'?!t.completed:t.completed))
    .filter(t => priFilter==='all'||t.priority===priFilter)
    .sort((a,b) => {
      const o = { high:0, medium:1, low:2 }
      if (!a.completed && b.completed) return -1
      if (a.completed && !b.completed) return 1
      return o[a.priority]-o[b.priority]
    })

  const total = data.todos.length
  const done = data.todos.filter(t=>t.completed).length
  const pct = total > 0 ? Math.round((done/total)*100) : 0
  const urgent = data.todos.filter(t=>t.priority==='high'&&!t.completed).length

  return (
    <div style={{ padding:'28px 28px 40px', maxWidth:860, margin:'0 auto' }} className="fade-up page">

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.muted, marginBottom:6 }}>{t('DAILY TASKS')}</div>
          <h1 style={{ fontSize:'clamp(28px,4vw,38px)', fontWeight:900, color:C.text, letterSpacing:-1 }}>
            {t('Get it')} <span style={{ color:'#f59e0b' }}>{t('done')}</span><span style={{ color:'rgba(232,232,240,0.3)' }}>.</span>
          </h1>
          <p style={{ color:C.muted, fontSize:13, marginTop:6 }}>{format(new Date(), lang==='sl' ? 'EEEE, d. MMMM' : 'EEEE, MMMM do', { locale: dateLocale })}</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          display:'flex', alignItems:'center', gap:8, padding:'12px 20px', borderRadius:14,
          border:'none', cursor:'pointer', background:'linear-gradient(135deg,#f59e0b,#f97316)',
          color:'#fff', fontWeight:700, fontSize:14, boxShadow:'0 4px 20px rgba(245,158,11,0.25)',
        }}>
          <Plus size={16} strokeWidth={2.5}/>{t('New Task')}
        </button>
      </div>

      {/* Stats row */}
      <div className="stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        <div className="card" style={{ padding:'16px 20px', textAlign:'center' }}>
          <div style={{ fontSize:32, fontWeight:900, color:C.text, letterSpacing:-1 }}>{total}</div>
          <div style={{ color:C.dim, fontSize:11, fontWeight:700, letterSpacing:1, marginTop:2 }}>{t('TOTAL')}</div>
        </div>
        <div className="card" style={{ padding:'16px 20px', textAlign:'center' }}>
          <div style={{ fontSize:32, fontWeight:900, color:'#10b981', letterSpacing:-1 }}>{done}</div>
          <div style={{ color:C.dim, fontSize:11, fontWeight:700, letterSpacing:1, marginTop:2 }}>{t('DONE')}</div>
        </div>
        <div className="card" style={{ padding:'16px 20px', textAlign:'center' }}>
          <div style={{ fontSize:32, fontWeight:900, color:urgent>0?'#ef4444':C.muted, letterSpacing:-1 }}>{urgent}</div>
          <div style={{ color:C.dim, fontSize:11, fontWeight:700, letterSpacing:1, marginTop:2, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
            {urgent>0&&<Flame size={10} color="#ef4444"/>}{t('URGENT')}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="card" style={{ padding:'16px 20px', marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ color:C.muted, fontSize:13, fontWeight:600 }}>{t('Progress')}</span>
          <span style={{ color:pct===100?'#10b981':C.text, fontWeight:800, fontSize:18 }}>{pct}%</span>
        </div>
        <div style={{ height:6, background:'#1e1e28', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:pct===100?'#10b981':'linear-gradient(90deg,#f59e0b,#f97316)', borderRadius:3, transition:'width 0.6s' }} />
        </div>
      </div>

      {/* Quick add */}
      <form onSubmit={quickAdd} style={{ display:'flex', gap:10, marginBottom:16 }}>
        <input value={quick} onChange={e=>setQuick(e.target.value)}
          placeholder={t('Quick add: type task and press Enter...')}
          style={{ flex:1, padding:'12px 16px', borderRadius:12, fontSize:14 }} />
        <button type="submit" style={{
          padding:'12px 16px', borderRadius:12, border:'none', cursor:'pointer',
          background:'rgba(245,158,11,0.12)', color:'#f59e0b',
        }}><Plus size={18}/></button>
      </form>

      {/* Filters */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
        {(['all','active','done'] as const).map(f => (
          <button className="tap-btn" key={f} onClick={()=>setFilter(f)} style={{
            padding:'6px 14px', borderRadius:8, border:`1px solid ${filter===f?'rgba(245,158,11,0.3)':C.border}`,
            background:filter===f?'rgba(245,158,11,0.08)':'transparent',
            color:filter===f?'#f59e0b':C.muted, fontWeight:600, fontSize:12, cursor:'pointer', textTransform:'capitalize',
          }}>{t(f)}</button>
        ))}
        <div style={{ width:1, background:C.border, margin:'0 4px' }} />
        {(['all','high','medium','low'] as const).map(p => (
          <button className="tap-btn" key={p} onClick={()=>setPriFilter(p)} style={{
            padding:'6px 14px', borderRadius:8,
            border:`1px solid ${priFilter===p?(p==='all'?'rgba(255,255,255,0.15)':PRI_COLOR[p as Priority]+'40'):C.border}`,
            background:priFilter===p&&p!=='all'?PRI_BG[p as Priority]:'transparent',
            color:priFilter===p?p==='all'?C.text:PRI_COLOR[p as Priority]:C.muted,
            fontWeight:600, fontSize:12, cursor:'pointer', textTransform:'capitalize',
          }}>{t(p)}</button>
        ))}
      </div>

      {/* Task list */}
      <div className="card" style={{ overflow:'hidden' }}>
        {list.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 20px', color:C.dim }}>
            <CheckCircle2 size={40} color={C.dim} style={{ margin:'0 auto 12px' }} />
            <p style={{ fontSize:14 }}>{data.todos.length===0?t('No tasks yet. Add your first one!'):t('No tasks match this filter.')}</p>
          </div>
        ) : list.map(t => (
          <TaskItem key={t.id} todo={t} onToggle={()=>toggleTodo(t.id)} onDelete={()=>deleteTodo(t.id)} />
        ))}
      </div>

      {showAdd && <AddModal onClose={()=>setShowAdd(false)} onAdd={addTodo} />}
    </div>
  )
}
