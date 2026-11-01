/* Life OS — stran za tablico. Namenoma ES5 (var, function, XMLHttpRequest),
   ker jo poganja brskalnik Androida 4.0. Podatki: isti JSON kot aplikacija. */
(function () {
  'use strict';

  var API = '/api/data';
  var OSVEZI_MS = 20000;
  var NAZAJ_NA_DANES_MS = 120000;

  var DNEVI = ['nedelja', 'ponedeljek', 'torek', 'sreda', 'četrtek', 'petek', 'sobota'];
  var MESECI = ['januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij',
    'avgust', 'september', 'oktober', 'november', 'december'];
  var PRIORITETA = { high: 0, medium: 1, low: 2 };
  var PRIORITETA_IME = { high: 'visoka', medium: 'srednja', low: 'nizka' };
  var KATEGORIJA = { health: 'zdravje', fitness: 'fitnes', business: 'posel',
    personal: 'osebno', learning: 'učenje', finance: 'finance' };

  var doc = { version: 0, data: null };
  var odprtCilj = null;
  var zavihek = 'danes';
  var zadnjiDotik = new Date().getTime();
  var posiljam = false;

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function dvo(n) { return n < 10 ? '0' + n : '' + n; }

  function danesISO() {
    var d = new Date();
    return d.getFullYear() + '-' + dvo(d.getMonth() + 1) + '-' + dvo(d.getDate());
  }

  function lokalniDan(iso) {
    // createdAt je v UTC (toISOString), dueDate pa je že "yyyy-mm-dd".
    if (!iso) return '';
    if (iso.length === 10) return iso;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso.substr(0, 10);
    return d.getFullYear() + '-' + dvo(d.getMonth() + 1) + '-' + dvo(d.getDate());
  }

  function lepDatum(iso) {
    var p = iso.split('-');
    return parseInt(p[2], 10) + '. ' + MESECI[parseInt(p[1], 10) - 1];
  }

  function novId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  function prazniPodatki() {
    return { todos: [], goals: [], workouts: [], sleep: [], health: [], brands: [],
      userName: 'David', userAvatar: '', theme: 'dark', notifications: true };
  }

  function podatki() {
    var d = doc.data || prazniPodatki();
    if (!d.todos) d.todos = [];
    if (!d.goals) d.goals = [];
    return d;
  }

  /* ---------- strežnik ---------- */

  function zahteva(metoda, telo, ok, napaka) {
    var x = new XMLHttpRequest();
    x.open(metoda, API + (metoda === 'GET' ? '?t=' + new Date().getTime() : ''), true);
    x.setRequestHeader('Content-Type', 'application/json');
    x.timeout = 15000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      var odgovor = null;
      try { odgovor = JSON.parse(x.responseText); } catch (e) {}
      if (x.status === 200) ok(odgovor);
      else napaka(x.status, odgovor);
    };
    x.send(telo ? JSON.stringify(telo) : null);
  }

  function stanje(besedilo, jeNapaka) {
    var s = $('stanje');
    s.innerHTML = esc(besedilo);
    s.className = jeNapaka ? 'napaka' : '';
  }

  function prenesi() {
    if (posiljam) return;
    zahteva('GET', null, function (odg) {
      if (posiljam) return;
      if (odg && odg.version !== doc.version) {
        doc = odg;
        izrisi();
      }
      stanje('posodobljeno ' + dvo(new Date().getHours()) + ':' + dvo(new Date().getMinutes()));
    }, function () {
      stanje('ni povezave s strežnikom', true);
    });
  }

  /* Sprememba: takoj na zaslon, nato na strežnik. Če je vmes kdo drug shranil
     (409), vzamemo njegovo verzijo in spremembo ponovimo. */
  function spremeni(fn) {
    var data = JSON.parse(JSON.stringify(podatki()));
    fn(data);
    doc.data = data;
    izrisi();
    poslji(fn, 0);
  }

  function poslji(fn, poskus) {
    posiljam = true;
    stanje('shranjujem …');
    zahteva('PUT', { version: doc.version, data: doc.data }, function (odg) {
      posiljam = false;
      doc.version = odg.version;
      stanje('shranjeno');
    }, function (status, odg) {
      if (status === 409 && odg && poskus < 3) {
        var data = odg.data || prazniPodatki();
        fn(data);
        doc = { version: odg.version, data: data };
        izrisi();
        poslji(fn, poskus + 1);
        return;
      }
      posiljam = false;
      stanje('ni shranjeno — preveri povezavo', true);
      setTimeout(prenesi, 3000);
    });
  }

  /* ---------- ura in glava ---------- */

  function pozdrav(h) {
    if (h >= 5 && h < 10) return 'Dobro jutro';
    if (h >= 10 && h < 18) return 'Dober dan';
    if (h >= 18 && h < 22) return 'Dober večer';
    return 'Lahko noč';
  }

  function ura() {
    var d = new Date();
    $('ura').innerHTML = dvo(d.getHours()) + ':' + dvo(d.getMinutes());
    $('datum').innerHTML = DNEVI[d.getDay()] + ', <span>' + d.getDate() + '. ' +
      MESECI[d.getMonth()] + '</span> ' + d.getFullYear();
    $('pozdrav').innerHTML = esc(pozdrav(d.getHours()) + ', ' + podatki().userName);
  }

  /* ---------- Danes ---------- */

  function zaDanes(t, danes) {
    if (t.dueDate) return t.dueDate <= danes && (!t.completed || t.dueDate === danes);
    return !t.completed || lokalniDan(t.createdAt) === danes;
  }

  function razvrsti(a, b) {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    var pa = PRIORITETA[a.priority], pb = PRIORITETA[b.priority];
    if (pa !== pb) return (pa == null ? 1 : pa) - (pb == null ? 1 : pb);
    return (a.createdAt || '') < (b.createdAt || '') ? -1 : 1;
  }

  function opraviloHTML(t, danes) {
    var opis = [];
    if (t.category) opis.push(esc(t.category));
    if (t.priority) opis.push('prioriteta ' + PRIORITETA_IME[t.priority]);
    if (t.dueDate && t.dueDate < danes) opis.push('rok ' + lepDatum(t.dueDate));
    return '<a href="#" class="kartica opravilo' + (t.completed ? ' opravljeno' : '') +
      '" data-todo="' + esc(t.id) + '">' +
      '<span class="kljukica-celica"><span class="kljukica">' + (t.completed ? '&#10003;' : '') + '</span></span>' +
      '<span class="besedilo-celica"><div class="besedilo">' + esc(t.text) + '</div>' +
      '<div class="podrobnosti">' + opis.join(' · ') + '</div></span>' +
      '<span class="tocka-celica"><span class="tocka p-' + esc(t.priority) + '"></span></span></a>';
  }

  function izrisiDanes() {
    var danes = danesISO();
    var vsa = podatki().todos;
    var zamujena = [], zdaj = [];
    for (var i = 0; i < vsa.length; i++) {
      var t = vsa[i];
      if (!zaDanes(t, danes)) continue;
      if (!t.completed && t.dueDate && t.dueDate < danes) zamujena.push(t);
      else zdaj.push(t);
    }
    zamujena.sort(razvrsti);
    zdaj.sort(razvrsti);

    var html = '';
    if (zamujena.length) {
      html += '<div class="naslov rdec">ZAMUJENO</div>';
      for (i = 0; i < zamujena.length; i++) html += opraviloHTML(zamujena[i], danes);
      html += '<div class="naslov">DANES</div>';
    }
    for (i = 0; i < zdaj.length; i++) html += opraviloHTML(zdaj[i], danes);
    if (!zamujena.length && !zdaj.length) html = '<div class="prazno">Za danes ni opravil. Dodaj prvo zgoraj.</div>';
    $('seznam-danes').innerHTML = html;

    var vse = zamujena.length + zdaj.length, narejeno = 0;
    for (i = 0; i < zdaj.length; i++) if (zdaj[i].completed) narejeno++;
    var pct = vse ? Math.round(narejeno / vse * 100) : 0;
    $('odstotek').innerHTML = pct + '%';
    $('odstotek').className = pct === 100 ? 'vse' : '';
    $('vrstica-polna').style.width = pct + '%';
    $('vrstica-polna').className = pct === 100 ? 'vse' : '';
    $('povzetek').innerHTML = narejeno + ' od ' + vse + ' opravljenih';
  }

  /* ---------- Cilji ---------- */

  function izrisiCilje() {
    var cilji = podatki().goals, html = '', i, j;
    var aktivni = [];
    for (i = 0; i < cilji.length; i++) if (!cilji[i].completed) aktivni.push(cilji[i]);
    for (i = 0; i < cilji.length; i++) if (cilji[i].completed) aktivni.push(cilji[i]);

    for (i = 0; i < aktivni.length; i++) {
      var g = aktivni[i], m = g.milestones || [], narejeni = 0;
      for (j = 0; j < m.length; j++) if (m[j].completed) narejeni++;
      var pct = m.length ? Math.round(narejeni / m.length * 100) : (g.progress || 0);
      var barva = g.color || '#f59e0b';
      var opis = [];
      if (g.category) opis.push(KATEGORIJA[g.category] || esc(g.category));
      if (g.targetDate) opis.push('do ' + lepDatum(g.targetDate.substr(0, 10)));
      if (g.completed) opis.push('dosežen');

      var cilj = g.failTarget || 0, spodleteli = g.failCount || 0;
      var pctS = cilj ? Math.min(100, Math.round(spodleteli / cilj * 100)) : 0;

      html += '<div class="kartica cilj">' +
        '<a href="#" class="cilj-glava" data-cilj="' + esc(g.id) + '">' +
        '<div><div class="cilj-naslov">' + esc(g.title) + '</div>' +
        '<div class="cilj-opis">' + opis.join(' · ') + '</div></div>' +
        '<div class="cilj-desno">' + pct + '%<small>' +
        (m.length ? narejeni + '/' + m.length + ' podciljev' : 'brez podciljev') + '</small></div></a>' +
        '<div class="vrstica"><div style="width:' + pct + '%;background:' + esc(barva) + '"></div></div>';

      // Števec spodletljajev (v aplikaciji "Goals & Fails"): vsak spodletljaj = en poskus več
      if (cilj) {
        html += '<div class="spodletljaji"><div class="sp-levo">' +
          '<div class="sp-stevilo">' + spodleteli + '<span> / ' + cilj + '</span></div>' +
          '<div class="sp-opis">' + (spodleteli >= cilj ? 'cilj dosežen!' :
            'spodletljajev · še <b>' + (cilj - spodleteli) + '</b> do cilja') + '</div>' +
          '<div class="vrstica rdeca"><div style="width:' + pctS + '%"></div></div></div>' +
          (g.completed ? '' : '<div class="sp-desno"><a href="#" class="gumb-spodletelo" data-spodletelo="' +
            esc(g.id) + '">Spodletelo mi je<br><b>+1</b></a></div>') + '</div>';
      }

      if (odprtCilj === g.id) {
        html += '<div class="mejniki">';
        for (j = 0; j < m.length; j++) {
          html += '<a href="#" class="mejnik' + (m[j].completed ? ' opravljeno' : '') +
            '" data-mejnik="' + esc(m[j].id) + '" data-cilj-id="' + esc(g.id) + '">' +
            '<span class="kljukica-celica"><span class="kljukica">' + (m[j].completed ? '&#10003;' : '') + '</span></span>' +
            '<span class="besedilo-celica"><span class="besedilo">' + esc(m[j].text) + '</span></span></a>';
        }
        if (g.description) html += '<div class="namig">' + esc(g.description) + '</div>';
        html += '<form class="dodaj" action="#" data-dodaj-mejnik="' + esc(g.id) + '">' +
          '<input type="text" placeholder="Nov podcilj …" autocomplete="off">' +
          '<span class="gumb-celica"><button type="submit">Dodaj</button></span></form></div>';
      }
      html += '</div>';
    }
    if (!aktivni.length) html = '<div class="prazno">Ni ciljev. Dodaš jih v aplikaciji (Goals).</div>';
    $('seznam-cilji').innerHTML = html;
  }

  /* ---------- pregled dneva: vadba, spanje, cilji ---------- */

  function izrisiPregled() {
    var d = podatki(), danes = danesISO(), i;
    var vadbe = d.workouts || [], spanje = d.sleep || [], cilji = d.goals;

    var danesVadba = null, teden = 0, meja = new Date().getTime() - 7 * 86400000;
    for (i = 0; i < vadbe.length; i++) {
      if (vadbe[i].date === danes) danesVadba = vadbe[i];
      var t = new Date(vadbe[i].date + 'T12:00:00').getTime();
      if (!isNaN(t) && t >= meja) teden++;
    }
    var zadnjeSpanje = null;
    for (i = 0; i < spanje.length; i++)
      if (!zadnjeSpanje || spanje[i].date > zadnjeSpanje.date) zadnjeSpanje = spanje[i];
    var aktivni = 0, ostane = 0;
    for (i = 0; i < cilji.length; i++) {
      if (cilji[i].completed) continue;
      aktivni++;
      ostane += Math.max(0, (cilji[i].failTarget || 0) - (cilji[i].failCount || 0));
    }

    function ploscica(oznaka, vrednost, pod, ok) {
      return '<div class="ploscica"><div class="pl-oznaka">' + oznaka + '</div>' +
        '<div class="pl-vrednost' + (ok ? ' zelena' : '') + '">' + vrednost + '</div>' +
        '<div class="pl-pod">' + pod + '</div></div>';
    }

    $('pregled').innerHTML =
      ploscica('VADBA DANES', danesVadba ? '&#10003; ' + esc(danesVadba.type || 'opravljena') : '—',
        danesVadba ? (danesVadba.duration || 0) + ' min' : teden + '× ta teden', !!danesVadba) +
      ploscica('SPANJE', zadnjeSpanje ? esc(zadnjeSpanje.hours) + ' h' : '—',
        zadnjeSpanje ? (zadnjeSpanje.date === danes ? 'to noč' : lepDatum(zadnjeSpanje.date)) +
          (zadnjeSpanje.quality ? ' · kakovost ' + esc(zadnjeSpanje.quality) + '/5' : '') : 'ni vpisa', false) +
      ploscica('CILJI', aktivni, aktivni ? 'še ' + ostane + ' spodletljajev skupaj' : 'ni aktivnih', false);
  }

  function izrisi() {
    ura();
    izrisiPregled();
    izrisiDanes();
    izrisiCilje();
  }

  /* ---------- dogodki ---------- */

  function najdi(el, atribut) {
    while (el && el !== document) {
      if (el.getAttribute && el.getAttribute(atribut) != null) return el;
      el = el.parentNode;
    }
    return null;
  }

  function preklopi(kam) {
    zavihek = kam;
    $('stran-danes').className = 'stran' + (kam === 'danes' ? '' : ' skrita');
    $('stran-cilji').className = 'stran' + (kam === 'cilji' ? '' : ' skrita');
    $('z-danes').className = 'zavihek' + (kam === 'danes' ? ' izbran' : '');
    $('z-cilji').className = 'zavihek' + (kam === 'cilji' ? ' izbran' : '');
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', function (e) {
    zadnjiDotik = new Date().getTime();
    var el;
    if ((el = najdi(e.target, 'data-todo'))) {
      e.preventDefault();
      var id = el.getAttribute('data-todo');
      spremeni(function (d) {
        for (var i = 0; i < d.todos.length; i++)
          if (d.todos[i].id === id) d.todos[i].completed = !d.todos[i].completed;
      });
    } else if ((el = najdi(e.target, 'data-mejnik'))) {
      e.preventDefault();
      var mid = el.getAttribute('data-mejnik'), gid = el.getAttribute('data-cilj-id');
      spremeni(function (d) {
        for (var i = 0; i < d.goals.length; i++) {
          if (d.goals[i].id !== gid) continue;
          var m = d.goals[i].milestones || [];
          for (var j = 0; j < m.length; j++) if (m[j].id === mid) m[j].completed = !m[j].completed;
        }
      });
    } else if ((el = najdi(e.target, 'data-spodletelo'))) {
      e.preventDefault();
      var sid = el.getAttribute('data-spodletelo');
      spremeni(function (d) {  // enako kot incrementFail v aplikaciji
        for (var i = 0; i < d.goals.length; i++) {
          var g = d.goals[i];
          if (g.id !== sid) continue;
          g.failCount = (g.failCount || 0) + 1;
          g.completed = g.failCount >= g.failTarget;
          g.progress = Math.min(100, Math.round(g.failCount / g.failTarget * 100));
        }
      });
    } else if ((el = najdi(e.target, 'data-cilj'))) {
      e.preventDefault();
      var c = el.getAttribute('data-cilj');
      odprtCilj = odprtCilj === c ? null : c;
      izrisiCilje();
    } else if (e.target.id === 'z-danes' || e.target.id === 'z-cilji') {
      e.preventDefault();
      preklopi(e.target.id === 'z-danes' ? 'danes' : 'cilji');
    }
  }, false);

  document.addEventListener('submit', function (e) {
    e.preventDefault();
    zadnjiDotik = new Date().getTime();
    var form = e.target, vnos = form.getElementsByTagName('input')[0];
    var besedilo = (vnos.value || '').replace(/^\s+|\s+$/g, '');
    if (!besedilo) return;
    vnos.value = '';
    vnos.blur();
    var gid = form.getAttribute('data-dodaj-mejnik');
    if (gid) {
      spremeni(function (d) {
        for (var i = 0; i < d.goals.length; i++) {
          if (d.goals[i].id !== gid) continue;
          if (!d.goals[i].milestones) d.goals[i].milestones = [];
          d.goals[i].milestones.push({ id: novId(), text: besedilo, completed: false });
        }
      });
    } else {
      var novo = { id: novId(), text: besedilo, completed: false, priority: 'medium',
        category: 'Personal', createdAt: new Date().toISOString(), dueDate: danesISO() };
      spremeni(function (d) { d.todos.push(novo); });
    }
  }, false);

  setInterval(function () {
    ura();
    // po polnoči se seznam "danes" zamenja; po 2 min nedotikanja nazaj na Danes
    if (zavihek !== 'danes' && new Date().getTime() - zadnjiDotik > NAZAJ_NA_DANES_MS) {
      odprtCilj = null;
      preklopi('danes');
      izrisiCilje();
    }
  }, 10000);
  setInterval(prenesi, OSVEZI_MS);
  setInterval(izrisiDanes, 60000);

  izrisi();
  prenesi();
})();
