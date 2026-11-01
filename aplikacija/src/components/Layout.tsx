import { useState } from 'react'
import {
  LayoutDashboard, CheckSquare, Target, Dumbbell, Moon, Heart,
  Briefcase, Settings, Menu, X, Zap, BookOpen, CalendarCheck
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'

export type Page = 'dashboard' | 'todos' | 'goals' | 'workout' | 'journal' | 'week' | 'sleep' | 'health' | 'brands' | 'settings'

interface LayoutProps {
  children: (page: Page, setPage: (p: Page) => void) => React.ReactNode
}

const NAV: { id: Page; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { id: 'dashboard', label: 'Dashboard',   Icon: LayoutDashboard },
  { id: 'todos',     label: 'Daily Tasks', Icon: CheckSquare },
  { id: 'goals',     label: 'Goals & Fails', Icon: Target },
  { id: 'workout',   label: 'Workout',     Icon: Dumbbell },
  { id: 'journal',   label: 'Journal',     Icon: BookOpen },
  { id: 'week',      label: 'Week',        Icon: CalendarCheck },
  { id: 'sleep',     label: 'Sleep',       Icon: Moon },
  { id: 'health',    label: 'Health',      Icon: Heart },
  { id: 'brands',    label: 'Brands',      Icon: Briefcase },
  { id: 'settings',  label: 'Settings',    Icon: Settings },
]

export default function Layout({ children }: LayoutProps) {
  const [page, setPage] = useState<Page>('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data } = useStore()
  const { t } = useT()

  const go = (p: Page) => { setPage(p); setMobileOpen(false) }

  // The bottom nav shows the first 5 pages; the ☰ drawer holds only the rest.
  const BOTTOM_NAV = NAV.slice(0, 5)
  const MORE_NAV = NAV.slice(5)
  const moreActive = MORE_NAV.some(n => n.id === page)

  const totalFails = data.goals.reduce((s, g) => s + g.failCount, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e12' }}>

      {/* ── Desktop Icon Sidebar ── */}
      <aside
        className="desktop-sidebar"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 64, zIndex: 50,
          background: '#0a0a0e',
          borderRight: '1px solid #1e1e28',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '18px 0 14px', borderBottom: '1px solid #1e1e28', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(245,158,11,0.35)',
          }}>
            <Zap size={17} color="#fff" strokeWidth={2.5} />
          </div>
        </div>

        {/* Nav icons */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0', width: '100%' }}>
          {NAV.map(({ id, label, Icon }) => {
            const active = page === id
            return (
              <div key={id} className="sidebar-item" style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => go(id)}
                  title={t(label)}
                  style={{
                    width: 42, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? 'rgba(245,158,11,0.15)' : 'transparent',
                    color: active ? '#f59e0b' : 'rgba(232,232,240,0.3)',
                    transition: 'all 0.15s',
                    outline: active ? '1px solid rgba(245,158,11,0.25)' : 'none',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(232,232,240,0.75)'; (e.currentTarget as HTMLButtonElement).style.background = active ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = active ? '#f59e0b' : 'rgba(232,232,240,0.3)'; (e.currentTarget as HTMLButtonElement).style.background = active ? 'rgba(245,158,11,0.15)' : 'transparent' }}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                </button>
                <span className="sidebar-tooltip">{t(label)}</span>
              </div>
            )
          })}
        </nav>

        {/* Fail counter badge */}
        {totalFails > 0 && (
          <div
            onClick={() => go('goals')}
            style={{
              marginBottom: 16, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}
          >
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, padding: '6px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{totalFails}</div>
              <div style={{ fontSize: 8, color: 'rgba(239,68,68,0.6)', fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>{t('FAILS')}</div>
            </div>
          </div>
        )}

        {/* User avatar */}
        <div style={{ padding: '0 0 16px' }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #7c3aed, #db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: 'pointer',
            }}
            title={data.userName}
            onClick={() => go('settings')}
          >
            {data.userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </aside>

      {/* ── Mobile Topbar ── */}
      <header
        className="mobile-topbar"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          height: 56,
          background: 'rgba(10,10,14,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid #1e1e28',
          display: 'none', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={13} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: 1 }}>LIFE OS</span>
        </div>
        <button className="icon-btn" aria-label={t('More')} onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: moreActive ? '#f59e0b' : 'rgba(232,232,240,0.6)', padding: 6 }}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <>
          <div className="overlay" onClick={() => setMobileOpen(false)} style={{ zIndex: 55 }} />
          <div className="mobile-drawer" style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, zIndex: 60,
            background: '#0a0a0e', borderRight: '1px solid #1e1e28',
            paddingTop: 70, paddingLeft: 12, paddingRight: 12, display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {MORE_NAV.map(({ id, label, Icon }) => {
              const active = page === id
              return (
                <button key={id} onClick={() => go(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                  background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
                  color: active ? '#f59e0b' : 'rgba(232,232,240,0.5)',
                  fontWeight: 600, fontSize: 14, transition: 'all 0.12s',
                }}>
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  {t(label)}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="mobile-bottomnav"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(10,10,14,0.97)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid #1e1e28',
          display: 'none', gridTemplateColumns: 'repeat(5, 1fr)',
          padding: '8px 4px 12px',
        }}
      >
        {BOTTOM_NAV.map(({ id, label, Icon }) => {
          const active = page === id
          return (
            <button key={id} onClick={() => go(id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: active ? '#f59e0b' : 'rgba(232,232,240,0.3)',
              padding: '6px 4px', borderRadius: 10,
              transition: 'color 0.12s',
            }}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.3 }}>{t(label).split(' ')[0].toUpperCase()}</span>
            </button>
          )
        })}
      </nav>

      {/* ── Main Content ── */}
      <div
        className="main-wrap"
        style={{ minHeight: '100vh' }}
      >
        {children(page, setPage)}
      </div>
    </div>
  )
}
