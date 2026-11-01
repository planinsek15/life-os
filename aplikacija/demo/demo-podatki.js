// Izmišljeni demo podatki za posnetke zaslona (niso pravi osebni podatki).
// Uporaba: odpri aplikacijo (npm run dev), v konzoli brskalnika prilepi to datoteko, nato osveži stran.
(() => {
  const dan = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
  const id = () => Math.random().toString(36).slice(2)
  const zdaj = new Date().toISOString()

  const sleep = Array.from({ length: 14 }, (_, i) => {
    const h = [7.5, 6.8, 7.9, 6.2, 8.1, 7.2, 7.6, 6.9, 7.4, 8.0, 6.5, 7.7, 7.3, 7.8][i]
    return { id: id(), date: dan(i), bedtime: '23:15', wakeup: '06:45', hours: h, quality: h > 7.4 ? 4 : 3, notes: '' }
  })
  const health = Array.from({ length: 14 }, (_, i) => ({
    id: id(), date: dan(i), weight: 78.4 - i * 0.08, waterIntake: 6 + (i % 3), steps: 6500 + ((i * 1370) % 5200),
    heartRate: 62 + (i % 5), mood: 3 + (i % 3 === 0 ? 1 : 0), energy: 3 + (i % 2), notes: '',
  }))
  const workouts = [0, 2, 3, 5, 7, 9, 10, 12].map((n, i) => ({
    id: id(), date: dan(n), type: ['Moč', 'Tek', 'Moč', 'Kolo', 'Moč', 'Tek', 'Moč', 'Plavanje'][i],
    duration: 45 + (i % 3) * 10, calories: 380 + i * 25, notes: '',
    exercises: [{ name: 'Zgibi', sets: 4, reps: 6 + (i % 3), weight: 0 }, { name: 'Počep', sets: 4, reps: 8, weight: 70 }],
  }))
  const goals = [
    { title: 'Analytics engineer do poletja', description: 'dbt, SQL modeliranje, portfelj projektov', category: 'learning', progress: 45, color: '#6366f1',
      ms: [['dbt Fundamentals', true], ['Projekt Life OS na GitHub', true], ['3 prijave na teden', false], ['Certifikat', false]] },
    { title: '10 čistih zgibov', description: 'vsak poskus šteje', category: 'fitness', progress: 70, color: '#10b981',
      attemptTarget: 10, attemptUnit: 'zgibov', ms: [['5 zgibov', true], ['8 zgibov', true], ['10 zgibov', false]] },
    { title: 'Spanje 7+ ur', description: 'v postelji do 23:30', category: 'health', progress: 60, color: '#8b5cf6',
      ms: [['Telefon iz spalnice', true], ['30 dni zapored', false]] },
    { title: 'Rezerva 6 mesecev', description: 'avtomatski prenos ob plači', category: 'finance', progress: 35, color: '#f59e0b',
      ms: [['Trajnik nastavljen', true], ['3 mesece', false], ['6 mesecev', false]] },
  ].map((g, i) => ({
    id: id(), title: g.title, description: g.description, category: g.category, targetDate: dan(-120 - i * 30),
    progress: g.progress, failTarget: 100, failCount: 12 + i * 7, createdAt: zdaj, completed: false, color: g.color,
    attemptTarget: g.attemptTarget, attemptUnit: g.attemptUnit,
    attempts: g.attemptTarget ? [5, 6, 6, 7, 8, 7, 8, 9].map((v, j) => ({ id: id(), at: dan(14 - j * 2) + 'T18:00:00', value: v, ok: false })) : [],
    milestones: g.ms.map(([text, completed]) => ({ id: id(), text, completed })),
  }))
  const todos = [
    ['Posodobi CV in LinkedIn', 'high', 'Work', 0, false], ['Pripravi se na razgovor', 'high', 'Work', 1, false],
    ['Nedeljski pregled tedna', 'medium', 'Personal', 0, false], ['Trening: moč', 'medium', 'Health', 0, true],
    ['Prijava na 3 delovna mesta', 'high', 'Work', 2, false], ['Plačaj položnice', 'medium', 'Finance', -1, false],
    ['Preberi poglavje o dbt testih', 'low', 'Learning', 3, false], ['Pokliči mamo', 'low', 'Personal', null, true],
  ].map(([text, priority, category, due, completed]) => ({
    id: id(), text, priority, category, completed, createdAt: zdaj, dueDate: due === null ? undefined : dan(-due),
  }))
  const journal = [
    'Prvič 9 zgibov. Majhen korak, ampak šteje.', 'Dan je bil težak, ampak sem naredil vsaj eno vrstico.',
    'Končal SQL model za poročilo v službi.', 'Spal sem 8 ur in se pozna.', 'Poslal dve prijavi.',
    'Nedeljski pregled: fokus na prijave.', 'Brez telefona v postelji - deluje.',
  ].map((line, i) => ({ id: id(), date: dan(i), mood: [4, 2, 4, 5, 3, 4, 4][i], line, createdAt: zdaj }))
  const reports = [{
    id: id(), week: '2026-W44', from: dan(13), to: dan(7), createdAt: zdaj, ocena: 7, boljse: true,
    povzetek: 'Bolj reden teden: 4 treningi, spanje v povprečju 7,3 ure, dnevnik vsak dan.',
    dobro: ['Dnevnik 7/7 dni', 'Nov osebni rekord pri zgibih'], izboljsaj: ['Dve nalogi z rokom sta zamudili', 'Manj kot 7 ur spanja v torek in četrtek'],
    fokus: 'Ta teden: 3 prijave na delovna mesta, vsak dan ena.', stats: { treningi: 4, spanje: 7.3, naloge: 11 },
  }]
  const brands = [{
    id: id(), name: 'Data blog', description: 'Zapiski o SQL in analitiki', status: 'building', color: '#06b6d4', icon: '📊',
    tasks: [{ id: id(), text: 'Prvi članek: dbt za začetnike', completed: false, priority: 'medium' }],
    metrics: [], createdAt: zdaj, followers: 120,
  }]
  const data = { lang: 'sl', journal, reports, todos, goals, workouts, sleep, health, brands,
    userName: 'David', userAvatar: '', theme: 'dark', notifications: true }
  localStorage.setItem('personal-dashboard-v1', JSON.stringify(data))
  localStorage.setItem('personal-dashboard-sync-v1', JSON.stringify({ version: 0, dirty: false }))
  return 'Demo podatki naloženi - osveži stran.'
})()
