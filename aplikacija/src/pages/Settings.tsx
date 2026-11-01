import { useState } from 'react'
import { Download, Upload, Trash2, AlertTriangle, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Lang } from '../store/useStore'
import { useT } from '../i18n'

const C = { card:'#13131a', border:'#1e1e28', text:'#e8e8f0', muted:'rgba(232,232,240,0.4)', dim:'rgba(232,232,240,0.15)' }

export default function Settings() {
  const { data, setUserName, setLang, setTablica, replaceAll } = useStore()
  const { t, lang } = useT()
  const [name, setName] = useState(data.userName)
  const [saved, setSaved] = useState(false)
  const [danger, setDanger] = useState(false)
  const [tab, setTab] = useState({ vklop: '07:00', izklop: '22:00', svetlost: 60, svetlostNoc: 25, glasnost: 50,
    zvokDotik: true, ...data.tablica })
  const [kraj, setKraj] = useState(data.tablica?.kraj?.ime ?? '')
  const [krajNapaka, setKrajNapaka] = useState('')
  const [tabSaved, setTabSaved] = useState(false)

  const save = () => { setUserName(name); setSaved(true); setTimeout(()=>setSaved(false),2000) }
  const saveTab = async () => {
    let next = tab
    if (kraj.trim() && kraj.trim() !== tab.kraj?.ime) {
      // town -> coordinates for the tablet's weather (Open-Meteo geocoding, no key)
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=sl&name=${encodeURIComponent(kraj.trim())}`)
        const z = (await r.json()).results?.[0]
        if (!z) { setKrajNapaka('Kraja ne najdem.'); return }
        next = { ...tab, kraj: { ime: z.name, lat: z.latitude, lon: z.longitude } }
        setKraj(z.name); setTab(next)
      } catch { setKrajNapaka('Ni povezave za iskanje kraja.'); return }
    }
    setKrajNapaka('')
    setTablica(next); setTabSaved(true); setTimeout(()=>setTabSaved(false),2000)
  }

  const exportData = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
    a.download = `lifeos-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
  }

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader()
    r.onload = ev => {
      try { replaceAll(JSON.parse(ev.target?.result as string)) }
      catch { alert(t('Invalid file.')) }
    }
    r.readAsText(file)
  }

  const Row = ({ icon, title, sub, onClick, right }: {
    icon:string; title:string; sub:string; onClick?:()=>void; right?:React.ReactNode
  }) => (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12,
      background:'#0e0e12', border:`1px solid ${C.border}`, cursor:onClick?'pointer':'default',
      transition:'border-color 0.15s',
    }}
      onMouseEnter={e=>onClick&&((e.currentTarget as HTMLDivElement).style.borderColor='rgba(245,158,11,0.25)')}
      onMouseLeave={e=>onClick&&((e.currentTarget as HTMLDivElement).style.borderColor=C.border)}>
      <div style={{ fontSize:22, width:36, textAlign:'center' }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ color:C.text, fontWeight:600, fontSize:14 }}>{title}</div>
        <div style={{ color:C.dim, fontSize:12, marginTop:2 }}>{sub}</div>
      </div>
      {right}
    </div>
  )

  return (
    <div style={{ padding:'28px 28px 40px', maxWidth:680, margin:'0 auto' }} className="fade-up page">
      <div style={{ marginBottom:32 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.muted, marginBottom:6 }}>{t('SETTINGS')}</div>
        <h1 style={{ fontSize:'clamp(28px,4vw,38px)', fontWeight:900, color:C.text, letterSpacing:-1 }}>{t('Your')} <span style={{ color:'#f59e0b' }}>{t('dashboard')}</span><span style={{ color:'rgba(232,232,240,0.25)' }}>.</span></h1>
      </div>

      {/* Profile */}
      <div className="card" style={{ padding:'22px', marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, marginBottom:16 }}>{t('PROFILE')}</div>
        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
          <div style={{
            width:52, height:52, borderRadius:14, flexShrink:0,
            background:'linear-gradient(135deg,#7c3aed,#db2777)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontWeight:800, fontSize:22,
          }}>{name.charAt(0).toUpperCase()}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{t('YOUR NAME')}</div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()}
                style={{ flex:1, minWidth:0, padding:'10px 14px', borderRadius:10, fontSize:14 }} placeholder={t('Your name')} />
              <button onClick={save} style={{
                padding:'10px 18px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:13,
                background:saved?'rgba(16,185,129,0.15)':'rgba(245,158,11,0.12)',
                color:saved?'#10b981':'#f59e0b',
                display:'flex', alignItems:'center', gap:6,
              }}>
                {saved?<><Check size={14}/>{t('Saved!')}</>:t('Save')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="card" style={{ padding:'22px', marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, marginBottom:16 }}>{t('LANGUAGE')}</div>
        <div style={{ display:'flex', gap:8 }}>
          {([['sl','🇸🇮 Slovenščina'],['en','🇬🇧 English']] as [Lang,string][]).map(([code,label])=>(
            <button key={code} onClick={()=>setLang(code)} style={{
              flex:1, minHeight:44, borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:14,
              border:`1px solid ${lang===code?'rgba(245,158,11,0.4)':C.border}`,
              background:lang===code?'rgba(245,158,11,0.12)':'transparent',
              color:lang===code?'#f59e0b':C.muted,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Wall tablet */}
      <div className="card" style={{ padding:'22px', marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, marginBottom:16 }}>TABLICA</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          <label>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>ZASLON SE PRIŽGE</div>
            <input type="time" value={tab.vklop} onChange={e=>setTab(t=>({...t,vklop:e.target.value}))}
              style={{ width:'100%', padding:'10px 14px', borderRadius:10, fontSize:14 }} />
          </label>
          <label>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>ZASLON SE UGASNE</div>
            <input type="time" value={tab.izklop} onChange={e=>setTab(t=>({...t,izklop:e.target.value}))}
              style={{ width:'100%', padding:'10px 14px', borderRadius:10, fontSize:14 }} />
          </label>
        </div>
        {([['svetlost','SVETLOST PODNEVI',5,100,' %'],['svetlostNoc','SVETLOST PONOČI',5,100,' %'],['glasnost','GLASNOST',0,100,' %']] as const).map(([k,ime,lo,hi,en])=>(
          <div key={k} style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>{ime}: {tab[k]}{en}</div>
            <input type="range" min={lo} max={hi} step={5} value={tab[k]}
              onChange={e=>setTab(t=>({...t,[k]:Number(e.target.value)}))} style={{ width:'100%' }} />
          </div>
        ))}
        <label style={{ display:'flex', alignItems:'center', gap:8, color:C.text, fontSize:13, marginBottom:12 }}>
          <input type="checkbox" checked={tab.zvokDotik} onChange={e=>setTab(t=>({...t,zvokDotik:e.target.checked}))} />
          Zvok ob dotiku
        </label>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:C.muted, marginBottom:6 }}>KRAJ ZA VREME</div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <input value={kraj} onChange={e=>setKraj(e.target.value)} placeholder="npr. Ljubljana"
            style={{ flex:1, padding:'10px 14px', borderRadius:10, fontSize:14 }} />
          <button onClick={saveTab} style={{
            padding:'10px 18px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:13,
            background:tabSaved?'rgba(16,185,129,0.15)':'rgba(245,158,11,0.12)',
            color:tabSaved?'#10b981':'#f59e0b',
            display:'flex', alignItems:'center', gap:6,
          }}>
            {tabSaved?<><Check size={14}/>Shranjeno</>:'Shrani'}
          </button>
        </div>
        {krajNapaka && <div style={{ color:'#ef4444', fontSize:12, marginTop:8 }}>{krajNapaka}</div>}
        <div style={{ color:C.dim, fontSize:12, marginTop:10 }}>Tablica prebere nastavitve v nekaj minutah. Ponoči ugasne samo zaslon, tablica ostane prižgana.</div>
      </div>

      {/* Stats */}
      <div className="card" style={{ padding:'22px', marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, marginBottom:16 }}>{t('YOUR DATA')}</div>
        <div className="stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            {k:'Goals',v:data.goals.length},{k:'Tasks',v:data.todos.length},{k:'Workouts',v:data.workouts.length},
            {k:'Sleep logs',v:data.sleep.length},{k:'Health logs',v:data.health.length},{k:'Brands',v:data.brands.length},
          ].map(s=>(
            <div key={s.k} style={{ textAlign:'center', padding:'12px', background:'#0e0e12', borderRadius:10, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:26, fontWeight:800, color:C.text }}>{s.v}</div>
              <div style={{ color:C.dim, fontSize:11, fontWeight:600, marginTop:2 }}>{t(s.k).toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Data */}
      <div className="card" style={{ padding:'22px', marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, marginBottom:16 }}>{t('DATA MANAGEMENT')}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <Row icon="📤" title={t('Export Backup')} sub={t('Download all data as JSON')} onClick={exportData} right={<Download size={16} color={C.dim}/>}/>
          <label style={{ cursor:'pointer' }}>
            <Row icon="📥" title={t('Import Backup')} sub={t('Restore from a JSON file')} right={<Upload size={16} color={C.dim}/>}/>
            <input type="file" accept=".json" onChange={importData} style={{ display:'none' }}/>
          </label>
        </div>
      </div>

      {/* Danger */}
      <div className="card" style={{ padding:'22px', border:'1px solid rgba(239,68,68,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <AlertTriangle size={14} color="#ef4444"/>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:'rgba(239,68,68,0.6)' }}>{t('DANGER ZONE')}</div>
        </div>
        {!danger ? (
          <div onClick={()=>setDanger(true)} style={{
            display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12,
            background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.15)', cursor:'pointer',
          }}>
            <div style={{ fontSize:22 }}>🗑️</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:'#ef4444', fontWeight:600, fontSize:14 }}>{t('Clear All Data')}</div>
              <div style={{ color:C.dim, fontSize:12, marginTop:2 }}>{t('Permanently delete everything')}</div>
            </div>
            <Trash2 size={16} color="rgba(239,68,68,0.4)"/>
          </div>
        ) : (
          <div style={{ padding:'16px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12 }}>
            <p style={{ color:C.muted, fontSize:13, marginBottom:14, lineHeight:1.6 }}>
              ⚠️ {t('This will permanently delete all your data. This cannot be undone.')}
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{replaceAll({ userName: data.userName, tablica: data.tablica });setDanger(false)}}
                style={{ flex:1, padding:'11px', borderRadius:10, border:'none', cursor:'pointer', background:'#ef4444', color:'#fff', fontWeight:700, fontSize:13 }}>
                {t('Yes, delete everything')}
              </button>
              <button onClick={()=>setDanger(false)}
                style={{ flex:1, padding:'11px', borderRadius:10, border:`1px solid ${C.border}`, cursor:'pointer', background:'transparent', color:C.muted, fontWeight:700, fontSize:13 }}>
                {t('Cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign:'center', marginTop:24, color:C.dim, fontSize:12 }}>
        <p>Life OS • {t('Data stored on your home server (doma)')}</p>
        <p style={{ marginTop:4 }}>{t('No account needed. No cloud. Yours forever.')}</p>
      </div>
    </div>
  )
}
