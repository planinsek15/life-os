#!/usr/bin/env python3
"""Life OS planer za tablico brez Androida.

Riše neposredno na /dev/graphics/fb0 (1024x768, 32 bit), bere dotik z
/dev/input/event2 (Goodix gt80x) in podatke jemlje s strežnika doma
(GET/PUT /api/data, isti JSON kot aplikacija). Videz sledi strani /tablica.
"""
import array
import calendar
import fcntl
import json
import math
import mmap
import subprocess
import os
import select
import struct
import sys
import threading
import time
import urllib.request
import uuid

from PIL import Image, ImageDraw, ImageFont

STREZNIK = os.environ.get('LIFEOS', 'http://192.168.1.10:8090')
FB = '/dev/graphics/fb0'
DOTIK = '/dev/input/event2'
W, H = 1024, 768
OSVEZI_S = 20
BUDNO_PONOCI_S = 300  # ponoči se zaslon ugasne po 5 min brez dotika
WPA = '/kiosk/wpa.conf'
TIPKE_NAPRAVE = ('/dev/input/event0', '/dev/input/event1')  # sun4i-keyboard (glasnost), axp20 (vklop)
KEY_GLASNEJE, KEY_TISJE, KEY_VKLOP = 115, 114, 116
LOKALNE = '/kiosk/nastavitve.json'  # dokler na strežniku ni podatkov
PRIVZETO = {'vklop': '07:00', 'izklop': '22:00', 'svetlost': 60, 'svetlostNoc': 25,
            'glasnost': 50, 'zvokDotik': True, 'kraj': {'ime': 'Ljubljana', 'lat': 46.05, 'lon': 14.51}}
VREME_S = 1800
# WMO koda vremena (Open-Meteo) -> opis
VREME_OPIS = [(0, 'jasno'), (1, 'pretežno jasno'), (2, 'delno oblačno'), (3, 'oblačno'), (48, 'megla'),
              (57, 'rosenje'), (67, 'dež'), (77, 'sneg'), (82, 'plohe'), (86, 'snežne plohe'), (99, 'nevihta')]
SPODBUDE = ['Stokrat spodleti, da se enkrat naučiš.',
            'Vsak spodletljaj je ponovitev. Ponovitve gradijo mišice.',
            'Kdor ne poskusi, mu nikoli ne spodleti — in se nikoli ne nauči.',
            'Ni ti treba biti dober, da začneš. Moraš začeti, da postaneš dober.',
            '5 od 10 je 5 več kot včeraj, ko nisi poskusil.',
            'Spodleti hitro, spodleti pogosto, spodleti naprej.',
            'Napredek je počasen. Odnehati je hitro. Izberi počasno.']

BG = (14, 14, 18)
KARTICA = (19, 19, 26)
ROB = (30, 30, 40)
TEKST = (232, 232, 240)
SIVA = (120, 120, 132)
TEMNA = (70, 70, 82)
ORANZNA = (245, 158, 11)
ZELENA = (16, 185, 129)
RDECA = (239, 68, 68)
PRIORITETA_BARVA = {'high': RDECA, 'medium': ORANZNA, 'low': ZELENA}
PRIORITETA = {'high': 0, 'medium': 1, 'low': 2}
PRIORITETA_IME = {'high': 'visoka', 'medium': 'srednja', 'low': 'nizka'}
KATEGORIJA = {'health': 'zdravje', 'fitness': 'fitnes', 'business': 'posel',
              'personal': 'osebno', 'learning': 'učenje', 'finance': 'finance'}
DNEVI = ['ponedeljek', 'torek', 'sreda', 'četrtek', 'petek', 'sobota', 'nedelja']
MESECI = ['januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij',
          'avgust', 'september', 'oktober', 'november', 'december']

PISAVA = '/usr/share/fonts/dejavu/DejaVuSans.ttf'
PISAVA_B = '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'
_pisave = {}


def F(velikost, krepko=False):
    k = (velikost, krepko)
    if k not in _pisave:
        _pisave[k] = ImageFont.truetype(PISAVA_B if krepko else PISAVA, velikost)
    return _pisave[k]


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


# ---------------------------------------------------------------- zaslon

class Zaslon:
    FBIOBLANK = 0x4611
    DISP_LCD_ON, DISP_LCD_OFF, DISP_SET_BRIGHT = 0x140, 0x141, 0x142

    def __init__(self):
        self.fb = open(FB, 'r+b')
        v = bytearray(160)
        fcntl.ioctl(self.fb, 0x4600, v)  # FBIOGET_VSCREENINFO
        xres, yres, xv, yv, xo, yo, bpp = struct.unpack_from('7I', v)
        f = bytearray(80)
        fcntl.ioctl(self.fb, 0x4602, f)  # FBIOGET_FSCREENINFO
        self.line = struct.unpack_from('I', f, 44)[0] or xres * 4
        self.yoff = yo
        self.mm = mmap.mmap(self.fb.fileno(), self.line * yv)
        try:
            self.disp = os.open('/dev/disp', os.O_RDWR)
        except OSError:
            self.disp = None
        self.prizgan = None
        self.svetlost = None

    def pokazi(self, img):
        raw = img.tobytes('raw', 'BGRX')
        off = self.yoff * self.line
        self.mm[off:off + len(raw)] = raw

    def _disp(self, cmd, *args):
        if not self.disp:
            raise OSError('ni /dev/disp')
        a = array.array('L', list(args) + [0] * (4 - len(args)))
        fcntl.ioctl(self.disp, cmd, a)

    def moc(self, prizgan):
        if prizgan == self.prizgan:
            return
        self.prizgan = prizgan
        try:
            self._disp(self.DISP_LCD_ON if prizgan else self.DISP_LCD_OFF, 0)
        except OSError:
            try:
                fcntl.ioctl(self.fb, self.FBIOBLANK, 0 if prizgan else 4)
            except OSError as e:
                log('zaslona ne morem prižgati/ugasniti:', e)
        if prizgan:
            self.svetlost = None  # po vklopu znova nastavi svetlost
        log('zaslon', 'prižgan' if prizgan else 'ugasnjen')

    def nastavi_svetlost(self, odstotek):
        v = max(10, min(255, int(odstotek * 255 / 100)))
        if v == self.svetlost:
            return
        try:
            self._disp(self.DISP_SET_BRIGHT, 0, v)
            log('svetlost %d %%' % odstotek)
            self.svetlost = v
        except OSError as e:
            log('svetlosti ne morem nastaviti:', e)
            self.svetlost = v


# ---------------------------------------------------------------- dotik

class Dotik:
    """Goodix pošilja ABS_MT_POSITION_X/Y; dotik je končan, ko pride SYN_REPORT brez točk."""

    def __init__(self):
        self.fd = os.open(DOTIK, os.O_RDONLY | os.O_NONBLOCK)
        self.x = self.y = None
        self.tocke = 0
        self.dol = False
        self.aktivnost = False  # karkoli je prišlo z zaslona na dotik (tudi nedokončan dotik)

    def preberi(self):
        """Vrne seznam dotikov (x, y), ki so se pravkar končali."""
        dotiki = []
        while True:
            try:
                buf = os.read(self.fd, 16 * 64)
            except BlockingIOError:
                break
            if not buf:
                break
            self.aktivnost = True
            for i in range(0, len(buf) - 15, 16):
                _, _, typ, koda, vrednost = struct.unpack_from('IIHHi', buf, i)
                if typ == 3 and koda in (0x35, 0x00):
                    self.x = vrednost
                    self.tocke += 1
                elif typ == 3 and koda in (0x36, 0x01):
                    self.y = vrednost
                elif typ == 1 and koda == 0x14a and vrednost == 0 and self.dol:
                    self.dol = False
                    dotiki.append((self.x, self.y))
                elif typ == 0 and koda == 0:  # SYN_REPORT
                    if self.tocke:
                        self.dol = True
                    elif self.dol:
                        self.dol = False
                        dotiki.append((self.x, self.y))
                    self.tocke = 0
        return [(x, y) for x, y in dotiki if x is not None and y is not None]


class Tipke:
    """Strojne tipke: vrne kode pritisnjenih tipk (samo pritisk, ne spust)."""

    def __init__(self):
        self.fds = []
        for pot in TIPKE_NAPRAVE:
            try:
                self.fds.append(os.open(pot, os.O_RDONLY | os.O_NONBLOCK))
            except OSError as e:
                log('tipke', pot, e)

    def preberi(self):
        kode = []
        for fd in self.fds:
            while True:
                try:
                    buf = os.read(fd, 16 * 32)
                except BlockingIOError:
                    break
                if not buf:
                    break
                for i in range(0, len(buf) - 15, 16):
                    _, _, typ, koda, vrednost = struct.unpack_from('IIHHi', buf, i)
                    if typ == 1 and vrednost == 1:
                        kode.append(koda)
        return kode


class Zvok:
    """Kratki toni prek ALSA (aplay) na vgrajenem zvočniku."""
    HZ = 44100

    def __init__(self):
        self.glasnost = None
        self.igra = threading.Lock()
        self.toni = {'klik': self._ton([(1400, .025)], .35),
                     'kljukica': self._ton([(660, .08), (990, .14)], .6),
                     'preizkus': self._ton([(523, .15), (659, .15), (784, .25)], .7)}
        for ime in ('Playback Switch', 'Ldac Left Mixer', 'Rdac Right Mixer'):
            self._amixer('name=' + ime, 'on')

    def _amixer(self, *arg):
        try:
            subprocess.run(['amixer', '-q', '-c', '0', 'cset'] + list(arg), timeout=5)
        except (OSError, subprocess.SubprocessError) as e:
            log('amixer:', e)

    def _ton(self, deli, jakost):
        vzorci = array.array('h')
        for f, trajanje in deli:
            n = int(self.HZ * trajanje)
            for i in range(n):
                ovoj = min(1, i / 200, (n - i) / 400)
                v = int(32767 * jakost * ovoj * math.sin(2 * math.pi * f * i / self.HZ))
                vzorci.extend((v, v))
        pod = vzorci.tobytes()
        glava = struct.pack('<4sI4s4sIHHIIHH4sI', b'RIFF', 36 + len(pod), b'WAVE', b'fmt ', 16, 1, 2,
                            self.HZ, self.HZ * 4, 4, 16, b'data', len(pod))
        return glava + pod

    def nastavi_glasnost(self, odstotek):
        v = max(0, min(63, round(odstotek * 63 / 100)))
        if v != self.glasnost:
            self.glasnost = v
            self._amixer('name=Master Playback Volume', str(v))

    def predvajaj(self, ime):
        if self.glasnost == 0:
            return
        threading.Thread(target=self._predvajaj, args=(ime,), daemon=True).start()

    def _predvajaj(self, ime):
        if not self.igra.acquire(blocking=False):
            return
        try:
            subprocess.run(['aplay', '-q', '-D', 'plughw:0,0', '-'], input=self.toni[ime], timeout=5)
        except (OSError, subprocess.SubprocessError) as e:
            log('aplay:', e)
        finally:
            self.igra.release()


# ---------------------------------------------------------------- podatki

def prazni():
    return {'todos': [], 'goals': [], 'workouts': [], 'sleep': [], 'health': [],
            'brands': [], 'userName': 'David', 'userAvatar': '', 'theme': 'dark',
            'notifications': True}


class Podatki:
    def __init__(self):
        self.version = 0
        self.data = None
        self.napaka = 'povezujem …'
        self.zadnjic = None
        self.lock = threading.Lock()
        self.spremenjeno = threading.Event()

    def d(self):
        d = self.data or prazni()
        for k in ('todos', 'goals', 'workouts', 'sleep'):
            d.setdefault(k, [])
        return d

    def _zahteva(self, metoda, telo=None):
        req = urllib.request.Request(STREZNIK + '/api/data', method=metoda,
                                     data=json.dumps(telo).encode() if telo else None,
                                     headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read() or b'null')

    def prenesi(self):
        try:
            status, odg = self._zahteva('GET')
            with self.lock:
                if status == 200 and odg.get('version') != self.version:
                    self.version, self.data = odg['version'], odg['data']
                    self.spremenjeno.set()
            self.napaka = None
            self.zadnjic = time.strftime('%H:%M')
        except Exception as e:
            self.napaka = 'ni povezave s strežnikom'
            log('prenos:', e)

    def spremeni(self, fn):
        """Takoj lokalno, nato na strežnik; ob 409 vzame novo verzijo in ponovi."""
        if self.data is None:
            # prazen strežnik: prva naprava z obstoječimi podatki jih mora naložiti, tablica jih ne sme prepisati
            self.napaka = 'najprej odpri Life OS na računalniku'
            self.spremenjeno.set()
            return
        with self.lock:
            data = json.loads(json.dumps(self.d()))
            fn(data)
            self.data = data
        self.spremenjeno.set()
        threading.Thread(target=self._poslji, args=(fn,), daemon=True).start()

    def _poslji(self, fn):
        for _ in range(4):
            try:
                with self.lock:
                    telo = {'version': self.version, 'data': self.data}
                status, odg = self._zahteva('PUT', telo)
            except Exception as e:
                self.napaka = 'ni shranjeno — preveri Wi-Fi'
                log('shranjevanje:', e)
                return
            if status == 200:
                with self.lock:
                    self.version = odg['version']
                self.napaka = None
                return
            if status == 409 and odg:
                with self.lock:
                    data = odg.get('data') or prazni()
                    fn(data)
                    self.version, self.data = odg['version'], data
                self.spremenjeno.set()
                continue
            self.napaka = 'napaka strežnika %s' % status
            return


# ---------------------------------------------------------------- pomožno

def danes_iso():
    return time.strftime('%Y-%m-%d')


def lokalni_dan(iso):
    if not iso:
        return ''
    if len(iso) == 10:
        return iso
    try:
        t = time.strptime(iso[:19], '%Y-%m-%dT%H:%M:%S')
        return time.strftime('%Y-%m-%d', time.localtime(time.mktime(t) - time.timezone))
    except ValueError:
        return iso[:10]


def utc_sekunde(iso):
    try:
        return calendar.timegm(time.strptime(iso[:19], '%Y-%m-%dT%H:%M:%S'))
    except (ValueError, TypeError):
        return 0


def poskusi(data):
    """Vsi poskusi vseh ciljev kot (cilj, poskus, čas v sekundah), najnovejši zadnji."""
    vsi = [(g, a, utc_sekunde(a.get('at'))) for g in data['goals'] for a in (g.get('attempts') or [])]
    return sorted(vsi, key=lambda x: x[2])


def niz_dni(data):
    """Zaporedni dnevi z vsaj enim poskusom; danes brez poskusa niza še ne prekine."""
    dnevi = {time.strftime('%Y-%m-%d', time.localtime(t)) for _, _, t in poskusi(data)}
    zdaj = time.time()
    if time.strftime('%Y-%m-%d', time.localtime(zdaj)) not in dnevi:
        zdaj -= 86400
    n = 0
    while time.strftime('%Y-%m-%d', time.localtime(zdaj - n * 86400)) in dnevi:
        n += 1
    return n


def zabelezi_poskus(gid, vrednost=None):
    """Enako kot incrementFail v aplikaciji: pod merilom (ali brez njega) je to spodletljaj."""
    def fn(d):
        for g in d['goals']:
            if g['id'] != gid:
                continue
            ok = vrednost is not None and bool(g.get('attemptTarget')) and vrednost >= g['attemptTarget']
            poskus = {'id': str(uuid.uuid4()), 'at': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()), 'ok': ok}
            if vrednost is not None:
                poskus['value'] = vrednost
            g['attempts'] = (g.get('attempts') or []) + [poskus]
            if ok:
                g['completed'] = True
                continue
            g['failCount'] = g.get('failCount', 0) + 1
            g['completed'] = g['failCount'] >= g.get('failTarget', 1)
            g['progress'] = min(100, round(g['failCount'] / max(1, g.get('failTarget', 1)) * 100))
    return fn


def pred(sekunde):
    m = int(max(0, time.time() - sekunde) // 60)
    if m < 60:
        return 'pred %d min' % m
    if m < 48 * 60:
        return 'pred %d h' % (m // 60)
    return 'pred %d dnevi' % (m // 1440)


def lep_datum(iso):
    try:
        y, m, d = iso[:10].split('-')
        return '%d. %s' % (int(d), MESECI[int(m) - 1])
    except (ValueError, IndexError):
        return iso


def minute(hhmm, privzeto):
    try:
        h, m = hhmm.split(':')
        return int(h) * 60 + int(m)
    except (ValueError, AttributeError):
        return privzeto


def skrajsaj(d, besedilo, pisava, sirina):
    if d.textlength(besedilo, font=pisava) <= sirina:
        return besedilo
    while besedilo and d.textlength(besedilo + '…', font=pisava) > sirina:
        besedilo = besedilo[:-1]
    return besedilo + '…'


def zaokrozen(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, r, fill=fill, outline=outline, width=width)


# ---------------------------------------------------------------- vmesnik

TIPKE = [
    list('1234567890'),
    list('qwertzuiopš'),
    list('asdfghjklčž'),
    ['Aa'] + list('yxcvbnm,.') + ['←'],
]
STEVILKE = [list('123'), list('456'), list('789'), ['←', '0']]
SIMBOLI = [
    list('1234567890'),
    list('!@#$%&*()-_'),
    list('=+?/:;\'"<>'),
    ['Aa'] + list('[]{}~^|\\') + ['←'],
]


class Vreme:
    """Open-Meteo (brez ključa), osveži vsakih 30 min."""

    def __init__(self):
        self.podatki = None
        self.kraj = None
        self.cas = 0

    def osvezi(self, kraj):
        if self.podatki and kraj == self.kraj and time.time() - self.cas < VREME_S:
            return
        url = ('https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&timezone=auto&forecast_days=1'
               '&current=temperature_2m,weather_code'
               '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max'
               % (kraj['lat'], kraj['lon']))
        try:
            with urllib.request.urlopen(url, timeout=15) as r:
                self.podatki = json.loads(r.read())
            self.kraj, self.cas = kraj, time.time()
        except Exception as e:
            self.cas = time.time() - VREME_S + 300  # ponovno čez 5 min
            log('vreme:', e)

    def povzetek(self):
        try:
            c, dn = self.podatki['current'], self.podatki['daily']
            opis = next(o for k, o in VREME_OPIS if c['weather_code'] <= k)
            pod = '%s · %d°/%d°' % (opis, round(dn['temperature_2m_min'][0]), round(dn['temperature_2m_max'][0]))
            dez = dn.get('precipitation_probability_max', [None])[0]
            if dez:
                pod += ' · dež %d %%' % dez
            return '%d °C' % round(c['temperature_2m']), pod
        except (TypeError, KeyError, IndexError, StopIteration):
            return '—', 'ni podatkov'


def wpa_cli(*ukaz):
    try:
        return subprocess.run(['wpa_cli', '-i', 'wlan0'] + list(ukaz), capture_output=True,
                              text=True, timeout=10).stdout
    except (OSError, subprocess.SubprocessError):
        return ''


def wifi_stanje():
    for v in wpa_cli('status').splitlines():
        if v.startswith('wpa_state='):
            return v.split('=', 1)[1]
    return 'NI'


def pravo_ime_omrezja(ssid):
    """Vrne ime omrežja točno tako, kot ga oddaja router (velike/male črke)."""
    for v in wpa_cli('scan_results').splitlines()[1:]:
        deli = v.split('	')
        if len(deli) >= 5 and deli[4].strip().lower() == ssid.strip().lower():
            return deli[4]
    return ssid


def povezi_wifi(ssid, geslo):
    """Zapiše wpa.conf (samo zgoščeno geslo) in ponovno zažene wpa_supplicant + DHCP."""
    izhod = subprocess.run(['wpa_passphrase', ssid, geslo], capture_output=True, text=True).stdout
    blok = '\n'.join(v for v in izhod.splitlines() if not v.strip().startswith('#psk='))
    with open(WPA + '.nov', 'w') as f:
        f.write('ctrl_interface=/var/run/wpa_supplicant\n' + blok + '\n')
    os.chmod(WPA + '.nov', 0o600)
    os.replace(WPA + '.nov', WPA)
    for pid in ('/run/wpa.pid', '/run/udhcpc.pid'):
        try:
            os.kill(int(open(pid).read()), 15)
        except (OSError, ValueError):
            pass
    time.sleep(1)
    subprocess.run(['wpa_supplicant', '-B', '-i', 'wlan0', '-c', WPA, '-D', 'wext', '-P', '/run/wpa.pid'])
    subprocess.run(['udhcpc', '-i', 'wlan0', '-b', '-p', '/run/udhcpc.pid',
                    '-s', '/usr/share/udhcpc/default.script'])
    log('Wi-Fi nastavljen za', ssid)


class Planer:
    def __init__(self):
        self.zaslon = Zaslon()
        self.dotik = Dotik()
        self.tipke = Tipke()
        self.zvok = Zvok()
        try:
            with open(LOKALNE) as f:
                self.lokalne = json.load(f)
        except (OSError, ValueError):
            self.lokalne = {}
        self.rocno_ugasnjen = False
        self.p = Podatki()
        self.vreme = Vreme()
        self.sporocilo = None  # (besedilo, podnaslov, barva, do kdaj)
        self.zavihek = 'danes'
        self.odprt_cilj = None
        self.zamik = {'danes': 0, 'cilji': 0}
        self.tipkovnica = None  # {'cilj': id ali None, 'besedilo': '', 'velike': False}
        self.cone = []
        self.zadnji_dotik = time.time()
        self.narisano = None
        self.wifi = 'NI'
        self.budno_do = 0
        self.ignoriraj_do = 0
        if not os.path.exists(WPA):
            self.tipkovnica = {'namen': 'ssid', 'besedilo': 'ASUS', 'velike': False}

    # ---------- nastavitve (data.tablica na strežniku, sicer lokalno)

    def nastavitve(self):
        t = dict(PRIVZETO)
        t.update(self.lokalne)
        t.update(self.p.d().get('tablica') or {})
        return t

    def nastavi(self, kljuc, vrednost):
        self.lokalne[kljuc] = vrednost
        try:
            with open(LOKALNE + '.nov', 'w') as f:
                json.dump(self.lokalne, f)
            os.replace(LOKALNE + '.nov', LOKALNE)
        except OSError as e:
            log('nastavitve:', e)
        if self.p.data is not None:
            def fn(d):
                d['tablica'] = dict(d.get('tablica') or {}, **{kljuc: vrednost})
            self.p.spremeni(fn)
        self.narisano = None

    # ---------- dejanja

    def dejanje(self, kaj, *arg):
        self.zadnji_dotik = time.time()
        if kaj == 'nic':
            return
        if kaj == 'zapri':
            self.sporocilo = None
            return
        if self.nastavitve().get('zvokDotik') and kaj not in ('korak', 'preizkus', 'opravilo'):
            self.zvok.predvajaj('klik')
        if kaj == 'zavihek':
            self.zavihek = arg[0]
            self.odprt_cilj = None
        elif kaj == 'opravilo':
            tid = arg[0]

            def fn(d):
                for t in d['todos']:
                    if t['id'] == tid:
                        t['completed'] = not t.get('completed')
            if any(t['id'] == tid and not t.get('completed') for t in self.p.d()['todos']):
                self.zvok.predvajaj('kljukica')
            elif self.nastavitve().get('zvokDotik'):
                self.zvok.predvajaj('klik')
            self.p.spremeni(fn)
        elif kaj == 'cilj':
            self.odprt_cilj = None if self.odprt_cilj == arg[0] else arg[0]
        elif kaj == 'mejnik':
            gid, mid = arg

            def fn(d):
                for g in d['goals']:
                    if g['id'] == gid:
                        for m in g.get('milestones') or []:
                            if m['id'] == mid:
                                m['completed'] = not m.get('completed')
            self.p.spremeni(fn)
        elif kaj == 'poskus':
            g = next((x for x in self.p.d()['goals'] if x['id'] == arg[0]), None)
            if g and g.get('attemptTarget'):
                self.tipkovnica = {'namen': 'poskus', 'cilj': g['id'], 'besedilo': '', 'velike': False,
                                   'enota': g.get('attemptUnit') or '', 'meja': g['attemptTarget']}
            elif g:
                self.poskus(g, None)
        elif kaj == 'dodaj':
            self.tipkovnica = {'namen': 'podcilj' if arg else 'opravilo', 'cilj': arg[0] if arg else None,
                               'besedilo': '', 'velike': True}
        elif kaj == 'korak':
            kljuc, korak, lo, hi = arg
            t = self.nastavitve()
            if kljuc in ('vklop', 'izklop'):
                m = (minute(t[kljuc], 0) + korak) % (24 * 60)
                self.nastavi(kljuc, '%02d:%02d' % (m // 60, m % 60))
            else:
                self.nastavi(kljuc, max(lo, min(hi, int(t[kljuc]) + korak)))
            if kljuc == 'glasnost':
                self.zvok.nastavi_glasnost(self.nastavitve()['glasnost'])
                self.zvok.predvajaj('kljukica')
            elif self.nastavitve().get('zvokDotik'):
                self.zvok.predvajaj('klik')
        elif kaj == 'preklopi':
            self.nastavi(arg[0], not self.nastavitve().get(arg[0]))
        elif kaj == 'preizkus':
            self.zvok.predvajaj('preizkus')
        elif kaj == 'ugasni':
            self.rocno_ugasnjen = True
        elif kaj == 'wifi':
            self.tipkovnica = {'namen': 'ssid', 'besedilo': 'ASUS', 'velike': False}
        elif kaj == 'tipka':
            self.tipka(arg[0])
        elif kaj == 'listaj':
            z, korak = arg
            self.zamik[z] = max(0, self.zamik[z] + korak)

    def tipka(self, t):
        tk = self.tipkovnica
        if t == 'preklici':
            self.tipkovnica = None
        elif t == '#+=':
            tk['simboli'] = not tk.get('simboli')
        elif t == '←':
            tk['besedilo'] = tk['besedilo'][:-1]
        elif t == 'Aa':
            tk['velike'] = not tk['velike']
        elif t == 'presledek':
            tk['besedilo'] += ' '
        elif t == 'shrani' and tk['namen'] == 'ssid':
            self.tipkovnica = {'namen': 'geslo', 'ssid': pravo_ime_omrezja(tk['besedilo']),
                               'besedilo': '', 'velike': False}
        elif t == 'shrani' and tk['namen'] == 'poskus':
            self.tipkovnica = None
            g = next((x for x in self.p.d()['goals'] if x['id'] == tk['cilj']), None)
            if g and tk['besedilo'].isdigit():
                self.poskus(g, int(tk['besedilo']))
        elif t == 'shrani' and tk['namen'] == 'geslo':
            ssid, geslo = tk['ssid'], tk['besedilo']
            self.tipkovnica = None
            self.budno_do = time.time() + 600  # po nastavitvi ostane zaslon 10 min prižgan
            threading.Thread(target=povezi_wifi, args=(ssid, geslo), daemon=True).start()
        elif t == 'shrani':
            besedilo = tk['besedilo'].strip()
            gid = tk['cilj']
            self.tipkovnica = None
            if not besedilo:
                return
            if gid:
                def fn(d):
                    for g in d['goals']:
                        if g['id'] == gid:
                            g.setdefault('milestones', []).append(
                                {'id': str(uuid.uuid4()), 'text': besedilo, 'completed': False})
            else:
                novo = {'id': str(uuid.uuid4()), 'text': besedilo, 'completed': False,
                        'priority': 'medium', 'category': 'Personal',
                        'createdAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
                        'dueDate': danes_iso()}

                def fn(d):
                    d['todos'].append(novo)
            self.p.spremeni(fn)
        else:
            tk['besedilo'] += t.upper() if tk['velike'] else t
            tk['velike'] = False

    def poskus(self, g, vrednost):
        meja = g.get('attemptTarget')
        uspeh = vrednost is not None and meja and vrednost >= meja
        self.p.spremeni(zabelezi_poskus(g['id'], vrednost))
        g = next((x for x in self.p.d()['goals'] if x['id'] == g['id']), g)
        rezultat = ('%d/%d %s · ' % (vrednost, meja, g.get('attemptUnit') or '')) if vrednost is not None and meja else ''
        if uspeh:
            self.zvok.predvajaj('preizkus')
            self.sporocilo = ('USPELO!', rezultat + 'cilj »%s« je dosežen. Po %d spodletljajih.'
                              % (g.get('title', ''), g.get('failCount', 0)), ZELENA, time.time() + 10)
        else:
            self.zvok.predvajaj('kljukica')
            ostane = max(0, (g.get('failTarget') or 0) - (g.get('failCount') or 0))
            self.sporocilo = ('Spodletljaj #%d — odlično!' % g.get('failCount', 0),
                              rezultat + ('še %d do cilja. Počij in poskusi znova čez par ur ali jutri.' % ostane
                                          if ostane else 'dosegel si število spodletljajev — naučil si se!'),
                              ORANZNA, time.time() + 8)
        self.narisano = None

    def tap(self, x, y):
        for (x0, y0, x1, y1), akcija in reversed(self.cone):
            if x0 <= x <= x1 and y0 <= y <= y1:
                self.dejanje(*akcija)
                return True
        return False

    # ---------- risanje

    def cona(self, box, *akcija):
        self.cone.append((box, akcija))

    def narisi(self):
        self.cone = []
        img = Image.new('RGB', (W, H), BG)
        d = ImageDraw.Draw(img)
        self.glava(d)
        if self.zavihek == 'danes':
            self.stran_danes(d)
        elif self.zavihek == 'cilji':
            self.stran_cilji(d)
        else:
            self.stran_nastavitve(d)
        if self.sporocilo and time.time() < self.sporocilo[3]:
            naslov, pod, barva, _ = self.sporocilo
            zaokrozen(d, (90, 280, W - 90, 470), 20, fill=(24, 24, 32), outline=barva, width=3)
            d.text((W // 2, 340), naslov, font=F(44, True), fill=barva, anchor='mm')
            d.text((W // 2, 410), skrajsaj(d, pod, F(19), W - 220), font=F(19), fill=TEKST, anchor='mm')
            self.cona((0, 0, W, H), 'zapri')
        if self.tipkovnica:
            self.risi_tipkovnico(d)
        return img

    def glava(self, d):
        data = self.p.d()
        zdaj = time.localtime()
        h = zdaj.tm_hour
        pozdrav = ('Lahko noč' if h < 5 or h >= 22 else 'Dobro jutro' if h < 10 else
                   'Dober dan' if h < 18 else 'Dober večer')
        d.text((24, 16), '%s, %s' % (pozdrav, data.get('userName') or 'David'), font=F(18), fill=SIVA)
        d.text((20, 36), time.strftime('%H:%M'), font=F(92, True), fill=TEKST)
        dan = DNEVI[zdaj.tm_wday] + ', '
        d.text((24, 140), dan, font=F(26, True), fill=TEKST)
        x = 24 + d.textlength(dan, font=F(26, True))
        dm = '%d. %s ' % (zdaj.tm_mday, MESECI[zdaj.tm_mon - 1])
        d.text((x, 140), dm, font=F(26, True), fill=ORANZNA)
        d.text((x + d.textlength(dm, font=F(26, True)), 140), str(zdaj.tm_year), font=F(26, True), fill=TEKST)

        vse, narejeno = self.stevec_danes()
        pct = round(narejeno / vse * 100) if vse else 0
        barva = ZELENA if pct == 100 and vse else TEKST
        d.text((W - 24, 40), 'DANES', font=F(13, True), fill=TEMNA, anchor='ra')
        d.text((W - 24, 58), '%d%%' % pct, font=F(52, True), fill=barva, anchor='ra')
        zaokrozen(d, (W - 204, 124, W - 24, 130), 3, fill=ROB)
        if pct:
            zaokrozen(d, (W - 204, 124, W - 204 + int(180 * pct / 100), 130), 3,
                      fill=ZELENA if pct == 100 else ORANZNA)
        d.text((W - 24, 138), '%d od %d opravljenih' % (narejeno, vse), font=F(15), fill=SIVA, anchor='ra')

        # zavihki
        for i, (ime, kljuc) in enumerate((('Danes', 'danes'), ('Cilji', 'cilji'), ('Nastavitve', 'nastavitve'))):
            x0 = 24 + i * 150
            izbran = self.zavihek == kljuc
            d.text((x0 + 20, 186), ime, font=F(22, True), fill=TEKST if izbran else TEMNA)
            if izbran:
                d.rectangle((x0, 222, x0 + 130, 225), fill=ORANZNA)
            self.cona((x0, 176, x0 + 140, 228), 'zavihek', kljuc)
        d.line((24, 226, W - 24, 226), fill=ROB)
        if self.wifi != 'COMPLETED':
            d.text((W - 24, 196), 'Wi-Fi ni povezan · tapni za nastavitev', font=F(16, True),
                   fill=RDECA, anchor='ra')
            self.cona((W - 420, 180, W, 226), 'wifi')
            return
        stanje = self.p.napaka or ('posodobljeno ' + self.p.zadnjic if self.p.zadnjic else '')
        d.text((W - 24, 196), stanje, font=F(14), fill=RDECA if self.p.napaka else TEMNA, anchor='ra')

    def opravila_danes(self):
        danes = danes_iso()
        zamujena, zdaj = [], []
        for t in self.p.d()['todos']:
            if t.get('dueDate'):
                if not (t['dueDate'] <= danes and (not t.get('completed') or t['dueDate'] == danes)):
                    continue
            elif t.get('completed') and lokalni_dan(t.get('createdAt')) != danes:
                continue
            if not t.get('completed') and t.get('dueDate') and t['dueDate'] < danes:
                zamujena.append(t)
            else:
                zdaj.append(t)
        kljuc = lambda t: (bool(t.get('completed')), PRIORITETA.get(t.get('priority'), 1), t.get('createdAt', ''))
        return sorted(zamujena, key=kljuc), sorted(zdaj, key=kljuc)

    def stevec_danes(self):
        zamujena, zdaj = self.opravila_danes()
        return len(zamujena) + len(zdaj), sum(1 for t in zdaj if t.get('completed'))

    def ploscica(self, d, x, y, w, oznaka, vrednost, pod, ok=False):
        zaokrozen(d, (x, y, x + w, y + 92), 14, fill=KARTICA, outline=ROB)
        d.text((x + 16, y + 12), oznaka, font=F(12, True), fill=TEMNA)
        d.text((x + 16, y + 30), skrajsaj(d, vrednost, F(28, True), w - 30), font=F(28, True),
               fill=ZELENA if ok else TEKST)
        d.text((x + 16, y + 66), skrajsaj(d, pod, F(14), w - 30), font=F(14), fill=SIVA)

    def stran_danes(self, d):
        data, danes = self.p.d(), danes_iso()
        vadba = next((v for v in data['workouts'] if v.get('date') == danes), None)
        teden_meja = time.strftime('%Y-%m-%d', time.localtime(time.time() - 7 * 86400))
        teden = sum(1 for v in data['workouts'] if (v.get('date') or '') >= teden_meja)
        spanje = max(data['sleep'], key=lambda s: s.get('date', ''), default=None)
        aktivni = [g for g in data['goals'] if not g.get('completed')]
        vsi = poskusi(data)
        danes_spod = sum(1 for _, a, t in vsi
                         if not a.get('ok') and time.strftime('%Y-%m-%d', time.localtime(t)) == danes)
        skupaj = sum(g.get('failCount') or 0 for g in data['goals'])
        niz = niz_dni(data)
        sir = (W - 48 - 30) // 4
        temp, opis = self.vreme.povzetek()
        self.ploscica(d, 24, 240, sir, 'VREME · ' + self.nastavitve()['kraj']['ime'].upper(), temp, opis)
        self.ploscica(d, 34 + sir, 240, sir, 'SPANJE',
                      '%s h' % spanje.get('hours') if spanje else '—',
                      (('to noč' if spanje.get('date') == danes else lep_datum(spanje.get('date', ''))) +
                       (' · %s/5' % spanje['quality'] if spanje.get('quality') else ''))
                      if spanje else 'ni vpisa')
        self.ploscica(d, 44 + 2 * sir, 240, sir, 'NIZ DNI',
                      '%d %s' % (niz, 'dan' if niz == 1 else 'dni') if niz else '—',
                      'poskusi vsak dan' if niz < 2 else 'ne prekini ga!', niz >= 3)
        self.ploscica(d, 54 + 3 * sir, 240, sir, 'SPODLETELO DANES', str(danes_spod),
                      'skupaj %d · vadba %s' % (skupaj, '✓' if vadba else '%d×/teden' % teden), danes_spod > 0)

        # fokus: cilj z zadnjim poskusom (ali prvi aktivni) in spodbuda
        zadnji = {g['id']: t for g, _, t in vsi}
        fokus = max(aktivni, key=lambda g: zadnji.get(g['id'], 0), default=None)
        zaokrozen(d, (24, 344, W - 24, 430), 14, fill=(30, 20, 22) if fokus else KARTICA, outline=(90, 40, 44))
        if fokus:
            spod, cilj = fokus.get('failCount') or 0, fokus.get('failTarget') or 0
            d.text((44, 356), skrajsaj(d, fokus.get('title', ''), F(22, True), W - 330), font=F(22, True), fill=TEKST)
            d.text((W - 270, 358), '%d/%d' % (spod, cilj), font=F(22, True), fill=RDECA, anchor='ra')
            moji = [(a, t) for g, a, t in vsi if g['id'] == fokus['id']]
            if not moji:
                vrsta = 'Še nobenega poskusa. Prvi spodletljaj je najpomembnejši.'
            else:
                a, t = moji[-1]
                vr = (' (%s/%s)' % (a['value'], fokus['attemptTarget'])
                      if a.get('value') is not None and fokus.get('attemptTarget') else '')
                if time.strftime('%Y-%m-%d', time.localtime(t)) != danes:
                    vrsta = 'Danes še nisi poskusil%s. Zadnjič %s%s.' % (
                        '' if not fokus.get('attemptTarget') else ' (cilj %s %s)' % (
                            fokus['attemptTarget'], fokus.get('attemptUnit') or ''), pred(t), vr)
                elif time.time() - t < 3 * 3600:
                    vrsta = 'Poskus %s%s. Počij — čez par ur znova!' % (pred(t), vr)
                else:
                    vrsta = 'Zadnji poskus %s%s. Čas za novega!' % (pred(t), vr)
            d.text((44, 396), skrajsaj(d, vrsta, F(16), W - 330), font=F(16), fill=SIVA)
            zaokrozen(d, (W - 250, 354, W - 36, 420), 12, fill=RDECA)
            d.text((W - 143, 376), 'Poskusil sem', font=F(20, True), fill=TEKST, anchor='mm')
            d.text((W - 143, 402), 'spodletelo / uspelo', font=F(12), fill=(255, 220, 220), anchor='mm')
            self.cona((W - 250, 344, W - 24, 430), 'poskus', fokus['id'])
        else:
            d.text((44, 387), SPODBUDE[int(time.time() // 3600) % len(SPODBUDE)], font=F(20), fill=SIVA, anchor='lm')

        # gumb za novo opravilo
        zaokrozen(d, (24, 442, W - 24, 486), 12, fill=(22, 22, 30), outline=(42, 42, 56))
        d.text((44, 464), '+  Novo opravilo za danes …', font=F(18), fill=SIVA, anchor='lm')
        zaokrozen(d, (W - 150, 442, W - 24, 486), 12, fill=ORANZNA)
        d.text((W - 87, 464), 'Dodaj', font=F(18, True), fill=BG, anchor='mm')
        self.cona((24, 442, W - 24, 486), 'dodaj')

        zamujena, zdaj = self.opravila_danes()
        vrstice = []
        if zamujena:
            vrstice.append(('naslov', 'ZAMUJENO', RDECA))
            vrstice += [('opravilo', t) for t in zamujena]
            vrstice.append(('naslov', 'DANES', TEMNA))
        vrstice += [('opravilo', t) for t in zdaj]
        self.seznam(d, 'danes', vrstice, 498)

    def seznam(self, d, kljuc, vrstice, y0):
        """Nariše vrstice od y0 navzdol; če jih je preveč, doda puščici za listanje."""
        visina = {'naslov': 34, 'opravilo': 72}
        dno = H - 12
        if not vrstice:
            d.text((W // 2, y0 + 60), 'Za danes ni opravil. Dodaj prvo zgoraj.', font=F(20), fill=TEMNA, anchor='mm')
            return
        skupaj = sum(visina[v[0]] for v in vrstice)
        prevec = skupaj > dno - y0
        zamik = min(self.zamik[kljuc], max(0, len(vrstice) - 1)) if prevec else 0
        self.zamik[kljuc] = zamik
        y = y0
        desno = W - 24 - (70 if prevec else 0)
        for v in vrstice[zamik:]:
            h = visina[v[0]]
            if y + h > dno:
                break
            if v[0] == 'naslov':
                d.text((28, y + 12), v[1], font=F(13, True), fill=v[2])
            else:
                self.vrstica_opravila(d, v[1], y, desno)
            y += h
        if prevec:
            for i, (znak, korak) in enumerate((('▲', -3), ('▼', 3))):
                yy = y0 + i * ((dno - y0) // 2)
                zaokrozen(d, (W - 84, yy, W - 24, yy + (dno - y0) // 2 - 8), 12, fill=KARTICA, outline=ROB)
                d.text((W - 54, yy + (dno - y0) // 4), znak, font=F(28, True), fill=SIVA, anchor='mm')
                self.cona((W - 84, yy, W - 24, yy + (dno - y0) // 2 - 8), 'listaj', kljuc, korak)

    def kljukica(self, d, x, y, velikost, ok):
        if ok:
            zaokrozen(d, (x, y, x + velikost, y + velikost), 9, fill=ZELENA)
            d.line((x + velikost * .25, y + velikost * .52, x + velikost * .43, y + velikost * .72,
                    x + velikost * .76, y + velikost * .3), fill=BG, width=5, joint='curve')
        else:
            zaokrozen(d, (x, y, x + velikost, y + velikost), 9, outline=(58, 58, 80), width=3)

    def vrstica_opravila(self, d, t, y, desno):
        danes = danes_iso()
        ok = bool(t.get('completed'))
        zaokrozen(d, (24, y, desno, y + 64), 14, fill=KARTICA, outline=ROB)
        self.kljukica(d, 40, y + 13, 38, ok)
        d.text((96, y + 10), skrajsaj(d, t.get('text', ''), F(22, True), desno - 150), font=F(22, True),
               fill=TEMNA if ok else TEKST)
        if ok:
            sir = d.textlength(skrajsaj(d, t.get('text', ''), F(22, True), desno - 150), font=F(22, True))
            d.line((96, y + 24, 96 + sir, y + 24), fill=TEMNA, width=2)
        opis = [t.get('category') or '']
        if t.get('priority'):
            opis.append('prioriteta ' + PRIORITETA_IME.get(t['priority'], t['priority']))
        if t.get('dueDate') and t['dueDate'] < danes:
            opis.append('rok ' + lep_datum(t['dueDate']))
        d.text((96, y + 38), ' · '.join(o for o in opis if o), font=F(14), fill=SIVA)
        d.ellipse((desno - 30, y + 26, desno - 18, y + 38), fill=PRIORITETA_BARVA.get(t.get('priority'), ORANZNA))
        self.cona((24, y, desno, y + 64), 'opravilo', t['id'])

    def stran_cilji(self, d):
        cilji = sorted(self.p.d()['goals'], key=lambda g: bool(g.get('completed')))
        if not cilji:
            d.text((W // 2, 360), 'Ni ciljev. Dodaš jih v aplikaciji (Goals).', font=F(20), fill=TEMNA, anchor='mm')
            return
        y, dno = 240, H - 12
        zamik = min(self.zamik['cilji'], len(cilji) - 1)
        self.zamik['cilji'] = zamik
        desno = W - 24 - (70 if len(cilji) > 1 else 0)
        for g in cilji[zamik:]:
            h = self.kartica_cilja(d, g, y, desno, dno)
            if h is None:
                break
            y += h + 10
        if len(cilji) > 1:
            for i, (znak, korak) in enumerate((('▲', -1), ('▼', 1))):
                yy = 240 + i * ((dno - 240) // 2)
                zaokrozen(d, (W - 84, yy, W - 24, yy + (dno - 240) // 2 - 8), 12, fill=KARTICA, outline=ROB)
                d.text((W - 54, yy + (dno - 240) // 4), znak, font=F(28, True), fill=SIVA, anchor='mm')
                self.cona((W - 84, yy, W - 24, yy + (dno - 240) // 2 - 8), 'listaj', 'cilji', korak)

    def kartica_cilja(self, d, g, y, desno, dno):
        m = g.get('milestones') or []
        odprt = self.odprt_cilj == g['id']
        cilj, spod = g.get('failTarget') or 0, g.get('failCount') or 0
        h = 104 + (78 if cilj else 0) + (len(m) * 52 + 66 if odprt else 0)
        if y + min(h, 120) > dno:
            return None
        h = min(h, dno - y)
        zaokrozen(d, (24, y, desno, y + h), 14, fill=KARTICA, outline=ROB)
        narejeni = sum(1 for x in m if x.get('completed'))
        pct = round(narejeni / len(m) * 100) if m else (g.get('progress') or 0)
        d.text((44, y + 16), skrajsaj(d, g.get('title', ''), F(24, True), desno - 220), font=F(24, True), fill=TEKST)
        opis = [KATEGORIJA.get(g.get('category'), g.get('category') or '')]
        if g.get('targetDate'):
            opis.append('do ' + lep_datum(g['targetDate']))
        if g.get('completed'):
            opis.append('dosežen')
        d.text((44, y + 50), ' · '.join(o for o in opis if o), font=F(15), fill=SIVA)
        d.text((desno - 20, y + 14), '%d%%' % pct, font=F(28, True), fill=TEKST, anchor='ra')
        d.text((desno - 20, y + 50), '%d/%d podciljev' % (narejeni, len(m)) if m else 'brez podciljev',
               font=F(13), fill=SIVA, anchor='ra')
        barva = g.get('color') or '#f59e0b'
        zaokrozen(d, (44, y + 82, desno - 20, y + 90), 4, fill=ROB)
        if pct:
            zaokrozen(d, (44, y + 82, 44 + int((desno - 64) * pct / 100), y + 90), 4, fill=barva)
        self.cona((24, y, desno, y + 96), 'cilj', g['id'])
        yy = y + 104
        if cilj:
            d.text((44, yy), str(spod), font=F(34, True), fill=RDECA)
            sx = 44 + d.textlength(str(spod), font=F(34, True))
            d.text((sx + 6, yy + 14), '/ %d' % cilj, font=F(18), fill=SIVA)
            pod = 'cilj dosežen!' if spod >= cilj else 'spodletljajev · še %d do cilja' % (cilj - spod)
            vrednosti = [a['value'] for a in (g.get('attempts') or []) if a.get('value') is not None]
            if g.get('attemptTarget') and vrednosti:
                pod += ' · zadnji %d, najboljši %d/%d' % (vrednosti[-1], max(vrednosti), g['attemptTarget'])
            d.text((44, yy + 44), pod, font=F(15), fill=SIVA)
            zaokrozen(d, (300, yy + 30, desno - 200, yy + 36), 3, fill=ROB)
            zaokrozen(d, (300, yy + 30, 300 + int((desno - 500) * min(1, spod / cilj)), yy + 36), 3, fill=RDECA)
            if not g.get('completed'):
                zaokrozen(d, (desno - 180, yy - 4, desno - 20, yy + 64), 12, fill=(45, 20, 24), outline=(110, 40, 44))
                d.text((desno - 100, yy + 16), 'Poskusil sem', font=F(15, True), fill=RDECA, anchor='mm')
                d.text((desno - 100, yy + 44), '+1' if not g.get('attemptTarget') else 'vpiši rezultat',
                       font=F(24 if not g.get('attemptTarget') else 14, True), fill=RDECA, anchor='mm')
                self.cona((desno - 180, yy - 4, desno - 20, yy + 64), 'poskus', g['id'])
            yy += 78
        if odprt:
            d.line((44, yy - 4, desno - 20, yy - 4), fill=ROB)
            for x in m:
                if yy + 52 > y + h:
                    break
                self.kljukica(d, 44, yy + 8, 34, x.get('completed'))
                d.text((96, yy + 14), skrajsaj(d, x.get('text', ''), F(19), desno - 140), font=F(19),
                       fill=TEMNA if x.get('completed') else TEKST)
                self.cona((24, yy, desno, yy + 50), 'mejnik', g['id'], x['id'])
                yy += 52
            if yy + 56 <= y + h:
                zaokrozen(d, (44, yy + 6, desno - 20, yy + 54), 12, fill=(22, 22, 30), outline=(42, 42, 56))
                d.text((64, yy + 30), '+  Nov podcilj …', font=F(18), fill=SIVA, anchor='lm')
                self.cona((44, yy + 6, desno - 20, yy + 54), 'dodaj', g['id'])
        return h

    def stran_nastavitve(self, d):
        t = self.nastavitve()
        vrstice = (('Svetlost podnevi', '%d %%' % t['svetlost'], ('svetlost', 10, 10, 100)),
                   ('Svetlost ponoči', '%d %%' % t['svetlostNoc'], ('svetlostNoc', 5, 5, 100)),
                   ('Zaslon se prižge ob', t['vklop'], ('vklop', 30, 0, 0)),
                   ('Zaslon se ugasne ob', t['izklop'], ('izklop', 30, 0, 0)),
                   ('Glasnost', '%d %%' % t['glasnost'], ('glasnost', 10, 0, 100)))
        y = 244
        for ime, vrednost, (kljuc, korak, lo, hi) in vrstice:
            zaokrozen(d, (24, y, W - 24, y + 56), 12, fill=KARTICA, outline=ROB)
            d.text((44, y + 28), ime, font=F(20), fill=TEKST, anchor='lm')
            if kljuc == ('svetlost' if self.je_dan() else 'svetlostNoc'):
                x = 56 + d.textlength(ime, font=F(20))
                zaokrozen(d, (x, y + 15, x + 112, y + 41), 8, fill=(20, 60, 46))
                d.text((x + 56, y + 28), 'velja zdaj', font=F(14, True), fill=ZELENA, anchor='mm')
            for x0, znak, k in ((W - 330, '−', -korak), (W - 104, '+', korak)):
                zaokrozen(d, (x0, y + 6, x0 + 72, y + 50), 10, fill=(52, 52, 66))
                d.text((x0 + 36, y + 28), znak, font=F(28, True), fill=TEKST, anchor='mm')
                self.cona((x0 - 6, y, x0 + 78, y + 56), 'korak', kljuc, k, lo, hi)
            d.text((W - 181, y + 28), vrednost, font=F(24, True), fill=ORANZNA, anchor='mm')
            if kljuc == 'glasnost':
                zaokrozen(d, (W - 470, y + 6, W - 350, y + 50), 10, fill=(52, 52, 66))
                d.text((W - 410, y + 28), 'Preizkusi', font=F(17, True), fill=TEKST, anchor='mm')
                self.cona((W - 470, y, W - 350, y + 56), 'preizkus')
            y += 64
        zaokrozen(d, (24, y, W - 24, y + 56), 12, fill=KARTICA, outline=ROB)
        d.text((44, y + 28), 'Zvok ob dotiku', font=F(20), fill=TEKST, anchor='lm')
        vkl = t.get('zvokDotik')
        zaokrozen(d, (W - 330, y + 6, W - 32, y + 50), 10, fill=ZELENA if vkl else (52, 52, 66))
        d.text((W - 181, y + 28), 'vklopljen' if vkl else 'izklopljen', font=F(20, True),
               fill=BG if vkl else TEKST, anchor='mm')
        self.cona((W - 330, y, W - 32, y + 56), 'preklopi', 'zvokDotik')
        y += 64
        sir = (W - 48 - 16) // 2
        povezan = self.wifi == 'COMPLETED'
        zaokrozen(d, (24, y, 24 + sir, y + 60), 12, fill=(52, 52, 66))
        d.text((24 + sir // 2, y + 30), 'Wi-Fi: ' + ('povezan' if povezan else 'ni povezan') + ' · spremeni',
               font=F(18, True), fill=TEKST if povezan else RDECA, anchor='mm')
        self.cona((24, y, 24 + sir, y + 60), 'wifi')
        x0 = 40 + sir
        zaokrozen(d, (x0, y, W - 24, y + 60), 12, fill=ORANZNA)
        d.text(((x0 + W - 24) // 2, y + 30), 'Ugasni zaslon zdaj', font=F(18, True), fill=BG, anchor='mm')
        self.cona((x0, y, W - 24, y + 60), 'ugasni')
        d.text((W // 2, H - 14), 'Tipka za vklop ugasne/prižge zaslon · tipki za glasnost spreminjata glasnost'
               ' · enake nastavitve so v aplikaciji (Settings → Tablica)', font=F(12), fill=TEMNA, anchor='mm')

    def risi_tipkovnico(self, d):
        tk = self.tipkovnica
        top = 300
        d.rectangle((0, top - 90, W, H), fill=(10, 10, 14))
        self.cona((0, top - 90, W, H), 'nic')  # dotiki pod tipkovnico ne štejejo
        d.line((0, top - 90, W, top - 90), fill=ROB, width=2)
        naslov = {'podcilj': 'Nov podcilj', 'opravilo': 'Novo opravilo za danes',
                  'ssid': 'WI-FI: ime omrežja (preveri in pritisni Naprej)',
                  'geslo': 'WI-FI: geslo za omrežje »%s«' % tk.get('ssid', ''),
                  'poskus': 'Koliko %s si naredil? (cilj %s — manj je spodletljaj, in to je OK)'
                            % (tk.get('enota') or '', tk.get('meja'))}[tk['namen']]
        d.text((24, top - 80), naslov, font=F(14, True), fill=SIVA)
        zaokrozen(d, (24, top - 56, W - 24, top - 8), 12, fill=(22, 22, 30), outline=ORANZNA, width=2)
        prikaz = tk['besedilo']
        if tk['namen'] == 'geslo' and prikaz:
            prikaz = '•' * (len(prikaz) - 1) + prikaz[-1]  # vidna je le zadnja črka
        d.text((40, top - 32), skrajsaj(d, prikaz, F(22), W - 100)[-60:] + '|', font=F(22),
               fill=TEKST, anchor='lm')
        vrsta_h = 78
        stevilke = tk['namen'] == 'poskus'
        for r, vrsta in enumerate(STEVILKE if stevilke else SIMBOLI if tk.get('simboli') else TIPKE):
            sir = 180 if stevilke else (W - 24) // 11
            x = 12 + (W - 24 - sir * len(vrsta)) // 2
            y = top + 6 + r * vrsta_h
            for t in vrsta:
                prikaz = t.upper() if tk['velike'] and len(t) == 1 and t.isalpha() else t
                posebna = t in ('Aa', '←')
                zaokrozen(d, (x + 3, y, x + sir - 3, y + vrsta_h - 8), 10,
                          fill=ORANZNA if t == 'Aa' and tk['velike'] else (52, 52, 66) if posebna else (34, 34, 44))
                d.text((x + sir // 2, y + (vrsta_h - 8) // 2), prikaz, font=F(26, True), fill=TEKST, anchor='mm')
                self.cona((x, y, x + sir, y + vrsta_h - 4), 'tipka', t)
                x += sir
        y = top + 6 + len(TIPKE) * vrsta_h
        gotovo = {'ssid': 'Naprej', 'geslo': 'Poveži', 'poskus': 'Shrani'}.get(tk['namen'], 'Dodaj')
        gumbi = (('Prekliči', 'preklici', 170, (52, 52, 66), TEKST),
                 ('#+=', '#+=', 120, ORANZNA if tk.get('simboli') else (52, 52, 66), TEKST),
                 ('presledek', 'presledek', W - 24 - 170 - 120 - 220 - 18, (34, 34, 44), SIVA),
                 (gotovo, 'shrani', 220, ORANZNA, BG))
        x = 12
        for ime, kljuc, sir, barva, tbarva in gumbi:
            zaokrozen(d, (x + 3, y, x + sir - 3, min(H - 6, y + vrsta_h - 8)), 10, fill=barva)
            d.text((x + sir // 2, y + (vrsta_h - 8) // 2), ime, font=F(22, True), fill=tbarva, anchor='mm')
            self.cona((x, y, x + sir, H), 'tipka', kljuc)
            x += sir + 6

    # ---------- zanka

    def je_dan(self):
        t = self.nastavitve()
        vklop, izklop = minute(t.get('vklop'), 7 * 60), minute(t.get('izklop'), 22 * 60)
        zdaj = time.localtime()
        m = zdaj.tm_hour * 60 + zdaj.tm_min
        if vklop == izklop:
            return True
        return vklop <= m < izklop if vklop < izklop else (m >= vklop or m < izklop)

    def tece(self):
        threading.Thread(target=self.osvezevanje, daemon=True).start()
        threading.Thread(target=self.spremljaj_wifi, daemon=True).start()
        self.zaslon.moc(True)
        while True:
            dotiki = self.dotik.preberi()
            tipke = self.tipke.preberi()
            nast = self.nastavitve()
            dan = self.je_dan()
            zbudi = False
            if self.dotik.aktivnost:
                self.dotik.aktivnost = False
                self.zadnji_dotik = time.time()  # vsak dotik podaljša budnost
                zbudi = True
            for k in tipke:
                self.zadnji_dotik = time.time()
                if k == KEY_VKLOP and self.zaslon.prizgan and not self.rocno_ugasnjen:
                    log('tipka za vklop: ugasni zaslon')
                    self.rocno_ugasnjen = True
                    zbudi = False
                    break
                zbudi = True
                if k in (KEY_GLASNEJE, KEY_TISJE) and self.zaslon.prizgan and not self.rocno_ugasnjen:
                    self.dejanje('korak', 'glasnost', 10 if k == KEY_GLASNEJE else -10, 0, 100)
                    self.zavihek = 'nastavitve'
            if zbudi and (self.rocno_ugasnjen or not self.zaslon.prizgan):
                # že prvi dotik ali tipka prižge zaslon; ta dotik ne klikne ničesar
                log('zaslon prižgan z dotikom/tipko')
                self.rocno_ugasnjen = False
                self.zaslon.moc(True)
                self.narisano = None
                self.ignoriraj_do = time.time() + 0.8
                dotiki = []
            budno = not self.rocno_ugasnjen and (
                dan or not os.path.exists(WPA) or time.time() < self.budno_do
                or time.time() - self.zadnji_dotik < BUDNO_PONOCI_S)
            if dotiki and time.time() < self.ignoriraj_do:
                dotiki = []
            if dotiki:
                for x, y in dotiki:
                    self.tap(x, y)
                self.narisano = None
            if not budno:
                self.zaslon.moc(False)
                if not self.rocno_ugasnjen:
                    self.tipkovnica = None
            else:
                self.zaslon.moc(True)
                self.zaslon.nastavi_svetlost(int(nast['svetlost'] if dan else nast['svetlostNoc']))
            self.zvok.nastavi_glasnost(int(nast['glasnost']))
            if (not self.tipkovnica and budno and not os.path.exists(WPA)
                    and time.time() - self.zadnji_dotik > 10):
                self.tipkovnica = {'namen': 'ssid', 'besedilo': 'ASUS', 'velike': False}
                self.narisano = None
            if not self.tipkovnica and self.zavihek != 'danes' and time.time() - self.zadnji_dotik > 120:
                self.zavihek, self.odprt_cilj = 'danes', None
            kljuc = (time.strftime('%H:%M'), self.wifi, self.p.napaka, self.vreme.cas,
                     bool(self.sporocilo and time.time() < self.sporocilo[3]), self.p.version, id(self.p.data), self.p.napaka)
            if self.zaslon.prizgan and (kljuc != self.narisano or self.p.spremenjeno.is_set()):
                self.p.spremenjeno.clear()
                self.zaslon.pokazi(self.narisi())
                self.narisano = kljuc
            select.select([self.dotik.fd] + self.tipke.fds, [], [], 1.0)

    def spremljaj_wifi(self):
        while True:
            stanje = wifi_stanje()
            if stanje != self.wifi:
                log('Wi-Fi:', stanje)
                self.wifi = stanje
            time.sleep(5)

    def osvezevanje(self):
        while True:
            self.p.prenesi()
            self.vreme.osvezi(self.nastavitve()['kraj'])
            time.sleep(OSVEZI_S)


if __name__ == '__main__':
    log('zagon planerja', STREZNIK)
    try:
        Planer().tece()
    except Exception:
        import traceback
        traceback.print_exc()
        sys.exit(1)
