import { sl as slLocale } from 'date-fns/locale'
import { useStore } from './store/useStore'
import type { Lang } from './store/useStore'

// The English text in the code is the key; SL holds its Slovenian translation.
// Missing keys fall back to English, so a forgotten string never breaks the page.
// "{n}"-style placeholders are filled from the second argument of t().
const SL: Record<string, string> = {
  // Navigation
  'Dashboard': 'Pregled', 'Daily Tasks': 'Naloge', 'Goals & Fails': 'Cilji', 'Workout': 'Vadba',
  'Sleep': 'Spanje', 'Health': 'Zdravje', 'Brands': 'Projekti', 'Settings': 'Nastavitve', 'Journal': 'Dnevnik',
  'DASHBOARD': 'PREGLED', 'DAILY': 'NALOGE', 'GOALS': 'CILJI', 'WORKOUT': 'VADBA', 'SLEEP': 'SPANJE',
  'More': 'Več', 'FAILS': 'POSKUSI',

  // Common
  'Cancel': 'Prekliči', 'Save': 'Shrani', 'Saved!': 'Shranjeno!', 'Delete': 'Izbriši', 'Notes': 'Opombe',
  'NOTES': 'OPOMBE', 'DATE': 'DATUM', 'all': 'vse', 'active': 'aktivni', 'done': 'opravljeni',
  'high': 'visoka', 'medium': 'srednja', 'low': 'nizka', 'TOTAL': 'SKUPAJ', 'DONE': 'OPRAVLJENO',
  'Progress': 'Napredek', 'TODAY': 'DANES',

  // Dashboard
  'Early bird': 'Zgodnji ptič', 'Good morning': 'Dobro jutro', 'Good afternoon': 'Dober dan',
  'Good evening': 'Dober večer', 'Night mode': 'Nočni način', 'Still up?': 'Še buden?', 'Insomniac': 'Nespečnež',
  'Hey': 'Živjo', 'completed today': 'opravljenih danes', 'Add your first task': 'Dodaj prvo nalogo',
  'total fails = progress': 'vsi poskusi = napredek', 'active goals': 'aktivnih ciljev',
  'Set your first goal': 'Postavi prvi cilj', 'sessions this week': 'vadb ta teden', 'kcal burned': 'porabljenih kcal',
  'avg': 'povp.', 'mood / 10': 'počutje / 10', 'energy': 'energija', 'water': 'voda', 'Log health': 'Vpiši zdravje',
  'Add your first brand/project': 'Dodaj prvi projekt', 'Mood & Energy': 'Počutje in energija',
  'Mood': 'Počutje', 'Energy': 'Energija', 'Today in one line': 'Danes v eni vrstici',
  'How was today? One line is enough.': 'Kako je bil dan? Ena vrstica je dovolj.',

  // Todos
  'New Task': 'Nova naloga', 'What needs to be done?': 'Kaj je treba narediti?', 'PRIORITY': 'PRIORITETA',
  'CATEGORY': 'KATEGORIJA', 'DUE DATE': 'ROK', 'Add Task': 'Dodaj nalogo', 'DAILY TASKS': 'NALOGE',
  'Get it': 'Naredi', 'URGENT': 'NUJNO', 'Quick add: type task and press Enter...': 'Hitro dodaj: vpiši nalogo in pritisni Enter …',
  'No tasks yet. Add your first one!': 'Še ni nalog. Dodaj prvo!', 'No tasks match this filter.': 'Nobena naloga ne ustreza filtru.',
  'Work': 'Služba', 'Personal': 'Osebno', 'Learning': 'Učenje', 'Business': 'Posel', 'Finance': 'Finance', 'Other': 'Drugo',

  // Journal
  'JOURNAL': 'DNEVNIK', 'Write it': 'Zapiši', 'down': 'si', 'One line a day. Add more only if you want.': 'Ena vrstica na dan. Več napiši samo, če želiš.',
  'Write more (optional)': 'Napiši več (neobvezno)', 'Hide': 'Skrij', 'Update today': 'Posodobi današnji zapis',
  'Save today': 'Shrani današnji dan', 'No entries yet. Start with one line today.': 'Še ni zapisov. Začni z eno vrstico danes.',
  'day streak': 'dni zapored', 'entries': 'zapisov', 'this week': 'ta teden', 'Search…': 'Išči …',
  'Delete this entry?': 'Izbrišem ta zapis?', 'Saved for today.': 'Shranjeno za danes.',

  // Settings
  'SETTINGS': 'NASTAVITVE', 'Your': 'Tvoja', 'dashboard': 'aplikacija', 'PROFILE': 'PROFIL', 'YOUR NAME': 'TVOJE IME',
  'Your name': 'Tvoje ime', 'LANGUAGE': 'JEZIK', 'DATA': 'PODATKI', 'Export data': 'Izvozi podatke',
  'Download all your data as JSON': 'Prenesi vse podatke kot JSON', 'Import data': 'Uvozi podatke',
  'Restore from a JSON backup': 'Obnovi iz kopije JSON', 'Invalid file.': 'Napačna datoteka.',
  'YOUR DATA': 'TVOJI PODATKI', 'Goals': 'Cilji', 'Tasks': 'Naloge', 'Workouts': 'Vadbe', 'Sleep logs': 'Spanje',
  'Health logs': 'Zdravje', 'DATA MANAGEMENT': 'UPRAVLJANJE PODATKOV', 'Export Backup': 'Izvozi kopijo',
  'Download all data as JSON': 'Prenesi vse podatke kot JSON', 'Import Backup': 'Uvozi kopijo',
  'Restore from a JSON file': 'Obnovi iz datoteke JSON', 'DANGER ZONE': 'NEVARNO OBMOČJE',
  'Clear All Data': 'Izbriši vse podatke', 'Permanently delete everything': 'Trajno izbriši vse',
  'This will permanently delete all your data. This cannot be undone.': 'S tem trajno izbrišeš vse svoje podatke. Tega ni mogoče razveljaviti.',
  'Yes, delete everything': 'Da, izbriši vse', 'Data stored on your home server (doma)': 'Podatki so na tvojem domačem strežniku (doma)',
  'No account needed. No cloud. Yours forever.': 'Brez računa. Brez oblaka. Za vedno tvoje.',

  // Workout
  'Train': 'Treniraj', 'hard': 'trdo', 'Log Workout': 'Vpiši vadbo', 'TYPE': 'VRSTA',
  'DURATION (min)': 'TRAJANJE (min)', 'CALORIES': 'KALORIJE', 'EXERCISES (optional)': 'VAJE (neobvezno)',
  'Name': 'Ime', 'Sets': 'Serije', 'Reps': 'Ponov.', 'kg': 'kg', '+ Add exercise': '+ Dodaj vajo',
  'How did it go?': 'Kako je šlo?', 'Save Workout': 'Shrani vadbo', 'This Week': 'Ta teden', 'Calories': 'Kalorije',
  'Minutes': 'Minute', 'WEEKLY ACTIVITY (minutes)': 'AKTIVNOST V TEDNU (minute)', 'Duration': 'Trajanje',
  'No workouts logged yet. Time to sweat!': 'Še ni vadb. Čas je za znoj!',
  'Strength': 'Moč', 'Cardio': 'Kardio', 'HIIT': 'HIIT', 'Yoga': 'Joga', 'Cycling': 'Kolesarjenje', 'Running': 'Tek',
  'Swimming': 'Plavanje', 'Boxing': 'Boks', 'Calisthenics': 'Kalistenika',

  // Sleep
  'SLEEP TRACKER': 'SPANJE', 'Rest': 'Počivaj', 'smart': 'pametno', 'Log Sleep': 'Vpiši spanje', 'BEDTIME': 'SPAT',
  'WAKE UP': 'VSTAJANJE', 'total sleep': 'skupaj spanja', 'QUALITY': 'KAKOVOST', 'Notes (optional)': 'Opombe (neobvezno)',
  'Save Sleep': 'Shrani spanje', '7-day Avg': 'Povp. 7 dni', 'Avg Quality': 'Povp. kakovost', 'Best Sleep': 'Najboljše',
  'SLEEP HOURS (14 DAYS)': 'URE SPANJA (14 DNI)', 'No sleep logs yet. Start tracking your rest!': 'Še ni vpisanega spanja. Začni beležiti počitek!',
  'Terrible': 'Grozno', 'Poor': 'Slabo', 'Below Avg': 'Pod povprečjem', 'Average': 'Povprečno', 'Good': 'Dobro',
  'Very Good': 'Zelo dobro', 'Great': 'Odlično', 'Excellent': 'Izvrstno', 'Perfect': 'Popolno', 'Legendary': 'Legendarno',

  // Health
  'HEALTH METRICS': 'ZDRAVJE', 'Feel': 'Počuti se', 'great': 'odlično', 'Log Metrics': 'Vpiši meritve',
  'Log Health': 'Vpiši zdravje', 'WEIGHT (kg)': 'TEŽA (kg)', 'HEART RATE (bpm)': 'SRČNI UTRIP (bpm)',
  'WATER (liters)': 'VODA (litri)', 'STEPS': 'KORAKI', 'Notes...': 'Opombe …', 'Save Metrics': 'Shrani meritve',
  'Avg Mood': 'Povp. počutje', 'Avg Energy': 'Povp. energija', 'Last Water': 'Zadnja voda', 'Last Weight': 'Zadnja teža',
  'MOOD & ENERGY (14 DAYS)': 'POČUTJE IN ENERGIJA (14 DNI)', 'No health data yet. Start tracking!': 'Še ni podatkov. Začni beležiti!',

  // Goals
  'GOALS & FAILS': 'CILJI IN POSKUSI', 'Fail your way': 'Do uspeha', 'to': 'skozi', 'success': 'neuspehe',
  'New Goal': 'Nov cilj', 'Total Fails': 'Vsi poskusi', 'Achieved': 'Doseženo', 'ACHIEVED': 'DOSEŽENO',
  'The Fail 100× Method': 'Metoda 100 neuspehov', "Don't set a success target. Set a": 'Ne postavljaj cilja uspeha. Postavi',
  'fail target': 'cilj neuspehov', 'Every rejection, bad pitch, failed workout, or missed shot counts as a fail.': 'Vsaka zavrnitev, slaba predstavitev, neuspela vadba ali zgrešen strel šteje kot poskus.',
  'GOAL *': 'CILJ *', 'e.g. Launch my SaaS': 'npr. Zaženi svoj SaaS', 'DESCRIPTION': 'OPIS',
  'What does success look like?': 'Kako izgleda uspeh?', 'TARGET DATE': 'CILJNI DATUM', 'ONE ATTEMPT = REACH': 'EN POSKUS = DOSEŽI',
  'e.g. 10 (optional)': 'npr. 10 (neobvezno)', 'UNIT': 'ENOTA', 'e.g. clean pull-ups': 'npr. čistih zgibov',
  "Fail fast enough and you'll reach success before someone who never tried.": 'Če dovolj hitro poskušaš, boš uspel prej kot nekdo, ki nikoli ne poskusi.',
  'Create Goal': 'Ustvari cilj', 'FAIL COUNTER': 'ŠTEVEC POSKUSOV', 'out of': 'od', 'fails needed': 'potrebnih poskusov',
  'more to go': 'še manjka', 'of goal': 'cilja', 'fails': 'poskusov', 'FAIL': 'POSKUS', 'I FAILED': 'POSKUSIL SEM',
  'Every fail is a rep. Start failing!': 'Vsak neuspeh je ena ponovitev. Začni poskušati!',
  'Early days. Each fail means you tried.': 'Šele začetek. Vsak neuspeh pomeni, da si poskusil.',
  'Building momentum. Keep going.': 'Zagon raste. Kar tako naprej.',
  'Past the halfway mark. Most people quit here.': 'Čez polovico si. Tu večina obupa.',
  "You're in rare territory. Don't stop now.": 'Tu pride le redkokdo. Ne ustavi se zdaj.',
  "Only {n} fails left. You're almost there!": 'Le še {n} poskusov. Skoraj si tam!',
  "🏆 You've earned it through relentless persistence.": '🏆 To si si prislužil z neizprosno vztrajnostjo.',
  'MILESTONES': 'MEJNIKI', 'Add milestone...': 'Dodaj mejnik …', 'Add': 'Dodaj',
  'health': 'zdravje', 'fitness': 'fitnes', 'business': 'posel', 'personal': 'osebno', 'learning': 'učenje', 'finance': 'finance',

  // Brands
  'BRANDS & PROJECTS': 'PROJEKTI', 'Build your': 'Zgradi svoj', 'empire': 'imperij', 'Add Brand': 'Dodaj projekt',
  'Projects': 'Projekti', 'Total Revenue': 'Skupni prihodki', 'Live / Growing': 'Živi / rastejo',
  'Start Building Your Empire': 'Začni graditi svoj imperij', 'Add first brand': 'Dodaj prvi projekt',
  'New Brand / Project': 'Nov projekt', 'ICON': 'IKONA', 'Brand name *': 'Ime projekta *',
  'What does this brand do?': 'Kaj ta projekt dela?', 'STATUS': 'STANJE', 'REVENUE ($)': 'PRIHODKI ($)',
  'FOLLOWERS': 'SLEDILCI', 'WEBSITE': 'SPLETNA STRAN', 'https://': 'https://', 'TASKS': 'NALOGE', 'Add task...': 'Dodaj nalogo …',
  'Set a goal. Track every failed attempt. Fail {n}× = achieved.': 'Postavi cilj. Beleži vsak neuspel poskus. {n} poskusov = doseženo.',
  'Track brands, projects, side hustles — revenue, tasks, status — all in one view.': 'Projekti, stranski posli — prihodki, naloge, stanje — vse na enem mestu.',
  'Week': 'Teden', 'WEEKLY REVIEW': 'TEDENSKI PREGLED', 'Better than': 'Boljše kot', 'last week': 'prejšnji teden',
  'THIS WEEK': 'TA TEDEN', 'LAST': 'PREJ', 'Tasks done': 'Opravljene naloge', 'Workout minutes': 'Minute vadbe',
  'Avg sleep (h)': 'Povp. spanje (h)', 'Journal days': 'Dni v dnevniku', 'Goal attempts': 'Poskusi ciljev', 'Avg steps': 'Povp. koraki',
  'Score trend': 'Ocene po tednih', 'Claude reports': 'Claude poročila', 'The first report arrives on Sunday at 19:00.': 'Prvo poročilo pride v nedeljo ob 19:00.',
  'better': 'boljše', 'worse': 'slabše', 'Went well': 'Dobro', 'Improve': 'Izboljšaj', 'Focus for next week': 'Fokus za naslednji teden',
  'idea': 'ideja', 'building': 'v gradnji', 'launched': 'zagnan', 'growing': 'raste', 'paused': 'na pavzi',
}

export function useT() {
  const { data } = useStore()
  const lang: Lang = data.lang ?? 'sl'
  const t = (s: string, vars?: Record<string, string | number>) => {
    let out = lang === 'sl' ? (SL[s] ?? s) : s
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v))
    return out
  }
  return { t, lang, dateLocale: lang === 'sl' ? slLocale : undefined }
}
