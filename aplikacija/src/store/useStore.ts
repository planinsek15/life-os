import { useState, useEffect, useCallback } from 'react'

export type Priority = 'low' | 'medium' | 'high'
export type GoalCategory = 'health' | 'fitness' | 'business' | 'personal' | 'learning' | 'finance'

export interface Todo {
  id: string
  text: string
  completed: boolean
  priority: Priority
  category: string
  createdAt: string
  dueDate?: string
}

export interface Goal {
  id: string
  title: string
  description: string
  category: GoalCategory
  targetDate: string
  progress: number
  failTarget: number
  failCount: number
  milestones: Milestone[]
  createdAt: string
  completed: boolean
  color: string
  // optional: what one attempt must reach (e.g. 10 clean pull-ups); below it the attempt counts as a fail
  attemptTarget?: number
  attemptUnit?: string
  attempts?: Attempt[]
}

export interface Attempt {
  id: string
  at: string        // ISO time
  value?: number    // what was reached, e.g. 5 (of attemptTarget)
  ok?: boolean      // reached attemptTarget
}

export interface Milestone {
  id: string
  text: string
  completed: boolean
}

export interface WorkoutLog {
  id: string
  date: string
  type: string
  duration: number
  calories: number
  notes: string
  exercises: Exercise[]
}

export interface Exercise {
  name: string
  sets: number
  reps: number
  weight: number
}

export interface SleepLog {
  id: string
  date: string
  bedtime: string
  wakeup: string
  hours: number
  quality: number
  notes: string
}

export interface HealthMetric {
  id: string
  date: string
  weight?: number
  waterIntake?: number
  steps?: number
  heartRate?: number
  mood: number
  energy: number
  notes: string
}

export interface Brand {
  id: string
  name: string
  description: string
  status: 'idea' | 'building' | 'launched' | 'growing' | 'paused'
  color: string
  icon: string
  tasks: BrandTask[]
  metrics: BrandMetric[]
  createdAt: string
  website?: string
  revenue?: number
  followers?: number
}

export interface BrandTask {
  id: string
  text: string
  completed: boolean
  priority: Priority
}

export interface BrandMetric {
  date: string
  revenue: number
  followers: number
  sales: number
}

// Wall tablet (kiosk app reads this): screen on/off times "HH:MM", brightness 5-100, volume 0-100.
export interface TabletSettings {
  vklop: string
  izklop: string
  svetlost: number
  svetlostNoc?: number
  glasnost?: number
  zvokDotik?: boolean
  kraj?: { ime: string; lat: number; lon: number }
}

// Diary: one line per day is enough; "more" is the optional long text.
export interface JournalEntry {
  id: string
  date: string      // yyyy-MM-dd
  mood: number      // 1-5
  line: string
  more?: string
  createdAt: string
}

export type Lang = 'en' | 'sl'

// Written by the server every Sunday (streznik/lifeos-porocilo, Claude); the app only reads it.
export interface WeeklyReport {
  id: string
  week: string          // e.g. 2026-W44
  from: string
  to: string
  createdAt: string
  ocena: number | null  // 1-10
  boljse: boolean | null
  povzetek: string
  dobro: string[]
  izboljsaj: string[]
  fokus: string
  stats: Record<string, number | null>
}

export interface AppData {
  tablica?: TabletSettings
  lang?: Lang
  journal: JournalEntry[]
  reports?: WeeklyReport[]
  todos: Todo[]
  goals: Goal[]
  workouts: WorkoutLog[]
  sleep: SleepLog[]
  health: HealthMetric[]
  brands: Brand[]
  userName: string
  userAvatar: string
  theme: 'dark'
  notifications: boolean
}

const DEFAULT_DATA: AppData = {
  journal: [],
  todos: [],
  goals: [],
  workouts: [],
  sleep: [],
  health: [],
  brands: [],
  userName: 'David',
  userAvatar: '',
  theme: 'dark',
  notifications: true,
}

const STORAGE_KEY = 'personal-dashboard-v1'
const SYNC_KEY = 'personal-dashboard-sync-v1'
const API = '/api/data'
const POLL_MS = 15000

type Updater = (d: AppData) => AppData

// crypto.randomUUID only exists on https/localhost; the LAN address is plain http.
function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 3) | 8).toString(16)
  })
}

function loadData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_DATA, ...JSON.parse(stored) }
    }
  } catch {}
  return DEFAULT_DATA
}

function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    localStorage.setItem(SYNC_KEY, JSON.stringify({ version: serverVersion, dirty: pending.length > 0 }))
  } catch {}
}

function loadSyncState(): { version: number; dirty: boolean } {
  try {
    const s = localStorage.getItem(SYNC_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  return { version: 0, dirty: false }
}

// Server sync: the server keeps one shared copy (so phone, PC and tablet see the
// same data). Local edits are queued as updaters; if someone else saved in the
// meantime (409), the queue is replayed on top of the server's copy.
const initialSync = loadSyncState()
let serverVersion = initialSync.version
let pending: Updater[] = []
let inflight = false
let syncTimer: ReturnType<typeof setTimeout> | undefined

let globalData = loadData()
const listeners = new Set<() => void>()

function notifyAll() {
  listeners.forEach(fn => fn())
}

function updateGlobal(updater: Updater) {
  globalData = updater(globalData)
  pending.push(updater)
  saveData(globalData)
  notifyAll()
  scheduleSync(300)
}

function scheduleSync(ms: number) {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(pushToServer, ms)
}

function applyServer(version: number, data: Partial<AppData> | null) {
  serverVersion = version
  globalData = pending.reduce((d, u) => u(d), { ...DEFAULT_DATA, ...(data ?? {}) })
  saveData(globalData)
  notifyAll()
}

async function pushToServer() {
  if (inflight || pending.length === 0) return
  inflight = true
  const sent = pending.length
  try {
    const res = await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: serverVersion, data: globalData }),
    })
    const body = await res.json()
    if (res.ok) {
      serverVersion = body.version
      pending = pending.slice(sent)
      saveData(globalData)
    } else if (res.status === 409) {
      applyServer(body.version, body.data)
    } else {
      throw new Error(String(res.status))
    }
  } catch {
    inflight = false
    scheduleSync(5000)  // offline: keep the queue and retry
    return
  }
  inflight = false
  if (pending.length) scheduleSync(0)
}

async function pullFromServer() {
  if (inflight || pending.length) return
  try {
    const res = await fetch(API, { cache: 'no-store' })
    if (!res.ok) return
    const body: { version: number; data: AppData | null } = await res.json()
    if (inflight || pending.length || body.version === serverVersion) return
    if (body.data === null) {
      // Empty server: upload what this browser already has.
      serverVersion = body.version
      pending.push(d => d)
      scheduleSync(0)
      return
    }
    applyServer(body.version, body.data)
  } catch {}
}

function startSync() {
  if (initialSync.dirty) {
    // Unsent edits from last time: send them against the version they were based on.
    pending.push(d => d)
    scheduleSync(0)
  } else {
    pullFromServer()
  }
  setInterval(pullFromServer, POLL_MS)
  window.addEventListener('focus', pullFromServer)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pullFromServer()
  })
}

startSync()

export function useStore() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const fn = () => forceUpdate(n => n + 1)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])

  const setTablica = useCallback((tablica: TabletSettings) => {
    updateGlobal(d => ({ ...d, tablica }))
  }, [])

  const replaceAll = useCallback((next: Partial<AppData>) => {
    updateGlobal(() => ({ ...DEFAULT_DATA, ...next }))
  }, [])

  const setUserName = useCallback((name: string) => {
    updateGlobal(d => ({ ...d, userName: name }))
  }, [])

  const setLang = useCallback((lang: Lang) => {
    updateGlobal(d => ({ ...d, lang }))
  }, [])

  // JOURNAL (one entry per day: saving again on the same day updates it)
  const saveJournal = useCallback((entry: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    updateGlobal(d => {
      const journal = d.journal ?? []
      const existing = journal.find(j => j.date === entry.date)
      return existing
        ? { ...d, journal: journal.map(j => j.id === existing.id ? { ...j, ...entry } : j) }
        : { ...d, journal: [...journal, { ...entry, id: newId(), createdAt: new Date().toISOString() }] }
    })
  }, [])

  const deleteJournal = useCallback((id: string) => {
    updateGlobal(d => ({ ...d, journal: (d.journal ?? []).filter(j => j.id !== id) }))
  }, [])

  // TODOS
  const addTodo = useCallback((todo: Omit<Todo, 'id' | 'createdAt'>) => {
    updateGlobal(d => ({
      ...d,
      todos: [...d.todos, { ...todo, id: newId(), createdAt: new Date().toISOString() }]
    }))
  }, [])

  const toggleTodo = useCallback((id: string) => {
    updateGlobal(d => ({
      ...d,
      todos: d.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }))
  }, [])

  const deleteTodo = useCallback((id: string) => {
    updateGlobal(d => ({ ...d, todos: d.todos.filter(t => t.id !== id) }))
  }, [])

  const updateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    updateGlobal(d => ({
      ...d,
      todos: d.todos.map(t => t.id === id ? { ...t, ...updates } : t)
    }))
  }, [])

  // GOALS
  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt' | 'failCount' | 'progress' | 'completed' | 'milestones'>) => {
    updateGlobal(d => ({
      ...d,
      goals: [...d.goals, {
        ...goal,
        id: newId(),
        createdAt: new Date().toISOString(),
        failCount: 0,
        progress: 0,
        completed: false,
        milestones: []
      }]
    }))
  }, [])

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    updateGlobal(d => ({
      ...d,
      goals: d.goals.map(g => g.id === id ? { ...g, ...updates } : g)
    }))
  }, [])

  const deleteGoal = useCallback((id: string) => {
    updateGlobal(d => ({ ...d, goals: d.goals.filter(g => g.id !== id) }))
  }, [])

  // One attempt. Without a value (or below attemptTarget) it is a fail; reaching attemptTarget completes the goal.
  const incrementFail = useCallback((id: string, value?: number) => {
    updateGlobal(d => ({
      ...d,
      goals: d.goals.map(g => {
        if (g.id !== id) return g
        const ok = value !== undefined && !!g.attemptTarget && value >= g.attemptTarget
        const attempts = [...(g.attempts ?? []), { id: newId(), at: new Date().toISOString(), value, ok }]
        if (ok) return { ...g, attempts, completed: true }
        const newCount = g.failCount + 1
        const completed = newCount >= g.failTarget
        return { ...g, attempts, failCount: newCount, completed, progress: Math.min(100, Math.round((newCount / g.failTarget) * 100)) }
      })
    }))
  }, [])

  const addMilestone = useCallback((goalId: string, text: string) => {
    updateGlobal(d => ({
      ...d,
      goals: d.goals.map(g => g.id === goalId
        ? { ...g, milestones: [...g.milestones, { id: newId(), text, completed: false }] }
        : g
      )
    }))
  }, [])

  const toggleMilestone = useCallback((goalId: string, milestoneId: string) => {
    updateGlobal(d => ({
      ...d,
      goals: d.goals.map(g => g.id === goalId
        ? { ...g, milestones: g.milestones.map(m => m.id === milestoneId ? { ...m, completed: !m.completed } : m) }
        : g
      )
    }))
  }, [])

  // WORKOUTS
  const addWorkout = useCallback((workout: Omit<WorkoutLog, 'id'>) => {
    updateGlobal(d => ({
      ...d,
      workouts: [...d.workouts, { ...workout, id: newId() }]
    }))
  }, [])

  const deleteWorkout = useCallback((id: string) => {
    updateGlobal(d => ({ ...d, workouts: d.workouts.filter(w => w.id !== id) }))
  }, [])

  // SLEEP
  const addSleep = useCallback((log: Omit<SleepLog, 'id'>) => {
    updateGlobal(d => ({
      ...d,
      sleep: [...d.sleep, { ...log, id: newId() }]
    }))
  }, [])

  const deleteSleep = useCallback((id: string) => {
    updateGlobal(d => ({ ...d, sleep: d.sleep.filter(s => s.id !== id) }))
  }, [])

  // HEALTH
  const addHealth = useCallback((metric: Omit<HealthMetric, 'id'>) => {
    updateGlobal(d => ({
      ...d,
      health: [...d.health, { ...metric, id: newId() }]
    }))
  }, [])

  const deleteHealth = useCallback((id: string) => {
    updateGlobal(d => ({ ...d, health: d.health.filter(h => h.id !== id) }))
  }, [])

  // BRANDS
  const addBrand = useCallback((brand: Omit<Brand, 'id' | 'createdAt' | 'tasks' | 'metrics'>) => {
    updateGlobal(d => ({
      ...d,
      brands: [...d.brands, {
        ...brand,
        id: newId(),
        createdAt: new Date().toISOString(),
        tasks: [],
        metrics: []
      }]
    }))
  }, [])

  const updateBrand = useCallback((id: string, updates: Partial<Brand>) => {
    updateGlobal(d => ({
      ...d,
      brands: d.brands.map(b => b.id === id ? { ...b, ...updates } : b)
    }))
  }, [])

  const deleteBrand = useCallback((id: string) => {
    updateGlobal(d => ({ ...d, brands: d.brands.filter(b => b.id !== id) }))
  }, [])

  const addBrandTask = useCallback((brandId: string, task: Omit<BrandTask, 'id'>) => {
    updateGlobal(d => ({
      ...d,
      brands: d.brands.map(b => b.id === brandId
        ? { ...b, tasks: [...b.tasks, { ...task, id: newId() }] }
        : b
      )
    }))
  }, [])

  const toggleBrandTask = useCallback((brandId: string, taskId: string) => {
    updateGlobal(d => ({
      ...d,
      brands: d.brands.map(b => b.id === brandId
        ? { ...b, tasks: b.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) }
        : b
      )
    }))
  }, [])

  const addBrandMetric = useCallback((brandId: string, metric: BrandMetric) => {
    updateGlobal(d => ({
      ...d,
      brands: d.brands.map(b => b.id === brandId
        ? { ...b, metrics: [...b.metrics, metric], revenue: metric.revenue, followers: metric.followers }
        : b
      )
    }))
  }, [])

  return {
    data: globalData,
    setUserName, setLang, setTablica, replaceAll,
    saveJournal, deleteJournal,
    addTodo, toggleTodo, deleteTodo, updateTodo,
    addGoal, updateGoal, deleteGoal, incrementFail, addMilestone, toggleMilestone,
    addWorkout, deleteWorkout,
    addSleep, deleteSleep,
    addHealth, deleteHealth,
    addBrand, updateBrand, deleteBrand, addBrandTask, toggleBrandTask, addBrandMetric,
  }
}
