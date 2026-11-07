# 📖 Zgodba projekta: kako sva se lotila in kako je potekalo

> Ta dokument opisuje, *kako* je Life OS nastal — odločitve, težave in rešitve. Pisan je za vsakogar, ki ga zanima, kako razmišljam pri delu.

---

## Izhodišče

Doma sem imel:

- star prenosnik HP 14, ki ga nihče ni uporabljal,
- staro tablico Prestigio iz leta 2012 (Android 4.0, 0,8 GB RAM),
- spletno aplikacijo Life OS, ki sem jo začel delati, a je hranila podatke **samo v brskalniku** — na telefonu in računalniku sem imel dva različna »jaza«.

In vzorec, ki ga poznam pri sebi: **ideja → nova mapa → naslednja ideja**. Imel sem 18 vzporednih sistemov za produktivnost in nobenega nisem uporabljal. Ugotovil sem dve stvari:

1. **Naredim, ko imam rok in posledico.** Brez tega ne.
2. **Previsok vstopni prag me ustavi.** Ko je bil dnevnik »napiši, kako je bil dan«, sem 46 dni napisal nič.

Cilj zato ni bil »še ena aplikacija«, ampak sistem, ki **zniža prag in doda posledico**: ena vrstica na dan, opomnik ob pravem času, tedenski pregled, ki pokaže, ali sem boljši kot prejšnji teden.

---

## Način dela: jaz + AI asistent

Projekt sem delal skupaj s **Claude Code** (AI asistent za programiranje), ki je imel dostop do terminala na mojem računalniku in prek SSH do strežnika.

Kako je bilo razdeljeno:

| Jaz | AI |
|---|---|
| postavil cilj in prioritete | predlagal načrt po korakih |
| odločal (»UPnP ostane«, »tablico zavržem«) | pisal kodo in skripte |
| fizično delo: USB ključ, kabli, BIOS, gesla | diagnosticiral napake iz dnevnikov |
| preveril, ali stvar res deluje na telefonu | pisal dokumentacijo in zapiske za naprej |

Pravila, ki sem jih postavil:

- **Vsako spremembo varnosti na računalniku ali usmerjevalniku potrdim sam.** Skripte, ki rahljajo varnost Windows, zaženem sam v skrbniškem oknu.
- **Gesel ne vpisuje AI** — Wi-Fi geslo, prijave v račune vpišem jaz.
- **Brez plačljivih API-jev.** Vse teče lokalno ali na naročnini, ki jo že imam.
- **Razlage kratke, en korak naenkrat.**

---

## Faza 1 — Načrt (dan 1, popoldne)

Preden sem karkoli namestil, je nastal načrt po fazah (v mojih zasebnih zapiskih): prenosnik → varnost → varnostne kopije → aplikacija → tablica. Vsaka faza ima jasen »končano, ko …«.

**Zakaj:** moj vzorec je, da začnem pet stvari naenkrat. Načrt s fazami me je prisilil, da končam eno.

---

## Faza 2 — Domači strežnik iz starega prenosnika

1. Prenos Debian 13 in Rufus, **preverjanje SHA512 in podpisa** pred uporabo.
2. Namestitev brez omrežja (Wi-Fi ni hotel — kasneje se je izkazalo, da zaradi posebnega znaka v geslu in slovenske tipkovnice med namestitvijo). Rešitev: kabel.
   *Zabaven del: prvi kabel je bil slab — povezava je skakala gor in dol. Dnevnik jedra je rekel »check cabling«. Zamenjava kabla, rešeno.*
3. Prenosnik dela z zaprtim pokrovom, zaslon se ugasne sam.
4. **Utrjevanje** (varnostni pregled z orodjem Lynis: ocena **62 → 75**):
   - SSH samo s ključem, samo z domačega omrežja in Tailscale,
   - lasten požarni zid (nftables) — pazljivo, ker Docker sicer obide pravila,
   - fail2ban, samodejne varnostne posodobitve, nadzor diska (SMART), sinhronizacija ure.
5. **Dostop od kjerkoli brez odprtih vrat na internet**: Tailscale (zasebni VPN). Strežnik ni viden z interneta.
6. **Obvestila na telefon** (ntfy v Dockerju): ob vsaki SSH prijavi, ob novi napravi v domačem omrežju, ob blokiranem poskusu vdora, ob napaki diska.
7. **Šifrirane varnostne kopije** (restic) vsako noč ob 02:30, računalnik jih vsak dan potegne k sebi. **Obnovo sem preizkusil** — kopija, ki je nisi obnovil, ni kopija.

---

## Faza 3 — Aplikacija na strežnik

Problem: podatki so bili v `localStorage` vsakega brskalnika posebej.

Rešitev, ki sem jo izbral, je namenoma preprosta:

- **en JSON na strežniku** + verzija; brez baze, ker je podatkov malo in en uporabnik,
- strežnik v Pythonu **brez zunanjih knjižnic** (manj stvari, ki se lahko pokvarijo ali zastarijo),
- **dnevni posnetek** podatkov, hranjenih 60 dni,
- aplikacija dela **brez povezave** in sinhronizira, ko strežnik spet vidi.

Najtežji del je bil **konflikt**: kaj, če telefon in računalnik shranita hkrati? Rešitev — vsaka sprememba je funkcija v čakalni vrsti. Če strežnik reče `409 Conflict`, aplikacija vzame njegove podatke in **ponovi svoje spremembe na vrhu**. Nič se ne izgubi in nič se ne prepiše.

Majhna past: `crypto.randomUUID()` v brskalniku deluje samo na HTTPS — doma pa je aplikacija na navadnem HTTP. Lasten generator ID-jev, rešeno.

---

## Faza 4 — Funkcije, ki znižajo prag

Vsaka nova funkcija je morala odgovoriti na vprašanje: **ali bom zaradi tega bolj verjetno naredil stvar?**

| Funkcija | Zakaj |
|---|---|
| **Dnevnik v eni vrstici** | 10 sekund. Ni izgovora. |
| **Cilji s poskusi** (»Do uspeha skozi neuspehe«) | Neuspel poskus = +1. Neuspeh ni več razlog za odnehati, je merilo napredka. |
| **Opomniki** ob 16:00 (zapadle naloge) in 21:30 (večerni pregled) | Zunanji »rok«, ki ga sicer nimam. |
| **Tedenski pregled**: ta teden proti prejšnjemu | Odgovor na vprašanje »ali sploh napredujem?« |
| **AI poročilo vsako nedeljo** | Claude na strežniku prebere teden in napiše oceno, kaj je bilo dobro, kaj izboljšati in **en** fokus. Teče na moji obstoječi naročnini, brez dostopa do orodij. |
| **Pripomoček za iPhone** | Napredek dneva vidim na domačem zaslonu, brez odpiranja aplikacije. |
| **Mobilna postavitev + PWA** | Aplikacija se namesti na telefon kot prava aplikacija. |
| **Slovenščina / angleščina** | Ker razmišljam v slovenščini. |

---

## Faza 5 — Stenska tablica (in kako je odpovedala)

Ideja: stara tablica na steni kot **planer**, ki ga vidim vsako jutro.

Kaj se je zgodilo:

1. **Tablica se je zaciklala pri zagonu.** Prek `adb` sem našel vzrok: pokvarjena sistemska datoteka s seznamom aplikacij (4 KB smeti sredi XML). Popravljeno ročno — tablica je spet zagnala.
2. **Bila je neuporabno počasna.** Meritve: pomnilnik je čakal 88 % časa. Odstranil sem 14 aplikacij, onemogočil 21 sistemskih, počistil predpomnilnik → čakanje ~1 %.
3. **Kiosk aplikacija za Android** (Java, zgrajena v Dockerju na strežniku, brez Android Studia): zažene se namesto domačega zaslona, ponoči ugasne zaslon, svetlost nastavljam iz Life OS.
4. **Po ponovnem zagonu je NAND pomnilnik odpovedal.** Sistemske datoteke so izginile. Dnevnik jedra: `too much ecc err` — strojna okvara.
5. **Rešitev v sili:** ker Android ni več deloval, sem na preostali del pomnilnika postavil **mini Linux (Alpine)** in napisal **planer v Pythonu, ki riše neposredno na zaslon** (framebuffer), bere dotik in tipke, sam vklopi Wi-Fi, kaže vreme, niz dni in gumb »Poskusil sem«. Deloval je — tudi zvok.
6. Ob naslednjem ponovnem zagonu je čip odpovedal še bolj: vsak zapis je imel ~25 % napačnih bajtov. **Odločitev: tablico zavržem**, planer uporabljam na telefonu.

**Kaj sem se naučil:** vedeti, kdaj nehati. Tablica je bila odlična vaja iz diagnoze, a cilj je bil planer, ne tablica. Koda planerja je ostala in je v mapi [`tablica/`](tablica).

---

## Faza 6 — Past AI-ja: ko gre prehitro (november 2026)

Ko je osnova delovala, sem hotel naslednji korak: **en koš za vse vhode**. Posnetek z iPhona, PDF ali slika pošljem na mail, sistem sam ugotovi, kaj je, in shrani na pravo mesto.

In tu sem padel v **past AI-ja**: vse sem prepustil asistentu. Ta je bil hiter — v eni seji je naredil preizkus štirih modelov za prepis govora, dva načrta arhitekture in ju združil, še preden sem sploh razumel, kaj se dogaja. Na koncu sem imel kup datotek in **nisem več vedel, kje smo**. Hitrost brez mojega razumevanja ni bila napredek, ampak izguba nadzora.

Zato sem se ustavil in **vrnil na začetek**:

- **Korak za korakom.** Najprej mi AI našteje korake, nato naredimo samo trenutnega. Nič naprej brez mojega »da«.
- **80 / 20.** 80 % dela je moje: razmislek, odločitve, kaj gre kam in zakaj. 20 % je AI: koda po mojih korakih, preizkusi, zapiski.
- **Papir in svinčnik.** Korake sem začel pisati na list in **risati grafe v zvezek**. Iz skice je nastal graf toka podatkov, ki je zdaj *edini vir resnice* za sistem — AI ga mora upoštevati, ne obratno.

Kaj je nastalo po tej poti (vsak korak potrjen posebej):

1. **Graf toka**: mail → strežnik (samo sprejme, hrani, prepošlje) → namizni računalnik (obdela in hrani) → kopija na drug disk.
2. **Shramba po vrstah** (zvok, dokumenti, slike, drugo). Nova kategorija = ena vrstica v nastavitvah, brez spremembe kode.
3. **Prevzem**: namizni vsakih 15 minut pobere nove datoteke, vsako preveri s prstnim odtisom (sha256) in je nikoli ne prepiše.
4. **Obvestila samo ob spremembi**, samo med 7. in 21. uro: »shranjeno«, »čaka, ker računalnik ni prižgan«, »mail brez priponke«.
5. **Mail z besedilom**: prva beseda v zadevi pove, kam gre (dnevnik, naloga, ideja, razgovor). Brez nje dobim obvestilo z gumbi in odločim jaz.
6. **Kopije**: kopija se na drugem disku samo dopolnjuje — pokvarjen original ne more uničiti dobre kopije.

Vse to so **navadni programi**, ne AI. AI programe napiše in popravlja, sam pa ne vodi dnevne rutine — ker bi se zaciklal in ker hočem sistem, ki ga razumem.

**Kaj sem se naučil:** AI je odličen pomočnik, a slab šef. Ko sem mu prepustil vse, sem izgubil pregled; ko sem prevzel 80 % razmisleka nazaj in korake narisal na papir, je šlo počasneje — in prvič je vse delovalo od začetka do konca.

---

## Rezultat

- Ena aplikacija na telefonu, računalniku in (nekoč) na steni, s skupnimi podatki.
- Strežnik doma, ki ga z interneta ni videti, z obvestili in nočnimi kopijami.
- Sistem, ki me vsak dan potisne vsaj za **eno vrstico** naprej in vsako nedeljo pokaže, ali sem boljši kot prej teden.

## Kaj bi naredil naslednje

- Koraki in spanje samodejno iz Apple Health (prek Bližnjic na iPhonu).
- Ikone za namestitev na iPhone.
- Testi za logiko sinhronizacije.
- Pregled agentov AI, ki delajo zame, na enem mestu.
