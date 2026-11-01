import './index.css'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import type { Page } from './components/Layout'

// Only the dashboard ships in the first download; other pages load when opened
// (the service worker caches them afterwards, so later visits are instant).
const Todos = lazy(() => import('./pages/Todos'))
const Goals = lazy(() => import('./pages/Goals'))
const Workout = lazy(() => import('./pages/Workout'))
const Journal = lazy(() => import('./pages/Journal'))
const Week = lazy(() => import('./pages/Week'))
const Sleep = lazy(() => import('./pages/Sleep'))
const Health = lazy(() => import('./pages/Health'))
const Brands = lazy(() => import('./pages/Brands'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  return (
    <Layout>
      {(page: Page, setPage: (p: Page) => void) => (
        <Suspense fallback={null}>
          {(() => {
            switch (page) {
              case 'dashboard': return <Dashboard setPage={setPage} />
              case 'todos': return <Todos />
              case 'goals': return <Goals />
              case 'workout': return <Workout />
              case 'journal': return <Journal />
              case 'week': return <Week />
              case 'sleep': return <Sleep />
              case 'health': return <Health />
              case 'brands': return <Brands />
              case 'settings': return <Settings />
              default: return <Dashboard setPage={setPage} />
            }
          })()}
        </Suspense>
      )}
    </Layout>
  )
}

export default App
