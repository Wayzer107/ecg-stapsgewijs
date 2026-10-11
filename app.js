import { html, render, Component } from './vendor/htm-preact.mjs';


class App extends Component {
  constructor(...args) {
    super(...args);
    this.state = this.initState();
    this.dragging = false;
    this.panelEl = null;
    this.panelRef = (el) => { this.panelEl = el; };
  }

  initState() {
    return {
      step: 0, maxStep: 0, speed: 25, gain: 10, sex: 'M',
      reg: null, pw: null, conduct: null, pup: null, rhythm: null,
      rateM: 'direct', hr: '', large: '', small: '', count: '',
      axM: 'quad', qI: null, qF: null, qII: null, iso: null, isoPick: null, ampI: '', ampF: '', man: '', cab: false,
      pDur: '', pAmp: '', pr: '', av: null, delta: false,
      qrs: '', morph: null, fasc: null, rprog: null, q: {}, sv1: '', rv5: '', ravl: '', sv3: '',
      st: {}, stMax: '', tw: {}, uw: false,
      qt: '', qtF: 'baz', notes: '', copied: false
    };
  }

  num(v) {
    if (v === '' || v == null) return NaN;
    return parseFloat(String(v).replace(',', '.').replace('−', '-'));
  }

  bump(key, d, o) {
    const cur = this.num(this.state[key]);
    let nv = isNaN(cur) ? (o.start != null ? o.start : 0) : cur + d;
    if (o.min != null) nv = Math.max(o.min, nv);
    if (o.max != null) nv = Math.min(o.max, nv);
    nv = Math.round(nv * 100) / 100;
    this.setState({ [key]: String(nv).replace('.', ','), copied: false });
  }

  go(i) {
    const i2 = Math.max(0, Math.min(9, i));
    this.setState({ step: i2, maxStep: Math.max(this.state.maxStep, i2), copied: false });
    setTimeout(() => {
      const el = this.panelEl;
      if (el && el.getBoundingClientRect && el.getBoundingClientRect().top < 0 && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 30);
  }

  normA(a) {
    let x = ((a + 180) % 360 + 360) % 360 - 180;
    return x === -180 ? 180 : x;
  }

  wheelSet(e) {
    const t = e.currentTarget;
    if (!t || !t.getBoundingClientRect) return;
    const r = t.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 350 - 175;
    const y = (e.clientY - r.top) / r.height * 350 - 175;
    if (Math.hypot(x, y) < 14) return;
    let a = Math.round(Math.atan2(y, x) * 180 / Math.PI / 5) * 5;
    a = this.normA(a);
    this.setState({ axM: 'man', man: String(a), copied: false });
  }

  copyText(text) {
    const done = () => this.setState({ copied: true });
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => {});
      }
    } catch (err) {}
  }

  vals() {
    const s = this.state;
    const N = (k) => this.num(s[k]);
    const r1 = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
    const fmtA = (a) => (a > 0 ? '+' : a < 0 ? '−' : '') + Math.abs(a) + '°';
    const gc = 10 / s.gain;

    const STEPS = [
      ['Instellingen', 'Controleer papiersnelheid, ijking en geslacht voordat je gaat meten.'],
      ['Ritme', 'Regelmaat, atriale activiteit en de relatie tussen P-toppen en QRS-complexen.'],
      ['Frequentie', 'Kies de methode die bij de strook past; de uitkomst verandert mee met je invoer.'],
      ['As', 'Bepaal de elektrische hartas in het frontale vlak. Wissel van methode wanneer je wilt; het wiel volgt mee.'],
      ['P-top & PQ', 'Atriale depolarisatie en AV-geleiding, gemeten in afleiding II.'],
      ['QRS-complex', 'Duur, morfologie, Q-golven en spanning.'],
      ['ST-segment', 'Tik op een afleiding om te wisselen: normaal → elevatie → depressie.'],
      ['T-top', 'Tik op een afleiding om te wisselen: normaal → negatief → afgevlakt → spits.'],
      ['QT-tijd', 'Meet de langste QT-tijd, bij voorkeur in afleiding II of V5, en corrigeer voor de frequentie.'],
      ['Conclusie', 'Controleer de bevindingen, bekijk de differentiaaldiagnose en kopieer het verslag.']
    ];

    const FIXED = ['speed', 'gain', 'sex', 'rateM', 'axM', 'qtF'];
    const chips = (key, opts, cls) => opts.map(([v, label]) => {
      const on = s[key] === v;
      const base = cls || 'chip';
      return {
        label, cls: on ? base + ' on' : base, pressed: on ? 'true' : 'false',
        pick: () => this.setState({ [key]: (on && FIXED.indexOf(key) < 0) ? null : v, copied: false })
      };
    });
    const tog = (key, label) => [{ label, cls: s[key] ? 'chip on' : 'chip', pressed: s[key] ? 'true' : 'false', pick: () => this.setState({ [key]: !s[key], copied: false }) }];

    const next = () => this.go(s.step + 1);
    const fld = (key, label, unit, step, o) => {
      o = o || {};
      const v = N(key);
      const ev = (o.ev && !isNaN(v)) ? o.ev(v) : null;
      return {
        id: 'f-' + key, label, unit, value: s[key], ph: o.ph || '', mode: o.signed ? 'text' : 'decimal',
        onInput: (e) => this.setState({ [key]: e.target.value, copied: false }),
        onKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } },
        dec: () => this.bump(key, -step, o), inc: () => this.bump(key, step, o),
        ev: ev ? ev[1] : (o.hint || ''), evCls: ev ? 'ev ' + ev[0] : 'ev'
      };
    };

    /* ---------- frequentie ---------- */
    const secLarge = s.speed === 25 ? 0.2 : 0.1;
    const secSmall = secLarge / 5;
    let hr = NaN;
    if (s.rateM === 'direct') hr = N('hr');
    if (s.rateM === 'large') { const n = N('large'); if (n > 0) hr = 60 / (n * secLarge); }
    if (s.rateM === 'small') { const n = N('small'); if (n > 0) hr = 60 / (n * secSmall); }
    if (s.rateM === 'count') { const n = N('count'); if (!isNaN(n)) hr = n * 6; }
    hr = (isNaN(hr) || !isFinite(hr)) ? NaN : Math.round(hr);
    const hrOk = hr > 0;
    const rateAbn = hrOk && (hr < 60 || hr > 100);
    const rateText = !hrOk ? 'Voer een waarde in' : hr < 60 ? 'Bradycardie (< 60/min)' : hr > 100 ? 'Tachycardie (> 100/min)' : 'Normale frequentie (60–100/min)';
    const largeDiv = s.speed === 25 ? 300 : 600, smallDiv = s.speed === 25 ? 1500 : 3000;
    let rateFields = [];
    if (s.rateM === 'direct') rateFields = [fld('hr', 'Hartfrequentie', '/min', 1, { start: 70, min: 0, max: 350, ph: '—' })];
    if (s.rateM === 'large') rateFields = [fld('large', 'Grote hokjes tussen twee R-toppen', 'hokjes', 0.5, { start: 4, min: 0.5, ph: '—', hint: 'Frequentie = ' + largeDiv + ' ÷ grote hokjes' })];
    if (s.rateM === 'small') rateFields = [fld('small', 'Kleine hokjes tussen twee R-toppen', 'hokjes', 1, { start: 20, min: 1, ph: '—', hint: 'Frequentie = ' + smallDiv + ' ÷ kleine hokjes' })];
    if (s.rateM === 'count') rateFields = [fld('count', 'QRS-complexen op de strook van 10 s', 'slagen', 1, { start: 7, min: 0, ph: '—', hint: 'Frequentie = aantal × 6' })];

    /* ---------- ritme ---------- */
    const qrsV = N('qrs');
    let sugg = null;
    if (s.pw === 'fib' || (s.reg === 'irrirr' && s.pw === 'no')) sugg = 'af';
    else if (s.pw === 'flutter') sugg = 'flutter';
    else if (s.pw === 'yes' && s.pup === 'no') sugg = 'ectopic';
    else if (s.pw === 'yes' && s.pup === 'yes') sugg = s.reg === 'reg' || !s.reg ? 'sinus' : 'sinusarr';
    else if (s.pw === 'no' && s.reg === 'reg') sugg = qrsV >= 120 ? 'ventr' : 'junct';
    const RH = { sinus: 'Sinusritme', sinusarr: 'Sinusaritmie', af: 'Atriumfibrilleren', flutter: 'Atriumflutter', ectopic: 'Ectopisch atriaal ritme', junct: 'Junctioneel ritme', ventr: 'Ventriculair ritme', paced: 'Pacemakerritme', other: 'Ander ritme' };
    const rh = s.rhythm || null;
    let rhythmText = rh ? RH[rh] : '';
    if (rh === 'sinus' && hrOk) { if (hr < 60) rhythmText = 'Sinusbradycardie'; else if (hr > 100) rhythmText = 'Sinustachycardie'; }
    if ((rh === 'af' || rh === 'flutter') && hrOk) rhythmText += ', ventrikelfrequentie ' + hr + '/min';
    const rhythmAbn = !!rh && (['sinus', 'sinusarr'].indexOf(rh) < 0 || (rh === 'sinus' && rateAbn));

    /* ---------- as ---------- */
    const norm = (a) => this.normA(a);
    const C_N = 'Normale as', C_L = 'Linkerasdeviatie', C_R = 'Rechterasdeviatie', C_E = 'Extreme asdeviatie';
    const cat = (a) => (a >= -30 && a <= 90) ? C_N : (a < -30 && a >= -90) ? C_L : (a > 90) ? C_R : C_E;
    const LEADANG = { I: 0, II: 60, III: 120, aVF: 90, aVL: -30, aVR: -150 };
    const POLE = { '0': 'I', '30': '−aVR', '60': 'II', '90': 'aVF', '120': 'III', '150': '−aVL', '180': '−I', '-150': 'aVR', '-120': '−II', '-90': '−aVF', '-60': '−III', '-30': 'aVL' };
    let axExact = null, axRange = null, axNote = '', cands = [];
    if (s.axM === 'quad') {
      const I = s.qI, F = s.qF, II = s.qII;
      if (I && F) {
        if (I === 'iso' && F === 'iso') axNote = 'Beide iso-elektrisch: onbepaalbare as.';
        else if (I === 'iso') axExact = F === 'pos' ? 90 : -90;
        else if (F === 'iso') axExact = I === 'pos' ? 0 : 180;
        else if (I === 'pos' && F === 'pos') axRange = [0, 90];
        else if (I === 'pos' && F === 'neg') {
          if (II === 'pos') axRange = [-30, 0];
          else if (II === 'neg') axRange = [-90, -30];
          else if (II === 'iso') axExact = -30;
          else { axRange = [-90, 0]; axNote = 'Beoordeel afleiding II: positief = normaal (0° tot −30°), negatief = linkerasdeviatie.'; }
        }
        else if (I === 'neg' && F === 'pos') axRange = [90, 180];
        else axRange = [-180, -90];
      } else axNote = 'Kies de polariteit van het QRS in afleiding I en aVF.';
    } else if (s.axM === 'iso') {
      if (s.iso) {
        const a = LEADANG[s.iso];
        cands = [norm(a + 90), norm(a - 90)];
        if (s.isoPick != null && cands.indexOf(s.isoPick) >= 0) axExact = s.isoPick;
        else axNote = 'Twee kandidaten op het wiel — kies de richting.';
      } else axNote = 'Kies de extremiteitsafleiding met de kleinste netto uitslag.';
    } else if (s.axM === 'amp') {
      const a = N('ampI'), f = N('ampF');
      if (!isNaN(a) && !isNaN(f) && (a !== 0 || f !== 0)) axExact = Math.round(Math.atan2(f, a) * 180 / Math.PI);
      else axNote = 'Netto amplitude = R min (Q + S), in mm. Negatieve waarden zijn toegestaan.';
    } else {
      const m = N('man');
      if (!isNaN(m)) axExact = norm(Math.round(m));
      else axNote = 'Typ een waarde of tik / sleep op het wiel.';
    }
    let axBig = '—', axCat = 'Niet bepaald', axShort = '', axisAbn = false;
    if (axExact != null) { axBig = fmtA(axExact); axCat = cat(axExact); axShort = fmtA(axExact); axisAbn = axCat !== C_N; }
    else if (axRange) {
      axBig = fmtA(axRange[0]) + ' tot ' + fmtA(axRange[1]);
      const c1 = cat(axRange[0] + 1), c2 = cat(axRange[1] - 1);
      axCat = c1 === c2 ? c1 : 'Normale as of linkerasdeviatie';
      axShort = axBig;
      axisAbn = c1 === c2 && c1 !== C_N;
    }
    const axDetermined = axExact != null || !!axRange;
    const axCls = !axDetermined ? 'result' : (axisAbn ? 'result abn' : 'result ok');
    const P = (a, r) => { const t = a * Math.PI / 180; return [Math.round(r * Math.cos(t) * 10) / 10, Math.round(r * Math.sin(t) * 10) / 10]; };
    const activeZones = [];
    if (axExact != null) activeZones.push(cat(axExact));
    if (axRange) { activeZones.push(cat(axRange[0] + 1)); activeZones.push(cat(axRange[1] - 1)); }
    const zo = (name) => activeZones.indexOf(name) >= 0 ? 0.3 : 0.1;
    let rangePath = 'M0 0', rangeOp = 0;
    if (axRange) { const a = P(axRange[0], 120), b = P(axRange[1], 120); rangePath = 'M0 0 L' + a[0] + ' ' + a[1] + ' A120 120 0 0 1 ' + b[0] + ' ' + b[1] + ' Z'; rangeOp = 1; }
    let arX = 0, arY = 0, arHead = '0,0 0,0 0,0', arOp = 0;
    if (axExact != null) {
      const e = P(axExact, 100), tip = P(axExact, 126), base = P(axExact, 102), p1 = P(axExact + 90, 8), p2 = P(axExact - 90, 8);
      arX = e[0]; arY = e[1];
      arHead = tip[0] + ',' + tip[1] + ' ' + (base[0] + p1[0]) + ',' + (base[1] + p1[1]) + ' ' + (base[0] + p2[0]) + ',' + (base[1] + p2[1]);
      arOp = 1;
    }
    const showCands = s.axM === 'iso' && cands.length === 2 && axExact == null;
    const c1p = cands.length ? P(cands[0], 120) : [0, 0], c2p = cands.length ? P(cands[1], 120) : [0, 0];

    const isoChips = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'].map((l) => {
      const on = s.iso === l;
      return { label: l, cls: on ? 'chip on' : 'chip', pressed: on ? 'true' : 'false', pick: () => this.setState({ iso: on ? null : l, isoPick: null, copied: false }) };
    });
    const candChips = cands.map((c) => {
      const on = s.isoPick === c;
      return { label: fmtA(c) + '  (richting ' + POLE[String(c)] + ')', cls: on ? 'chip on' : 'chip', pressed: on ? 'true' : 'false', pick: () => this.setState({ isoPick: on ? null : c, copied: false }) };
    });
    const polOpts = [['pos', 'Positief'], ['neg', 'Negatief'], ['iso', 'Iso-elektrisch']];

    /* ---------- P / PQ ---------- */
    const pDur = N('pDur'), pAmpC = N('pAmp') * gc, pr = N('pr');
    const pEvDur = (v) => v >= 120 ? ['abn', 'Verlengd: linkeratriumvergroting (P mitrale)'] : ['ok', 'Normaal (< 120 ms)'];
    const pEvAmp = (v) => { const c = v * gc; const extra = s.gain !== 10 ? ' — ' + r1(c) + ' mm bij 10 mm/mV' : ''; return c > 2.5 ? ['abn', 'Hoog: rechteratriumvergroting (P pulmonale)' + extra] : ['ok', 'Normaal (≤ 2,5 mm)' + extra]; };
    const prEv = (v) => v < 120 ? ['abn', 'Kort: pre-excitatie of laag-atriale/junctionele oorsprong'] : v > 200 ? ['abn', 'Verlengd: eerstegraads AV-blok'] : ['ok', 'Normaal (120–200 ms)'];
    const pFields = [
      fld('pDur', 'Duur P-top', 'ms', 10, { start: 100, min: 0, ph: '—', ev: pEvDur }),
      fld('pAmp', 'Amplitude P-top in II', 'mm', 0.5, { start: 1.5, min: 0, ph: '—', ev: pEvAmp }),
      fld('pr', 'PQ-tijd', 'ms', 10, { start: 160, min: 0, ph: '—', ev: prEv })
    ];
    const AVN = { norm: 'Normale AV-geleiding', av1: 'Eerstegraads AV-blok', mob1: 'Tweedegraads AV-blok, Mobitz I (Wenckebach)', mob2: 'Tweedegraads AV-blok, Mobitz II', two1: '2:1 AV-blok', av3: 'Derdegraads (totaal) AV-blok' };
    const pParts = [], pFlags = [];
    if (!isNaN(pDur)) { pParts.push(pDur + ' ms'); if (pDur >= 120) pFlags.push('P mitrale'); }
    if (!isNaN(pAmpC)) { pParts.push(r1(pAmpC) + ' mm'); if (pAmpC > 2.5) pFlags.push('P pulmonale'); }
    const pText = pParts.length ? pParts.join(', ') + (pFlags.length ? ' — ' + pFlags.join(', ') : '') : '';
    const prParts = [];
    let prAbn = false;
    if (!isNaN(pr)) { prParts.push('PQ ' + pr + ' ms'); if (pr < 120 || pr > 200) prAbn = true; }
    if (s.av) { if (s.av !== 'norm') { prParts.push(AVN[s.av]); prAbn = true; } }
    else if (!isNaN(pr) && pr > 200) prParts.push('eerstegraads AV-blok');
    if (s.delta) { prParts.push('deltagolf'); prAbn = true; }
    const prText = prParts.join(', ');

    /* ---------- QRS ---------- */
    const qrsEv = (v) => v >= 120 ? ['abn', 'Verbreed (≥ 120 ms): bundeltakblok, ventriculaire oorsprong, pre-excitatie of pacing'] : v >= 110 ? ['abn', 'Licht verlengd (110–119 ms): incompleet blok / IVCD'] : ['ok', 'Normaal (< 110 ms)'];
    const qrsFields = [fld('qrs', 'QRS-duur', 'ms', 10, { start: 90, min: 0, ph: '—', ev: qrsEv })];
    const MORPH = { norm: 'Normaal', rbbb: 'RBTB', lbbb: 'LBTB', irbbb: 'Incompleet RBTB', ivcd: 'Aspecifieke IVCD', paced: 'Ventriculair gepaced' };
    const FASC = { none: '', lafb: 'LAHB', lpfb: 'LPHB' };
    const RPROG = { norm: 'Normaal', poor: 'Slechte R-topprogressie', early: 'Vroege transitie' };
    let fascHint = '';
    const axVal = axExact != null ? axExact : (axRange ? (axRange[0] + axRange[1]) / 2 : null);
    if (axVal != null && axVal <= -45 && !(qrsV >= 120)) fascHint = 'As ≤ −45° met smal QRS past bij een linker anterior hemiblok (LAHB).';
    else if (axVal != null && axVal > 90) fascHint = 'Rechterasdeviatie: denk pas aan LPHB na uitsluiten van rechterventrikelhypertrofie en lateraal infarct.';

    const LEADS = ['I', 'aVR', 'V1', 'V4', 'II', 'aVL', 'V2', 'V5', 'III', 'aVF', 'V3', 'V6'];
    const ORDER = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    const grid = (mk, cycle, tags, words) => LEADS.map((l) => {
      const v = (s[mk] || {})[l] || 'n';
      return {
        lead: l, tag: tags[v], cls: 'lead ' + v, aria: l + ': ' + words[v],
        tap: () => {
          const nx = cycle[(cycle.indexOf(v) + 1) % cycle.length];
          const m = Object.assign({}, this.state[mk]);
          if (nx === 'n') delete m[l]; else m[l] = nx;
          this.setState({ [mk]: m, copied: false });
        }
      };
    });
    const leadsWith = (m, val) => ORDER.filter((l) => (m || {})[l] === val);
    const qLeads = leadsWith(s.q, 'q');

    const sv1 = N('sv1') * gc, rv5 = N('rv5') * gc, ravl = N('ravl') * gc, sv3 = N('sv3') * gc;
    const sok = sv1 + rv5, corn = ravl + sv3, cornThr = s.sex === 'F' ? 20 : 28;
    const sokOk = !isNaN(sok), cornOk = !isNaN(corn);
    const lvhCards = [
      { name: 'Sokolow–Lyon', val: sokOk ? r1(sok) + ' mm' : '—', crit: 'S V1 + R V5/V6 ≥ 35 mm', cls: 'crit' + (sokOk ? (sok >= 35 ? ' abn' : ' ok') : '') },
      { name: 'Cornell', val: cornOk ? r1(corn) + ' mm' : '—', crit: 'R aVL + S V3 > ' + cornThr + ' mm (' + (s.sex === 'F' ? 'vrouwen' : 'mannen') + ')', cls: 'crit' + (cornOk ? (corn > cornThr ? ' abn' : ' ok') : '') }
    ];
    const lvh = (sokOk && sok >= 35) || (cornOk && corn > cornThr);
    const lvhFields = [
      fld('sv1', 'S in V1', 'mm', 1, { start: 10, min: 0, ph: '—' }),
      fld('rv5', 'R in V5 of V6 (grootste)', 'mm', 1, { start: 15, min: 0, ph: '—' }),
      fld('ravl', 'R in aVL', 'mm', 1, { start: 6, min: 0, ph: '—' }),
      fld('sv3', 'S in V3', 'mm', 1, { start: 10, min: 0, ph: '—' })
    ];
    const qrsParts = [];
    let qrsAbn = false;
    if (!isNaN(qrsV)) { qrsParts.push(qrsV + ' ms'); if (qrsV >= 110) qrsAbn = true; }
    if (s.morph && s.morph !== 'norm') { qrsParts.push(MORPH[s.morph]); qrsAbn = true; }
    if (s.fasc && s.fasc !== 'none') { qrsParts.push(FASC[s.fasc]); qrsAbn = true; }
    if (s.rprog && s.rprog !== 'norm') { qrsParts.push(RPROG[s.rprog].toLowerCase()); qrsAbn = true; }
    if (qLeads.length) { qrsParts.push('pathologische Q in ' + qLeads.join(', ')); qrsAbn = true; }
    if (lvh) { qrsParts.push('LVH-spanningscriteria positief'); qrsAbn = true; }
    const qrsText = qrsParts.join(', ');

    /* ---------- ST ---------- */
    const stUp = leadsWith(s.st, 'up'), stDown = leadsWith(s.st, 'down');
    const TERR = [['Inferior', ['II', 'III', 'aVF']], ['Lateraal', ['I', 'aVL', 'V5', 'V6']], ['Septaal', ['V1', 'V2']], ['Anterior', ['V3', 'V4']]];
    const terrUp = {};
    const terrs = TERR.map(([name, leads]) => {
      const up = leads.filter((l) => s.st[l] === 'up'), dn = leads.filter((l) => s.st[l] === 'down');
      terrUp[name] = up.length;
      const bits = [];
      if (up.length >= 2) bits.push('Elevatie ' + up.join(', ') + ' (aangrenzend)');
      else if (up.length === 1) bits.push('Elevatie alleen ' + up[0]);
      if (dn.length) bits.push('Depressie ' + dn.join(', '));
      return { name, leads: leads.join(' · '), text: bits.length ? bits.join('; ') : 'Geen deviatie', cls: bits.length ? 'terr abn' : 'terr' };
    });
    const stNotes = [];
    if (s.st.aVR === 'up' && stDown.length >= 6) stNotes.push({ t: 'Elevatie in aVR met uitgebreide depressie: hoofdstam- / meervatslijden of diffuse subendocardiale ischemie.' });
    if (terrUp.Inferior >= 2 && (s.st.I === 'down' || s.st.aVL === 'down')) stNotes.push({ t: 'Spiegelbeeldige depressie in I/aVL ondersteunt een inferieur infarct. Maak V4R voor rechterventrikelbetrokkenheid.' });
    if ((terrUp.Anterior + terrUp.Septaal) >= 2 && stDown.some((l) => ['II', 'III', 'aVF'].indexOf(l) >= 0)) stNotes.push({ t: 'Inferieure depressie is spiegelbeeldig aan de anterieure elevatie.' });
    if (!stUp.length && stDown.filter((l) => ['V1', 'V2', 'V3'].indexOf(l) >= 0).length >= 2) stNotes.push({ t: 'Depressie in V1–V3: denk aan een posterieur infarct — maak V7–V9.' });
    if (stUp.length >= 7) stNotes.push({ t: 'Uitgebreide elevatie: pericarditis (let op PQ-depressie) vs. uitgebreid infarct.' });
    const stFields = [fld('stMax', 'Grootste ST-deviatie', 'mm', 0.5, { start: 1, min: 0, ph: '—', hint: 'Op het J-punt, ten opzichte van het PQ-segment' })];
    const stMaxV = N('stMax') * gc;
    let stText = '';
    if (stUp.length || stDown.length) stText = [stUp.length ? 'Elevatie ' + stUp.join(', ') : null, stDown.length ? 'depressie ' + stDown.join(', ') : null].filter(Boolean).join('; ') + (!isNaN(stMaxV) ? ' (max ' + r1(stMaxV) + ' mm)' : '');
    else if (s.maxStep >= 6) stText = 'Geen ST-deviatie';
    const stAbn = stUp.length > 0 || stDown.length > 0;

    /* ---------- T ---------- */
    const tInv = leadsWith(s.tw, 'inv').filter((l) => l !== 'aVR'), tFlat = leadsWith(s.tw, 'flat'), tPeak = leadsWith(s.tw, 'peak');
    const tNotes = [];
    const variantOnly = tInv.length > 0 && tInv.every((l) => l === 'III' || l === 'V1');
    if (variantOnly) tNotes.push({ t: 'Een geïsoleerde negatieve T-top in III en/of V1 kan een normaalvariant zijn.' });
    if (tPeak.length) tNotes.push({ t: 'Spitse T-toppen: denk aan hyperkaliëmie of hyperacute ischemie.' });
    if (tInv.filter((l) => ['V2', 'V3', 'V4'].indexOf(l) >= 0).length >= 2) tNotes.push({ t: 'Diep negatieve T-toppen in V2–V4: denk aan een Wellens-patroon (proximale LAD) als de pijn verdwenen is.' });
    const tBits = [];
    if (tInv.length) tBits.push('Negatief ' + tInv.join(', '));
    if (tFlat.length) tBits.push('afgevlakt ' + tFlat.join(', '));
    if (tPeak.length) tBits.push('spits ' + tPeak.join(', '));
    if (s.uw) tBits.push('U-golven');
    let tText = tBits.join('; ');
    if (!tText && s.maxStep >= 7) tText = 'Normale T-toppen';
    const tAbn = (tInv.length > 0 && !variantOnly) || tFlat.length > 0 || tPeak.length > 0 || s.uw;

    /* ---------- QT ---------- */
    const qt = N('qt');
    const rr = hrOk ? 60 / hr : NaN;
    const thr = s.sex === 'F' ? 460 : 450;
    const qtcEv = (v) => v >= 500 ? ['abn', 'Sterk verlengd'] : v > thr ? ['abn', 'Verlengd'] : v < 350 ? ['abn', 'Kort'] : ['ok', 'Normaal'];
    const FORM = [
      ['baz', 'Bazett', 'QT / √RR', () => qt / Math.sqrt(rr)],
      ['fri', 'Fridericia', 'QT / ∛RR', () => qt / Math.cbrt(rr)],
      ['fra', 'Framingham', 'QT + 154 × (1 − RR)', () => qt + 154 * (1 - rr)],
      ['hod', 'Hodges', 'QT + 1,75 × (HF − 60)', () => qt + 1.75 * (hr - 60)]
    ];
    const qtOk = !isNaN(qt) && qt > 0 && hrOk;
    const qtcCards = FORM.map(([k, name, f, fn]) => {
      const v = qtOk ? Math.round(fn()) : NaN;
      const ev = !isNaN(v) ? qtcEv(v) : null;
      const on = s.qtF === k;
      return { name, f, val: !isNaN(v) ? v + ' ms' : '—', ev: ev ? ev[1] : '', cls: 'qcard' + (ev ? ' ' + ev[0] : '') + (on ? ' on' : ''), pressed: on ? 'true' : 'false', pick: () => this.setState({ qtF: k, copied: false }) };
    });
    const qtFields = [fld('qt', 'QT-tijd', 'ms', 10, { start: 400, min: 0, ph: '—', hint: 'Begin QRS tot einde T-top (raaklijnmethode)' })];
    const qtNotes = [];
    if (qrsV >= 120) qtNotes.push({ t: 'Een verbreed QRS verlengt de QT-tijd: beoordeel het JT-interval (QT − QRS) of gebruik een voor QRS-duur gecorrigeerde formule.' });
    if (hrOk && hr > 90) qtNotes.push({ t: 'Frequentie > 90/min: Bazett overschat — gebruik bij voorkeur Fridericia.' });
    const sel = FORM.filter((x) => x[0] === s.qtF)[0];
    const qtcSel = qtOk ? Math.round(sel[3]()) : NaN;
    const qtcSelEv = !isNaN(qtcSel) ? qtcEv(qtcSel) : null;
    const qtcText = !isNaN(qtcSel) ? 'QT ' + qt + ' ms, QTc ' + qtcSel + ' ms (' + sel[1] + ')' + (qtcSelEv[0] === 'abn' ? ' — ' + qtcSelEv[1].toLowerCase() : '') : (!isNaN(qt) ? 'QT ' + qt + ' ms' : '');
    const qtcAbn = !!qtcSelEv && qtcSelEv[0] === 'abn';

    /* ---------- differentiaaldiagnose ---------- */
    const ddx = [];
    const add = (title, basis, items, pat) => ddx.push({ title, basis, items: items.map((t) => ({ t })), plain: items, cls: pat ? 'ddx pat' : 'ddx' });
    const broad = qrsV >= 120;
    const avAbn = !!s.av && s.av !== 'norm';
    const highAv = ['mob2', 'two1', 'av3'].indexOf(s.av) >= 0;
    const hyperK = tPeak.length > 0 && (broad || avAbn || (hrOk && hr < 50));
    const diffuseUp = stUp.length >= 7;
    const avrPattern = s.st.aVR === 'up' && stDown.length >= 6;

    /* patronen (combinaties) */
    if (hyperK) add('Patroon: hyperkaliëmie', 'Spitse T-toppen met ' + [broad ? 'verbreed QRS' : null, avAbn ? 'AV-geleidingsstoornis' : null, (hrOk && hr < 50) ? 'bradycardie' : null].filter(Boolean).join(', '),
      ['Nierinsufficiëntie (acuut of chronisch)', 'Medicatie: RAAS-remmers, kaliumsparende diuretica, NSAID’s, trimethoprim', 'Rabdomyolyse, hemolyse, tumorlysis', 'Metabole acidose / diabetische ketoacidose', 'Bijnierinsufficiëntie'], true);
    if (diffuseUp) add('Patroon: diffuse ST-elevatie', 'ST-elevatie in ' + stUp.length + ' afleidingen',
      ['Pericarditis (PQ-depressie, geen spiegelbeeld behalve in aVR/V1)', 'Uitgebreid anterolateraal infarct (proximale LAD)', 'Myocarditis', 'Vroege repolarisatie'], true);
    if (avrPattern) add('Patroon: diffuse subendocardiale ischemie', 'ST-elevatie in aVR met depressie in ' + stDown.length + ' afleidingen',
      ['Hoofdstamstenose of drievatslijden', 'Ernstige aortaklepstenose', 'Vraag-ischemie door tachycardie, hypotensie of anemie'], true);
    const rvBits = [];
    if (s.morph === 'rbbb' || s.morph === 'irbbb') rvBits.push(MORPH[s.morph]);
    if (axisAbn && axCat === C_R) rvBits.push('rechterasdeviatie');
    if (tInv.filter((l) => ['V1', 'V2', 'V3', 'V4', 'III'].indexOf(l) >= 0).length >= 2) rvBits.push('negatieve T in rechts-precordiale/inferieure afleidingen');
    if (hrOk && hr > 100 && rvBits.length) add('Patroon: acute rechterventrikelbelasting', 'Tachycardie met ' + rvBits.join(', '),
      ['Longembolie', 'Exacerbatie COPD / ernstig astma', 'Pulmonale hypertensie (acuut op chronisch)', 'Pneumothorax'], true);

    /* ritme en frequentie */
    if (rh === 'sinus' && hrOk && hr > 100) add('Sinustachycardie', hr + '/min',
      ['Koorts, sepsis, pijn, angst', 'Hypovolemie, bloeding, anemie', 'Longembolie, hypoxie', 'Hartfalen', 'Hyperthyreoïdie', 'Middelen: β-agonisten, cafeïne, cocaïne, amfetamine; onttrekking (alcohol, β-blokker)']);
    if (rh === 'sinus' && hrOk && hr < 60) add('Sinusbradycardie', hr + '/min',
      ['Getrainde sporter, slaap, vagale prikkel', 'Medicatie: β-blokker, non-DHP-calciumantagonist, digoxine, amiodaron, ivabradine', 'Hypothyreoïdie, hypothermie', 'Sick-sinussyndroom', 'Inferieure ischemie', 'Verhoogde intracraniële druk (Cushing-reflex)']);
    if (rh === 'af' || rh === 'flutter') add(RH[rh], rhythmText,
      ['Hypertensie, ischemisch hartlijden, hartfalen', 'Kleplijden (vooral mitralisklep)', 'Hyperthyreoïdie', 'Alcohol (“holiday heart”), OSAS, obesitas', 'Infectie / sepsis, longembolie', 'Postoperatief (vooral na thoraxchirurgie)']);
    if (rh === 'junct') add('Junctioneel ritme', rhythmText,
      ['Sick-sinussyndroom', 'Digoxine-intoxicatie', 'Medicatie: β-blokker, calciumantagonist', 'Inferieure ischemie', 'Na hartchirurgie, myocarditis']);
    if (rh === 'ventr') add('Ventriculair ritme', rhythmText,
      ['Versneld idioventriculair ritme (reperfusie na PCI/trombolyse)', 'Ventrikeltachycardie (bij frequentie > 100/min)', 'Ventriculair escaperitme bij totaal AV-blok', 'Hyperkaliëmie, natriumkanaalblokkerintoxicatie']);
    if (rh === 'ectopic') add('Ectopisch atriaal ritme', rhythmText,
      ['Normaalvariant (vooral bij lage frequentie)', 'Digoxine-intoxicatie', 'Structureel atriaal lijden']);

    /* as */
    if (axisAbn && axCat === C_L) add('Linkerasdeviatie', axShort,
      ['Linker anterior hemiblok', 'Inferieur infarct (oud)', 'LVH, LBTB', 'WPW (posteroseptale accessoire baan)', 'Rechterventrikelpacing', 'Hyperkaliëmie']);
    if (axisAbn && axCat === C_R) add('Rechterasdeviatie', axShort,
      ['Normaal bij jongeren en slanke personen', 'Rechterventrikelhypertrofie / -belasting (longembolie, COPD, pulmonale hypertensie)', 'Lateraal infarct', 'Linker posterior hemiblok', 'Verwisselde armelektroden, dextrocardie']);
    if (axisAbn && axCat === C_E) add('Extreme asdeviatie', axShort,
      ['Ventriculair ritme / VT', 'Hyperkaliëmie', 'Verwisselde elektroden', 'Pacing, ernstige structurele hartziekte']);

    /* P en PQ */
    if (pFlags.indexOf('P mitrale') >= 0) add('P mitrale (linkeratriumvergroting)', pText,
      ['Mitralisklepstenose of -insufficiëntie', 'Hypertensie / LVH', 'Hartfalen, cardiomyopathie']);
    if (pFlags.indexOf('P pulmonale') >= 0) add('P pulmonale (rechteratriumvergroting)', pText,
      ['COPD, pulmonale hypertensie', 'Tricuspidalisklepafwijkingen', 'Congenitale hartafwijkingen']);
    if (!isNaN(pr) && pr < 120) add('Korte PQ-tijd', 'PQ ' + pr + ' ms' + (s.delta ? ' met deltagolf' : ''),
      s.delta ? ['Wolff-Parkinson-White-patroon (accessoire baan)', 'Let op: risico op snelle geleiding bij AF'] : ['Pre-excitatie (zoek naar deltagolf)', 'Laag-atriaal of junctioneel ritme', 'Versnelde AV-geleiding (normaalvariant)']);
    if (s.av === 'av1' || (!s.av && !isNaN(pr) && pr > 200)) add('Eerstegraads AV-blok', !isNaN(pr) ? 'PQ ' + pr + ' ms' : AVN.av1,
      ['Vagotonie, getrainde sporter', 'Medicatie: β-blokker, calciumantagonist, digoxine, amiodaron', 'Inferieure ischemie', 'Degeneratief geleidingslijden', 'Myocarditis, Lyme-carditis, reumatische koorts', 'Hyperkaliëmie']);
    if (s.av === 'mob1') add('Tweedegraads AV-blok, Mobitz I', AVN.mob1,
      ['Vagale tonus (vooral ’s nachts, sporters)', 'Medicatie: β-blokker, calciumantagonist, digoxine', 'Inferieure ischemie', 'Myocarditis']);
    if (highAv) add(AVN[s.av], 'Hooggradig AV-blok',
      ['Degeneratief geleidingslijden (Lenègre/Lev)', 'Anterieur infarct (infranodaal) of inferieur infarct (nodaal)', 'Medicatie-intoxicatie (β-blokker, calciumantagonist, digoxine)', 'Lyme-carditis, sarcoïdose, endocarditis met wortelabces', 'Na TAVI of klepchirurgie', 'Hyperkaliëmie']);

    /* QRS */
    if (s.morph === 'lbbb') add('Linkerbundeltakblok', qrsText,
      ['Hypertensie, ischemisch hartlijden', 'Gedilateerde cardiomyopathie', 'Aortaklepstenose', 'Degeneratief geleidingslijden', 'Nieuw LBTB met klachten: beoordeel als mogelijk ACS (Sgarbossa-criteria)']);
    if (s.morph === 'rbbb' || s.morph === 'irbbb') add(s.morph === 'rbbb' ? 'Rechterbundeltakblok' : 'Incompleet rechterbundeltakblok', qrsText,
      ['Normaalvariant', 'Rechterventrikelbelasting (longembolie, COPD, pulmonale hypertensie)', 'Atriumseptumdefect', 'Ischemisch hartlijden, degeneratief geleidingslijden', 'Brugada-patroon (bij ST-elevatie V1–V2)']);
    if (s.morph === 'ivcd' || (broad && !s.morph)) add('Verbreed QRS zonder typisch bundeltakblok', !isNaN(qrsV) ? 'QRS ' + qrsV + ' ms' : MORPH.ivcd,
      ['Hyperkaliëmie', 'Natriumkanaalblokkers: TCA-intoxicatie, klasse IC-antiaritmica', 'Cardiomyopathie, uitgebreid infarct', 'Ventriculaire oorsprong of pre-excitatie', 'Hypothermie']);
    if (s.fasc === 'lafb' || s.fasc === 'lpfb') add(s.fasc === 'lafb' ? 'Linker anterior hemiblok' : 'Linker posterior hemiblok', 'As ' + (axShort || 'niet bepaald'),
      ['Degeneratief geleidingslijden', 'Ischemisch hartlijden', 'Hypertensie / LVH', 'Cardiomyopathie', 'Bifasciculair blok bij combinatie met RBTB']);
    if (qLeads.length) add('Pathologische Q-golven', qLeads.join(', '),
      ['Doorgemaakt myocardinfarct in dat gebied', 'Hypertrofische cardiomyopathie (septale Q)', 'Pseudo-infarctpatroon bij LBTB of WPW', 'Infiltratieve cardiomyopathie (amyloïdose)']);
    if (s.rprog === 'poor') add('Slechte R-topprogressie', 'V1–V4',
      ['Oud anteroseptaal infarct', 'LVH, LBTB', 'COPD', 'Te hoog geplaatste precordiale elektroden']);
    if (lvh) add('LVH-spanningscriteria positief', lvhCards.filter((k) => k.cls.indexOf('abn') >= 0).map((k) => k.name + ' ' + k.val).join(', '),
      ['Hypertensie', 'Aortaklepstenose', 'Hypertrofische cardiomyopathie', 'Coarctatio aortae', 'Sporthart of slanke jonge persoon (alleen voltage, zonder repolarisatiestoornis)']);

    /* ST en T */
    const CULPRIT = { Inferior: 'inferior (RCA, soms RCx)', Anterior: 'anterior (LAD)', Septaal: 'septaal (proximale LAD)', Lateraal: 'lateraal (RCx of diagonaaltak)' };
    const contTerr = Object.keys(terrUp).filter((k) => terrUp[k] >= 2);
    if (contTerr.length && !diffuseUp) {
      const items = ['STEMI ' + contTerr.map((k) => CULPRIT[k]).join(' + '), 'Pericarditis / myocarditis', 'Vroege repolarisatie', 'LV-aneurysma (persisterende elevatie na oud infarct)', 'Takotsubo-cardiomyopathie', 'Secundair aan LBTB, LVH of pacing'];
      if (terrUp.Septaal >= 2) items.push('Brugada-patroon (coved type in V1–V2)');
      add('ST-elevatie in ≥ 2 aangrenzende afleidingen', stUp.join(', '), items);
    }
    if (stDown.length && !avrPattern) add('ST-depressie', stDown.join(', '),
      ['Ischemie (NSTE-ACS, vraag-ischemie)', 'Spiegelbeeld van een STEMI elders', 'Posterieur infarct (bij depressie V1–V3)', 'LVH met strain, secundair aan bundeltakblok', 'Digoxine-effect (kuipvormig)', 'Hypokaliëmie']);
    if (tInv.length && !variantOnly) add('Negatieve T-toppen', tInv.join(', '),
      ['Ischemie / doorgemaakt infarct, Wellens-patroon (V2–V3)', 'Longembolie (V1–V4 en III)', 'LVH met strain, hypertrofische (apicale) cardiomyopathie', 'Myocarditis', 'Cerebraal: SAB, CVA (diep, breed)', 'Na tachycardie of pacing (cardiac memory)', 'Secundair aan bundeltakblok']);
    if (tPeak.length && !hyperK) add('Spitse T-toppen', tPeak.join(', '),
      ['Hyperkaliëmie', 'Hyperacute fase van een STEMI', 'Vroege repolarisatie / normaalvariant']);
    if (tFlat.length || s.uw) add(s.uw ? 'Afgevlakte T-toppen / U-golven' : 'Afgevlakte T-toppen', [tFlat.length ? tFlat.join(', ') : null, s.uw ? 'U-golven' : null].filter(Boolean).join('; '),
      ['Hypokaliëmie, hypomagnesiëmie', 'Ischemie', 'Medicatie (digoxine, antiaritmica)', 'Hypothyreoïdie']);

    /* QT */
    if (qtcAbn && qtcSel > 350) add('Verlengde QTc', qtcSel + ' ms (' + sel[1] + ')',
      ['Medicatie: klasse IA/III-antiaritmica, macroliden, fluorochinolonen, antipsychotica, antidepressiva, ondansetron, methadon', 'Hypokaliëmie, hypomagnesiëmie, hypocalciëmie', 'Congenitaal lang-QT-syndroom', 'Ischemie, cardiomyopathie', 'Hypothermie, hypothyreoïdie', 'Intracraniële pathologie']);
    if (qtcAbn && qtcSel < 350) add('Korte QTc', qtcSel + ' ms (' + sel[1] + ')',
      ['Hypercalciëmie', 'Digoxine', 'Congenitaal kort-QT-syndroom', 'Hyperthermie, acidose']);

    /* ---------- samenvatting ---------- */
    const rows = [
      ['Ritme', rhythmText, rhythmAbn],
      ['Frequentie', hrOk ? hr + '/min' : '', rateAbn],
      ['As', axDetermined ? axShort + ' — ' + axCat.toLowerCase() : '', axisAbn],
      ['P-top', pText, pFlags.length > 0],
      ['PQ / AV', prText, prAbn],
      ['QRS', qrsText, qrsAbn],
      ['ST', stText, stAbn],
      ['T-top', tText, tAbn],
      ['QT', qtcText, qtcAbn]
    ];
    const sumRows = rows.map(([k, v, abn]) => ({ k, v: v || '—', cls: 'srow' + (abn ? ' abn' : '') + (!v ? ' empty' : '') }));
    const lead = [rhythmText, hrOk ? hr + '/min' : '', axDetermined ? axCat.toLowerCase() : ''].filter(Boolean).join(', ');
    const abnRest = rows.slice(3).filter((r) => r[2] && r[1]).map((r) => r[0] + ': ' + r[1]);
    let conclusion = '';
    if (lead || abnRest.length) conclusion = (lead ? lead.charAt(0).toUpperCase() + lead.slice(1) : '') + (abnRest.length ? (lead ? '. ' : '') + abnRest.join('. ') + '.' : (lead ? '. Verder geen afwijkingen vastgelegd.' : ''));
    else conclusion = 'De bevindingen verschijnen hier terwijl je de stappen doorloopt.';
    const report = 'ECG — ' + s.speed + ' mm/s, ' + s.gain + ' mm/mV, ' + (s.sex === 'F' ? 'vrouw' : 'man') + '\n\n' +
      rows.map((r) => (r[0] + ':').padEnd(12, ' ') + (r[1] || '—')).join('\n') + '\n\nConclusie: ' + conclusion +
      (ddx.length ? '\n\nDifferentiaaldiagnose:\n' + ddx.map((d) => '- ' + d.title + (d.basis ? ' (' + d.basis + ')' : '') + ': ' + d.plain.join('; ')).join('\n') : '');
    const fullReport = report + (s.notes ? '\n\nAantekeningen: ' + s.notes : '');

    /* ---------- navigatie ---------- */
    const navVals = [
      [s.speed + ' mm/s · ' + s.gain + ' mm/mV', false],
      [rhythmText, rhythmAbn],
      [hrOk ? hr + '/min' : '', rateAbn],
      [axShort, axisAbn],
      [!isNaN(pr) ? 'PQ ' + pr + ' ms' : (s.av ? AVN[s.av] : ''), prAbn || pFlags.length > 0],
      [!isNaN(qrsV) ? 'QRS ' + qrsV + ' ms' : (qrsText || ''), qrsAbn],
      [stUp.length || stDown.length ? (stUp.length ? stUp.length + ' elevatie' : '') + (stUp.length && stDown.length ? ', ' : '') + (stDown.length ? stDown.length + ' depressie' : '') : (s.maxStep >= 6 ? 'Geen deviatie' : ''), stAbn],
      [tBits.length ? tBits.join('; ') : (s.maxStep >= 7 ? 'Normaal' : ''), tAbn],
      [!isNaN(qtcSel) ? 'QTc ' + qtcSel + ' ms' : '', qtcAbn],
      ['', false]
    ];
    const nav = STEPS.map(([title], i) => ({
      num: String(i + 1), title, val: navVals[i][0] || ' ',
      cur: i === s.step ? 'step' : 'false',
      cls: 'navbtn' + (i === s.step ? ' cur' : '') + (navVals[i][0] && i > 0 ? (navVals[i][1] ? ' flag' : ' done') : ''),
      go: () => this.go(i)
    }));

    const copy = () => this.copyText(fullReport);
    const st = s.step;
    return {
      setupLine: s.speed + ' mm/s · ' + s.gain + ' mm/mV · ' + (s.sex === 'F' ? 'Vrouw' : 'Man'),
      reset: () => this.setState(this.initState()),
      nav, panelRef: this.panelRef,
      stepNum: String(st + 1).padStart(2, '0'), stepTitle: STEPS[st][0], stepLead: STEPS[st][1],
      is0: st === 0, is1: st === 1, is2: st === 2, is3: st === 3, is4: st === 4, is5: st === 5, is6: st === 6, is7: st === 7, is8: st === 8, is9: st === 9,
      isFirst: st === 0,
      prev: () => this.go(st - 1),
      next: st < 9 ? next : copy,
      nextLabel: st < 9 ? 'Volgende: ' + STEPS[st + 1][0] : (s.copied ? 'Gekopieerd' : 'Kopieer verslag'),

      speedChips: chips('speed', [[25, '25 mm/s'], [50, '50 mm/s']]),
      gainChips: chips('gain', [[5, '5 mm/mV'], [10, '10 mm/mV'], [20, '20 mm/mV']]),
      sexChips: chips('sex', [['M', 'Man'], ['F', 'Vrouw']]),

      regChips: chips('reg', [['reg', 'Regulair'], ['regirr', 'Regulair irregulair'], ['irrirr', 'Irregulair irregulair']]),
      pwChips: chips('pw', [['yes', 'P-toppen zichtbaar'], ['no', 'Geen P-toppen'], ['flutter', 'Fluttergolven'], ['fib', 'Fibrillatiegolven']]),
      conChips: chips('conduct', [['yes', 'Ja, 1:1'], ['no', 'Nee']]),
      pupChips: chips('pup', [['yes', 'Ja'], ['no', 'Nee']]),
      showSugg: !!sugg && s.rhythm !== sugg, suggName: sugg ? RH[sugg] : '',
      applySugg: () => this.setState({ rhythm: sugg, copied: false }),
      rhChips: chips('rhythm', Object.keys(RH).map((k) => [k, RH[k]])),
      conductNote: s.conduct === 'no',

      rateTabs: chips('rateM', [['direct', 'Direct'], ['large', 'Grote hokjes'], ['small', 'Kleine hokjes'], ['count', 'Strook 10 s']], 'tab'),
      rateFields, rateBig: hrOk ? String(hr) : '—', rateText, rateCls: !hrOk ? 'result' : rateAbn ? 'result abn' : 'result ok',
      speedTxt: s.speed + ' mm/s', largeMs: String(Math.round(secLarge * 1000)), smallMs: String(Math.round(secSmall * 1000)),

      axTabs: chips('axM', [['quad', 'Kwadrant'], ['iso', 'Iso-elektrische afleiding'], ['amp', 'Netto amplitude'], ['man', 'Direct']], 'tab'),
      axQuad: s.axM === 'quad', axIso: s.axM === 'iso', axAmp: s.axM === 'amp', axMan: s.axM === 'man',
      qIChips: chips('qI', polOpts), qFChips: chips('qF', polOpts), qIIChips: chips('qII', polOpts),
      isoChips, candChips, hasCands: cands.length === 2,
      ampFields: [
        fld('ampI', 'Netto QRS in afleiding I', 'mm', 1, { start: 0, signed: true, ph: '—' }),
        fld('ampF', 'Netto QRS in aVF', 'mm', 1, { start: 0, signed: true, ph: '—' })
      ],
      manFields: [fld('man', 'As', '°', 5, { start: 60, min: -180, max: 180, signed: true, ph: '—' })],
      axBig, axCat, axCls, axNote, hasAxNote: !!axNote,
      cabChip: tog('cab', 'Toon omgekeerde afleidingen (Cabrera)'),
      cabOp: s.cab ? 1 : 0,
      zN: zo(C_N), zL: zo(C_L), zR: zo(C_R), zE: zo(C_E),
      rangePath, rangeOp, arX, arY, arHead, arOp,
      c1x: c1p[0], c1y: c1p[1], c2x: c2p[0], c2y: c2p[1], c1op: showCands ? 1 : 0, c2op: showCands ? 1 : 0,
      wheelAria: 'Hexaxiaal referentiewiel. As: ' + (axDetermined ? axBig + ', ' + axCat : 'niet bepaald'),
      wDown: (e) => { this.dragging = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} this.wheelSet(e); },
      wMove: (e) => { if (this.dragging) this.wheelSet(e); },
      wUp: () => { this.dragging = false; },

      pFields,
      avChips: chips('av', [['norm', 'Normaal'], ['av1', 'Eerstegraads'], ['mob1', 'Tweedegraads Mobitz I'], ['mob2', 'Tweedegraads Mobitz II'], ['two1', '2:1-blok'], ['av3', 'Derdegraads']]),
      deltaChip: tog('delta', 'Deltagolf aanwezig'),

      qrsFields,
      morphChips: chips('morph', Object.keys(MORPH).map((k) => [k, MORPH[k]])),
      fascChips: chips('fasc', [['none', 'Geen'], ['lafb', 'LAHB'], ['lpfb', 'LPHB']]),
      fascHint, hasFascHint: !!fascHint,
      rprogChips: chips('rprog', Object.keys(RPROG).map((k) => [k, RPROG[k]])),
      qGrid: grid('q', ['n', 'q'], { n: '—', q: 'Q' }, { n: 'geen pathologische Q', q: 'pathologische Q-golf' }),
      lvhFields, lvhCards,

      stGrid: grid('st', ['n', 'up', 'down'], { n: '—', up: 'ELEV', down: 'DEPR' }, { n: 'normaal', up: 'ST-elevatie', down: 'ST-depressie' }),
      stFields, terrs, stNotes,

      tGrid: grid('tw', ['n', 'inv', 'flat', 'peak'], { n: '—', inv: 'NEG', flat: 'VLAK', peak: 'SPITS' }, { n: 'normaal', inv: 'negatief', flat: 'afgevlakt', peak: 'spits' }),
      uChip: tog('uw', 'U-golven aanwezig'), tNotes,

      qtFields, qtcCards, qtNotes, qtNoHr: !hrOk, qtHasHr: hrOk, hrTxt: hrOk ? hr + '/min (RR ' + Math.round(rr * 1000) + ' ms)' : '',
      goRate: () => this.go(2),

      sumRows, conclusion, report, ddx, noDdx: ddx.length === 0,
      ddxCount: ddx.length ? ddx.length + (ddx.length === 1 ? ' overweging' : ' overwegingen') + ' in de differentiaaldiagnose — zie Conclusie.' : '',
      hasDdx: ddx.length > 0,
      notes: s.notes, onNotes: (e) => this.setState({ notes: e.target.value, copied: false }),
      copy, copyLabel: s.copied ? 'Gekopieerd' : 'Kopieer verslag'
    };
  }

  render() {
    const v = this.vals();
    const chipRow = (list) => html`<div class="chips">${list.map((c) => html`<button type="button" class=${c.cls} aria-pressed=${c.pressed} onClick=${c.pick}>${c.label}</button>`)}</div>`;
    const tabRow = (list, label) => html`<div class="tabs" role="group" aria-label=${label}>${list.map((c) => html`<button type="button" class=${c.cls} aria-pressed=${c.pressed} onClick=${c.pick}>${c.label}</button>`)}</div>`;
    const field = (f, showEv = true) => html`
      <div class="field">
        <label for=${f.id}>${f.label}</label>
        <div class="ctrl">
          <button type="button" class="sbtn" onClick=${f.dec} aria-label=${'Verlaag ' + f.label}>−</button>
          <div class="inwrap"><input id=${f.id} class="num-in" type="text" inputmode=${f.mode} autocomplete="off" value=${f.value} onInput=${f.onInput} onKeyDown=${f.onKey} placeholder=${f.ph} /><span class="unit">${f.unit}</span></div>
          <button type="button" class="sbtn" onClick=${f.inc} aria-label=${'Verhoog ' + f.label}>+</button>
        </div>
        ${showEv && html`<div class=${f.evCls}>${f.ev}</div>`}
      </div>`;
    const fields = (list, showEv = true) => html`<div class="fields">${list.map((f) => field(f, showEv))}</div>`;
    const group = (label, body, help) => html`<div class="group"><div class="glabel">${label}</div>${help && html`<p class="ghelp">${help}</p>`}${body}</div>`;
    const leadGrid = (list) => html`<div class="leadgrid">${list.map((l) => html`<button type="button" class=${l.cls} onClick=${l.tap} aria-label=${l.aria}><b>${l.lead}</b><span>${l.tag}</span></button>`)}</div>`;
    const notes = (list) => list.length ? html`<div class="notes">${list.map((x) => html`<div class="n">${x.t}</div>`)}</div>` : null;
    const sumRows = v.sumRows.map((r) => html`<div class=${r.cls}><span class="k">${r.k}</span><span class="v">${r.v}</span></div>`);
    const T = (x, y, s, w, fill, txt) => html`<text x=${x} y=${y} font-size=${s} font-weight=${w} fill=${fill} text-anchor="middle" dominant-baseline="middle">${txt}</text>`;

    const wheel = html`
      <svg class="wheel" viewBox="-175 -175 350 350" role="img" aria-label=${v.wheelAria} onPointerDown=${v.wDown} onPointerMove=${v.wMove} onPointerUp=${v.wUp} onPointerCancel=${v.wUp}>
        <circle cx="0" cy="0" r="170" fill="#ffffff" stroke="#e3dcd8"></circle>
        <path d="M0 0 L103.92 -60 A120 120 0 0 1 0 120 Z" fill="#1d5fa6" fill-opacity=${v.zN}></path>
        <path d="M0 0 L0 -120 A120 120 0 0 1 103.92 -60 Z" fill="#c26a1a" fill-opacity=${v.zL}></path>
        <path d="M0 0 L0 120 A120 120 0 0 1 -120 0 Z" fill="#c26a1a" fill-opacity=${v.zR}></path>
        <path d="M0 0 L-120 0 A120 120 0 0 1 0 -120 Z" fill="#8f2a1c" fill-opacity=${v.zE}></path>
        <circle cx="0" cy="0" r="120" fill="none" stroke="#d6ccc6"></circle>
        <line x1="-120" y1="0" x2="120" y2="0" stroke="#9aa3ad"></line>
        <line x1="-60" y1="-103.92" x2="60" y2="103.92" stroke="#9aa3ad"></line>
        <line x1="60" y1="-103.92" x2="-60" y2="103.92" stroke="#9aa3ad"></line>
        <line x1="0" y1="-120" x2="0" y2="120" stroke="#9aa3ad"></line>
        <line x1="-103.92" y1="60" x2="103.92" y2="-60" stroke="#9aa3ad"></line>
        <line x1="103.92" y1="60" x2="-103.92" y2="-60" stroke="#9aa3ad"></line>
        ${T(60.6, 35, 10, 400, '#164a82', 'NORMAAL')}
        ${T(35, -60.6, 10, 400, '#7a3800', 'LINKS')}
        ${T(-49.5, 49.5, 10, 400, '#7a3800', 'RECHTS')}
        ${T(-49.5, -49.5, 10, 400, '#6b1f14', 'EXTREEM')}
        <path d=${v.rangePath} fill="#b3261e" fill-opacity="0.22" stroke="#b3261e" stroke-width="1.5" opacity=${v.rangeOp}></path>
        <line x1="0" y1="0" x2=${v.c1x} y2=${v.c1y} stroke="#b3261e" stroke-width="2.5" stroke-dasharray="6 5" opacity=${v.c1op}></line>
        <line x1="0" y1="0" x2=${v.c2x} y2=${v.c2y} stroke="#b3261e" stroke-width="2.5" stroke-dasharray="6 5" opacity=${v.c2op}></line>
        <line x1="0" y1="0" x2=${v.arX} y2=${v.arY} stroke="#b3261e" stroke-width="4" stroke-linecap="round" opacity=${v.arOp}></line>
        <polygon points=${v.arHead} fill="#b3261e" opacity=${v.arOp}></polygon>
        <circle cx="0" cy="0" r="5" fill="#17202b"></circle>
        ${T(134, 0, 13, 600, '#17202b', 'I')}
        ${T(67, 116, 13, 600, '#17202b', 'II')}
        ${T(0, 134, 13, 600, '#17202b', 'aVF')}
        ${T(-67, 116, 13, 600, '#17202b', 'III')}
        ${T(116, -67, 13, 600, '#17202b', 'aVL')}
        ${T(-116, -67, 13, 600, '#17202b', 'aVR')}
        <g opacity=${v.cabOp}>
          ${T(116, 67, 12, 600, '#5a6573', '−aVR')}
          ${T(-116, 67, 12, 600, '#5a6573', '−aVL')}
          ${T(-134, 0, 12, 600, '#5a6573', '−I')}
          ${T(-67, -116, 12, 600, '#5a6573', '−II')}
          ${T(0, -134, 12, 600, '#5a6573', '−aVF')}
          ${T(67, -116, 12, 600, '#5a6573', '−III')}
        </g>
        ${[[157, 0, '0°'], [135.1, 78, '+30'], [78, 135.1, '+60'], [0, 157, '+90'], [-78, 135.1, '+120'], [-135.1, 78, '+150'], [-157, 0, '±180'], [-135.1, -78, '−150'], [-78, -135.1, '−120'], [0, -157, '−90'], [78, -135.1, '−60'], [135.1, -78, '−30']].map(([x, y, t]) => T(x, y, 9, 400, '#5a6573', t))}
      </svg>`;

    return html`
<div class="app">
  <header class="top">
    <div class="brand">
      <svg width="36" height="20" viewBox="0 0 36 20" aria-hidden="true"><path d="M1 12h8l2-5 3 11 4-17 3 11h14" fill="none" stroke="#b3261e" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"></path></svg>
      <span>ECG Stapsgewijs</span>
    </div>
    <div class="topmeta">${v.setupLine}</div>
    <button type="button" class="btn ghost small" onClick=${v.reset}>Nieuw ECG</button>
  </header>

  <div class="shell">
    <nav class="steps" aria-label="Stappen">
      ${v.nav.map((n) => html`<button type="button" class=${n.cls} onClick=${n.go} aria-current=${n.cur}><span class="num">${n.num}</span><span class="meta"><span class="t">${n.title}</span><span class="val">${n.val}</span></span></button>`)}
    </nav>

    <main class="panel" ref=${v.panelRef}>
      <div class="phead">
        <div class="kicker">Stap ${v.stepNum} / 10</div>
        <h2>${v.stepTitle}</h2>
        <p class="lead-in">${v.stepLead}</p>
      </div>

      ${v.is0 && html`<div class="stack">
        ${group('Papiersnelheid', chipRow(v.speedChips))}
        <div class="group"><div class="glabel">IJking (versterking)</div>${chipRow(v.gainChips)}<p class="note">Spanningswaarden die je later invoert (P-amplitude, LVH-criteria, ST-deviatie) worden omgerekend naar de standaard 10 mm/mV.</p></div>
        ${group('Geslacht', chipRow(v.sexChips), 'Bepaalt de afkapwaarden voor QTc en Cornell.')}
      </div>`}

      ${v.is1 && html`<div class="stack">
        ${group('RR-intervallen', chipRow(v.regChips))}
        ${group('Atriale activiteit', chipRow(v.pwChips))}
        ${group('Na elke P-top een QRS, voor elk QRS een P-top?', chipRow(v.conChips))}
        ${group('P-top positief in II, negatief in aVR?', chipRow(v.pupChips))}
        ${v.showSugg && html`<div class="sugg"><span>Suggestie: <b>${v.suggName}</b></span><button type="button" class="btn small" onClick=${v.applySugg}>Overnemen</button></div>`}
        ${group('Ritme', chipRow(v.rhChips))}
        ${v.conductNote && html`<div class="notes"><div class="n">Geen 1:1-relatie tussen P en QRS — classificeer het AV-blok in stap 5.</div></div>`}
      </div>`}

      ${v.is2 && html`<div class="stack">
        ${tabRow(v.rateTabs, 'Methode frequentie')}
        ${fields(v.rateFields)}
        <div class=${v.rateCls}><div class="big">${v.rateBig}<span class="bu">/min</span></div><div class="rtext">${v.rateText}</div></div>
        <p class="note">Bij ${v.speedTxt}: 1 groot hokje = ${v.largeMs} ms, 1 klein hokje = ${v.smallMs} ms. Gebruik bij een irregulair ritme de strook van 10 seconden.</p>
      </div>`}

      ${v.is3 && html`<div class="axis-grid">
        <div>
          ${wheel}
          <div class="legend">
            <span><i class="sw" style="background: rgba(29,95,166,.45)"></i>Normaal −30° tot +90°</span>
            <span><i class="sw" style="background: rgba(194,106,26,.45)"></i>Links −30° tot −90° · rechts +90° tot ±180°</span>
            <span><i class="sw" style="background: rgba(143,42,28,.5)"></i>Extreem −90° tot ±180°</span>
          </div>
        </div>
        <div class="stack">
          ${tabRow(v.axTabs, 'Methode as')}
          ${v.axQuad && html`<div class="stack">
            ${group('Netto QRS in afleiding I', chipRow(v.qIChips))}
            ${group('Netto QRS in aVF', chipRow(v.qFChips))}
            ${group('Netto QRS in afleiding II', chipRow(v.qIIChips), 'Onderscheidt normaal (0° tot −30°) van linkerasdeviatie als I positief en aVF negatief is.')}
          </div>`}
          ${v.axIso && html`<div class="stack">
            ${group('Meest iso-elektrische extremiteitsafleiding', chipRow(v.isoChips), 'De as staat hier loodrecht op.')}
            ${v.hasCands && group('Welke richting?', chipRow(v.candChips), 'Kies de kandidaat die wijst naar een afleiding met een positief QRS.')}
          </div>`}
          ${v.axAmp && fields(v.ampFields)}
          ${v.axMan && fields(v.manFields)}
          <div class=${v.axCls}><div class="big" style="font-size: 32px">${v.axBig}</div><div class="rtext">${v.axCat}</div></div>
          ${v.hasAxNote && html`<p class="note">${v.axNote}</p>`}
          ${chipRow(v.cabChip)}
          <p class="note">Tik of sleep op het wiel om de as direct in te stellen. Sommige bronnen leggen de bovengrens van normaal bij +100° of +110°.</p>
        </div>
      </div>`}

      ${v.is4 && html`<div class="stack">
        ${fields(v.pFields)}
        ${group('AV-geleiding', chipRow(v.avChips))}
        <div class="group"><div class="glabel">Pre-excitatie</div>${chipRow(v.deltaChip)}<p class="note">Korte PQ-tijd met deltagolf en verbreed QRS: WPW-patroon.</p></div>
      </div>`}

      ${v.is5 && html`<div class="stack">
        ${fields(v.qrsFields)}
        ${group('Morfologie', chipRow(v.morphChips))}
        ${group('Hemiblok', chipRow(v.fascChips), v.hasFascHint ? v.fascHint : null)}
        ${group('R-topprogressie', chipRow(v.rprogChips))}
        ${group('Pathologische Q-golven', leadGrid(v.qGrid), 'Tik de afleidingen aan. Pathologisch: ≥ 40 ms of ≥ 25% van de R-top, in twee of meer aangrenzende afleidingen.')}
        <div class="group">
          <div class="glabel">LVH-spanningscriteria</div>
          ${fields(v.lvhFields, false)}
          <div class="cards">${v.lvhCards.map((k) => html`<div class=${k.cls}><span class="cn">${k.name}</span><span class="cv">${k.val}</span><span class="cc">${k.crit}</span></div>`)}</div>
        </div>
      </div>`}

      ${v.is6 && html`<div class="stack">
        ${leadGrid(v.stGrid)}
        ${fields(v.stFields)}
        <div class="terrs">${v.terrs.map((t) => html`<div class=${t.cls}><span class="tn">${t.name}</span><span class="tl">${t.leads}</span><span class="tt">${t.text}</span></div>`)}</div>
        ${notes(v.stNotes)}
        <p class="note">STEMI-afkapwaarde (nieuwe elevatie op het J-punt, ≥ 2 aangrenzende afleidingen): ≥ 1 mm in alle afleidingen behalve V2–V3; daar ≥ 2 mm bij mannen ≥ 40 jaar, ≥ 2,5 mm bij mannen ${'<'} 40 jaar en ≥ 1,5 mm bij vrouwen.</p>
      </div>`}

      ${v.is7 && html`<div class="stack">
        ${leadGrid(v.tGrid)}
        ${chipRow(v.uChip)}
        ${notes(v.tNotes)}
        <p class="note">Een negatieve T-top in aVR is normaal en telt niet mee. Markeer alleen wat afwijkt van het verwachte patroon.</p>
      </div>`}

      ${v.is8 && html`<div class="stack">
        ${fields(v.qtFields)}
        ${v.qtNoHr && html`<div class="sugg"><span>Voor de correctie is een hartfrequentie nodig.</span><button type="button" class="btn small" onClick=${v.goRate}>Naar Frequentie</button></div>`}
        ${v.qtHasHr && html`<div class="group">
          <div class="glabel">Correctie bij ${v.hrTxt} — tik om te kiezen welke in het verslag komt</div>
          <div class="cards">${v.qtcCards.map((k) => html`<button type="button" class=${k.cls} aria-pressed=${k.pressed} onClick=${k.pick}><span class="cn">${k.name}</span><span class="cf">${k.f}</span><span class="cv">${k.val}</span><span class="ce">${k.ev}</span></button>`)}</div>
        </div>`}
        ${notes(v.qtNotes)}
        <p class="note">Afkapwaarden: verlengd > 450 ms (man) / > 460 ms (vrouw); sterk verlengd ≥ 500 ms; kort ${'<'} 350 ms. Bazett overcorrigeert bij hoge en ondercorrigeert bij lage frequenties; Fridericia is betrouwbaarder buiten 60–90/min.</p>
      </div>`}

      ${v.is9 && html`<div class="stack">
        <div>${sumRows}</div>
        <div class="group">
          <div class="glabel">Differentiaaldiagnose</div>
          <p class="ghelp">Mogelijke oorzaken per afwijkende bevinding. Patronen die meerdere bevindingen combineren staan bovenaan, in rood omlijnd.</p>
          ${v.noDdx && html`<p class="note">Nog geen afwijkende bevindingen vastgelegd.</p>`}
          <div class="ddxs">${v.ddx.map((d) => html`<div class=${d.cls}><div class="dt">${d.title}</div><div class="db">${d.basis}</div><ul>${d.items.map((it) => html`<li>${it.t}</li>`)}</ul></div>`)}</div>
        </div>
        <div class="group">
          <label class="glabel" for="report">Verslag</label>
          <textarea id="report" class="report" readonly value=${v.report}></textarea>
        </div>
        <div class="group">
          <label class="glabel" for="notes">Eigen aantekeningen</label>
          <textarea id="notes" class="notesin" value=${v.notes} onInput=${v.onNotes} placeholder="Vergelijking met vorig ECG, klinische context…"></textarea>
        </div>
        <div class="row">
          <button type="button" class="btn" onClick=${v.copy}>${v.copyLabel}</button>
          <button type="button" class="btn ghost" onClick=${v.reset}>Nieuw ECG</button>
        </div>
      </div>`}

      <div class="foot">
        <button type="button" class="btn ghost" onClick=${v.prev} disabled=${v.isFirst}>Vorige</button>
        <button type="button" class="btn" onClick=${v.next}>${v.nextLabel}</button>
      </div>
    </main>

    <aside class="summary" aria-label="Bevindingen">
      <div class="sumh"><h3>Bevindingen</h3><button type="button" class="btn ghost small" onClick=${v.copy}>${v.copyLabel}</button></div>
      ${sumRows}
      <div class="concl">${v.conclusion}</div>
      ${v.hasDdx && html`<p class="note" style="margin-top: 8px">${v.ddxCount}</p>`}
    </aside>
  </div>
  <footer class="sitefoot">ECG Stapsgewijs · werkt volledig in de browser; er worden geen gegevens opgeslagen of verstuurd.</footer>
</div>`;
  }
}

render(html`<${App} />`, document.getElementById('root'));

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
