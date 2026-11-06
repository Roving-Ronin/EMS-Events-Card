// EM Forecast Card — compact "Future Decisions" table for sensor.energy_manager_plan
// Logic mirrors em-events-card.js (v3.6.3):
//   - _emec_classifyFuture  → decision labels / row colours
//   - _emec_getPrices       → provider-aware buy/sell (Globird / Flow Power / plan prices)
//   - Globird super-export daily cap blending
//   - Curtailed kW = max(0, PV − (Load + Batt charge + Export))
//   - Cost/Profit  = (Import × Buy − Export × Sell) × interval_h
// Part of https://github.com/Roving-Ronin/EMS-Events-Card (loaded by cards.js)
// Manual install: copy to /config/www/em-forecast-card.js and add resource
// /local/em-forecast-card.js (type: JavaScript module)

const _EMFC_VERSION = 'v1.0.0';

const _EMFC_COLOURS = {
  green:  { bg: '#66ff66', txt: '#333333', cost: '#004400' },
  yellow: { bg: '#ffff80', txt: '#333333', cost: '#333333' },
  teal:   { bg: '#99ffff', txt: '#333333', cost: '#333333' },
  pink:   { bg: '#ffe0e0', txt: '#333333', cost: '#cc3333' },
};

const _EMFC_DECTEXT_KEY = 'em_forecast_card_decision_text';

const _EMFC_DEFAULTS = {
  entity: 'sensor.energy_manager_plan',
  provider_entity: 'input_select.electricity_provider',
  title: '🔮 Future Decisions',
  rows: 10,
  currency_symbol: '$',
  row_colours: true,          // EM Events Card event colours; false = theme colours
  show_curtailed: true,
  show_ev: 'auto',            // true | false | 'auto' (shown only if any EV kW in the rows)
  show_totals: true,
  decision_text: false,       // default Decision style: false = icons only, true = original icon + text labels
  show_decision_toggle: true, // small "Aa" switch beside the title; choice remembered per browser
  buy_decimals: 3,
  sell_decimals: 3,
  grid_threshold_w: 50,       // same defaults as EM Events Card settings
  battery_threshold_w: 100,
  curtail_threshold_w: 100,
  ev_threshold_w: 100,
};

// ── Shared logic (copied from em-events-card.js, renamed to avoid bundle clashes) ──

function _emfc_esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _emfc_timeToMins(s) {
  if (!s) return 0;
  const p = s.split(':');
  return parseInt(p[0]) * 60 + parseInt(p[1]);
}

function _emfc_inWindow(mins, a, b) {
  return a <= b ? (mins >= a && mins < b) : (mins >= a || mins < b);
}

function _emfc_getPrices(ts, provider, hass, rowBuyP, rowSellP) {
  const d = new Date(ts);
  const mins = d.getHours() * 60 + d.getMinutes();
  const st = (e, def) => hass.states[e]?.state || def;
  const num = (e) => parseFloat(hass.states[e]?.state || 0) / 100;

  if (provider === 'Globird') {
    const peakS = _emfc_timeToMins(st('input_datetime.globird_peak_buy_start', '16:00:00'));
    const peakE = _emfc_timeToMins(st('input_datetime.globird_peak_buy_end', '23:00:00'));
    const freeS = _emfc_timeToMins(st('input_datetime.globird_free_buy_start', '11:00:00'));
    const freeE = _emfc_timeToMins(st('input_datetime.globird_free_buy_end', '14:00:00'));
    let buyP;
    if (_emfc_inWindow(mins, peakS, peakE)) buyP = num('input_number.globird_peak_buy_price');
    else if (_emfc_inWindow(mins, freeS, freeE)) buyP = num('input_number.globird_free_buy_price');
    else buyP = num('input_number.globird_other_buy_price');

    const superS = _emfc_timeToMins(st('input_datetime.globird_super_start', '18:00:00'));
    const superE = _emfc_timeToMins(st('input_datetime.globird_super_end', '21:00:00'));
    const stdStart = _emfc_timeToMins(st('input_datetime.globird_std_start', '16:00:00'));
    const stdEnd = _emfc_timeToMins(st('input_datetime.globird_std_end', '21:00:00'));
    const stdSellP = num('input_number.globird_std_sell');
    const otherSellP = num('input_number.globird_other_sell');
    const inSuper = _emfc_inWindow(mins, superS, superE);
    const sellP = inSuper ? num('input_number.globird_super_sell')
      : _emfc_inWindow(mins, stdStart, stdEnd) ? stdSellP : otherSellP;
    return { buyP, sellP, inSuper, stdSellP, otherSellP, mins, stdStart, stdEnd };
  }

  if (provider === 'Flow Power') {
    const buyP = num('input_number.flowpower_buy_price');
    const pS = _emfc_timeToMins(st('input_datetime.flowpower_peak_start_time', '17:30:00'));
    const pE = _emfc_timeToMins(st('input_datetime.flowpower_peak_end_time', '19:30:00'));
    const sellP = _emfc_inWindow(mins, pS, pE)
      ? num('input_number.flowpower_peak_feedin_price')
      : num('input_number.flowpower_offpeak_feedin_price');
    return { buyP, sellP, inSuper: false };
  }

  return { buyP: rowBuyP, sellP: rowSellP, inSuper: false };
}

function _emfc_classify(mode, solarKw, impKw, expKw, battCKw, battDKw, curtail, soc, T) {
  if (mode === 'FORCED_EXPORT') {
    if (solarKw > T && expKw > T) return { label: '🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced export: solar and battery to home and grid', color: 'pink' };
    return { label: '🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced export: battery to home and grid', color: 'yellow' };
  }
  if (mode === 'FORCED_DISCHARGE') {
    if (solarKw > T && expKw > T) return { label: '🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced discharge with solar surplus exporting', color: 'pink' };
    return { label: '🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced discharge: battery to home and grid', color: 'yellow' };
  }
  if (mode === 'FORCED_CHARGE') {
    if (solarKw > T && battCKw > T && expKw > T) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery (Force) + ⚡ Grid', note: 'Forced charge with surplus solar exporting', color: 'green' };
    if (impKw > T) return { label: '⚡ Grid → 🏠 Home + 🔋 Battery (Force)', note: 'Forced charging battery from grid', color: 'pink' };
    if (battCKw > T && solarKw > T) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery (Force)', note: 'Forced charging battery from solar', color: 'green' };
    return { label: '🌞 Solar → 🏠 Home', note: 'Solar covering home — battery full', color: 'green' };
  }
  if (mode === 'SELF_CONSUMPTION') {
    if (solarKw > T && expKw > T && battCKw > T) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery + ⚡ Grid', note: 'Solar covering home, charging battery and exporting', color: 'green' };
    if (solarKw > T && expKw > T) return { label: '🌞 Solar → 🏠 Home + ⚡ Grid', note: 'Solar covering home and exporting surplus', color: 'green' };
    if (solarKw > T && curtail === 100 && battCKw > T && soc < 99) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery', note: 'Solar covering home and charging battery — exports blocked', color: 'green' };
    if (solarKw > T && curtail === 100 && soc >= 99 && battCKw < T) return { label: '🌞 Solar → 🏠 Home (Self Consumption)', note: 'Solar covering home — battery full, exports blocked', color: 'green' };
    if (solarKw > T && curtail === 100 && soc >= 99 && battCKw > T) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery', note: 'Solar covering home with trickle charge — exports blocked', color: 'green' };
    if (solarKw > T && battCKw > T && impKw < T && expKw < T) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery', note: 'Solar covering home and charging battery — no grid', color: 'green' };
    if (solarKw > T && battDKw > T && impKw < T && expKw < T) return { label: '🌞 Solar + 🔋 Battery → 🏠 Home', note: 'Solar and battery together covering home', color: 'teal' };
    if (solarKw > T && impKw < T && expKw < T && battCKw < T && battDKw < T) return { label: '🌞 Solar → 🏠 Home (Self Consumption)', note: 'Solar covering home — no battery, no grid', color: 'green' };
    if (battDKw > T && impKw > T) return { label: '🔋 Battery + ⚡ Grid → 🏠 Home', note: 'Battery discharging but grid also needed', color: 'pink' };
    if (battDKw > T && expKw > T) return { label: '🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced discharge: battery to home and grid', color: 'yellow' };
    if (battDKw > T) return { label: '🔋 Battery → 🏠 Home (Self Consumption)', note: 'Battery powering home — no solar, no grid', color: 'teal' };
    if (battCKw > T && impKw > T) return { label: '⚡ Grid → 🏠 Home + 🔋 Battery (Force)', note: 'Grid charging battery and covering home', color: 'pink' };
    if (impKw > T) return { label: '⚡ Grid → 🏠 Home', note: 'Grid covering home — battery idle', color: 'pink' };
  }
  return null;
}

// Fallback when the plan row has an unrecognised mode (matches the old markdown logic)
function _emfc_classifyFallback(pv, imp, exp, chg, dis) {
  const T = 0.05;
  if (exp > T) return { label: '🏠 Home → ⚡ Grid', color: 'yellow' };
  if (imp > T && chg > T) return { label: '⚡ Grid → 🔋 Battery', color: 'pink' };
  if (pv > T && chg > T) return { label: '🌞 Solar → 🔋 Battery', color: 'green' };
  if (pv > T) return { label: '🌞 Solar → 🏠 Home', color: 'green' };
  if (dis > T) return { label: '🔋 Battery → 🏠 Home', color: 'teal' };
  if (imp > T) return { label: '⚡ Grid → 🏠 Home', color: 'pink' };
  return { label: '⏸️ Standby', color: '' };
}

// Icon-only rendering of a decision label. Full label stays in the tooltip.
// "⚡ Grid" as a source (import) → red import tower; as a destination (export, incl. Surplus PV) → green export tower.
const _EMFC_TOWER_IMP = '<ha-icon class="mdi imp" icon="mdi:transmission-tower-import"></ha-icon>';
const _EMFC_TOWER_EXP = '<ha-icon class="mdi exp" icon="mdi:transmission-tower-export"></ha-icon>';

function _emfc_decisionIcons(label) {
  const forced = /\(Force\)/.test(label);
  const token = (t, isDest) => {
    if (/\bEV\b/.test(t)) return '🚗';                       // before Grid/Surplus: EV mode text can say "Surplus PV"
    if (/\bGrid\b/.test(t)) return isDest ? _EMFC_TOWER_EXP : _EMFC_TOWER_IMP;
    if (/\bSolar\b/.test(t)) return '🌞';
    if (/\bBattery\b/.test(t)) return '🔋';
    if (/\bHome\b/.test(t)) return '🏠';
    const first = t.trim().split(/\s+/)[0] || '';
    return _emfc_esc(first);                                   // e.g. ⏸️ Standby
  };
  const parts = String(label || '').split('→');
  const side = (txt, isDest) => txt.split(' + ').map((t) => t.trim()).filter(Boolean)
    .map((t) => token(t, isDest)).join('<span class="plus">+</span>');
  let html = side(parts[0], false);
  if (parts.length > 1) html += '<span class="arr">→</span>' + side(parts.slice(1).join('→'), true);
  if (forced) html += '<span class="force" title="Forced">💪</span>';
  return html;
}

function _emfc_evModeDesc(mode, readyBy, maxPrice, cur) {
  switch (mode) {
    case 'solar_only': return 'Solar Only';
    case 'solar_preferred': return 'Surplus PV';
    case 'smart_cheapest': return 'Cheapest';
    case 'battery_only': return 'Battery';
    case 'readyby': {
      const t = readyBy ? String(readyBy).slice(0, 5) : '';
      const p = maxPrice != null && maxPrice !== '' ? ' @' + cur + Number(maxPrice).toFixed(2) : '';
      return 'Ready by ' + t + p;
    }
    default: return mode && mode !== 'unknown' ? mode : 'EV';
  }
}

// ── Card ───────────────────────────────────────────────────────────────────────

class EmForecastCard extends HTMLElement {
  setConfig(config) {
    this._config = { ..._EMFC_DEFAULTS, ...(config || {}) };
    this._sig = null;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${EmForecastCard.styles}</style><ha-card><div class="hdr"><div class="tl"><div class="ttl"></div><button class="dtog" type="button">Aa</button></div><div class="tot"></div></div><div class="wrap"></div></ha-card>`;

    // Decision style: saved browser choice wins over the YAML default
    this._decText = !!this._config.decision_text;
    try {
      const saved = localStorage.getItem(_EMFC_DECTEXT_KEY);
      if (saved === '1' || saved === '0') this._decText = saved === '1';
    } catch (e) { /* storage unavailable — use YAML default */ }

    this.shadowRoot.querySelector('.dtog').addEventListener('click', (ev) => {
      ev.stopPropagation();
      this._decText = !this._decText;
      try { localStorage.setItem(_EMFC_DECTEXT_KEY, this._decText ? '1' : '0'); } catch (e) { /* ignore */ }
      this._render();
    });
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const c = this._config;
    const plan = hass.states[c.entity];
    const prov = hass.states[c.provider_entity]?.state;
    const exp = hass.states['sensor.daily_exported_energy']?.state;
    // Re-render only when the plan/provider changes, or a new minute ticks over (past rows drop off)
    const sig = (plan?.last_updated || '') + '|' + prov + '|' + exp + '|' + Math.floor(Date.now() / 60000);
    if (sig === this._sig) return;
    this._sig = sig;
    this._render();
  }

  connectedCallback() {
    this._timer = setInterval(() => { this._sig = null; if (this._hass) this.hass = this._hass; }, 60000);
  }

  disconnectedCallback() { clearInterval(this._timer); }

  _plan() {
    const st = this._hass.states[this._config.entity];
    if (!st) return null;
    let plan = st.attributes.energy_plan;
    if (typeof plan === 'string') { try { plan = JSON.parse(plan); } catch (e) { plan = {}; } }
    return plan && typeof plan === 'object' ? plan : {};
  }

  _render() {
    if (!this.shadowRoot || !this._hass || !this._config) return;
    const c = this._config;
    const cur = _emfc_esc(c.currency_symbol);   // escaped, as in EM Events Card v3.6.2
    const hdr = this.shadowRoot.querySelector('.hdr');
    const wrap = this.shadowRoot.querySelector('.wrap');
    const ttl = hdr.querySelector('.ttl');
    const tot = hdr.querySelector('.tot');
    const tog = hdr.querySelector('.dtog');
    ttl.textContent = c.title || '';
    tot.innerHTML = '';
    const showTog = c.show_decision_toggle !== false;
    tog.style.display = showTog ? '' : 'none';
    tog.classList.toggle('on', this._decText);
    tog.title = this._decText ? 'Decisions: icons + text (click for icons only)' : 'Decisions: icons only (click for icons + text)';
    hdr.style.display = (c.title || c.show_totals !== false || showTog) ? '' : 'none';

    const plan = this._plan();
    if (!plan) { wrap.innerHTML = `<div class="msg">⚠️ ${_emfc_esc(c.entity)} not found</div>`; return; }

    const meta = plan.meta || {};
    const provider = this._hass.states[c.provider_entity]?.state || 'Amber Electric';
    const nowTs = Date.now();
    const rows = (plan.timeline || [])
      .filter((r) => new Date(r.ts).getTime() >= nowTs)
      .slice(0, Math.max(1, parseInt(c.rows) || 10));

    if (!rows.length) { wrap.innerHTML = '<div class="msg">No forecast available.</div>'; return; }

    const gT = c.grid_threshold_w / 1000;
    const bT = c.battery_threshold_w / 1000;
    const cT = c.curtail_threshold_w / 1000;
    const eT = c.ev_threshold_w / 1000;

    // Compute every row first so EV auto-visibility and totals can use the data
    const data = rows.map((r) => {
      const ts = new Date(r.ts).getTime();
      const inp = r.inputs || {}, ex = r.expected || {};
      const stepH = (r.interval_minutes || meta.step_minutes || 30) / 60;
      const pv = Number(inp.pv_kw) || 0;
      const load = Number(inp.load_kw) || 0;
      const soc = Number(inp.soc_pct_start) || 0;
      const imp = Number(ex.grid_import_kw) || 0;
      const exp = Number(ex.grid_export_kw) || 0;
      const chg = Number(ex.battery_charge_kw) || 0;
      const dis = Number(ex.battery_discharge_kw) || 0;
      const curtailPct = r.setpoints?.curtail_pct || 0;

      let { buyP, sellP, inSuper, stdSellP, otherSellP, mins, stdStart, stdEnd } =
        _emfc_getPrices(ts, provider, this._hass, Number(inp.buy_price) || 0, Number(inp.sell_price) || 0);

      // Globird super-export daily cap (same as EM Events Card)
      let capHit = false;
      if (provider === 'Globird' && inSuper && exp > gT) {
        const capKwh = parseFloat(this._hass.states['input_number.globird_super_max_export']?.state || 10);
        const slotKwh = exp * stepH;
        const doneKwh = parseFloat(this._hass.states['sensor.daily_exported_energy']?.state || 0);
        const fallback = _emfc_inWindow(mins, stdStart, stdEnd) ? stdSellP : otherSellP;
        if (doneKwh >= capKwh) { sellP = fallback; capHit = true; }
        else if (doneKwh + slotKwh > capKwh) {
          const sp = capKwh - doneKwh;
          sellP = (sp * sellP + (slotKwh - sp) * fallback) / slotKwh;
          capHit = true;
        }
      }

      const gridKw = exp > gT ? -exp : imp > gT ? imp : 0;
      const battKw = chg > bT ? chg : dis > bT ? -dis : 0;
      const curtailedKw = Math.max(0, pv - (load + chg + exp));
      const evKw = Math.max(0, Number(r.ev?.charge_kw ?? inp.ev_charge_kw) || 0);
      const evActive = !!(inp.ev_active || r.ev?.active);
      const evMode = inp.ev_mode || r.ev?.mode || 'unknown';
      const cost = (imp * buyP - exp * sellP) * stepH;   // +ve = cost, −ve = profit

      let cls = _emfc_classify(r.mode, pv, imp, exp, chg, dis, curtailPct, soc, gT)
        || _emfc_classifyFallback(pv, imp, exp, chg, dis);
      cls = { ...cls };
      if (pv >= load + chg && exp > gT && imp < gT && cls.label.includes('⚡ Grid')) {
        cls.label = cls.label.replace('⚡ Grid', '⚡ Grid (Surplus PV)');
      }
      if (evActive) {
        cls.label += ' + 🚗 EV (' + _emfc_evModeDesc(evMode,
          inp.ev_ready_by_time || r.setpoints?.ev_ready_by_time,
          inp.ev_ready_by_max_price ?? r.setpoints?.ev_ready_by_max_price, cur) + ')';
      }

      return {
        ts, stepH, pv, load, gridKw, battKw, soc, curtailedKw, evKw, buyP, sellP, capHit, cost, cls,
        impKwh: imp * stepH, expKwh: exp * stepH,
        curtailKwh: curtailedKw * stepH, evKwh: evKw * stepH,
      };
    });

    const showCurt = c.show_curtailed !== false;
    const showEv = c.show_ev === 'auto' ? data.some((d) => d.evKw >= eT) : c.show_ev === true;

    const fmt = (v, thr, dp = 2, signed = false) => {
      if (Math.abs(v) < thr) return '<span class="dim">—</span>';
      return (signed && v > 0 ? '+' : '') + v.toFixed(dp);
    };
    const money = (v) => {
      if (v > 0.001) return `<span class="cost">-${cur}${v.toFixed(3)}</span>`;
      if (v < -0.001) return `<span class="profit">${cur}${Math.abs(v).toFixed(3)}</span>`;
      return '<span class="dim">—</span>';
    };
    const price = (v, dp) => (v < 0 ? '-' : '') + cur + Math.abs(v).toFixed(dp);

    // Emojis match the EM Events Card headers; units line underneath
    const th = (emoji, label, unit, cls = '', title = '') =>
      `<th${cls ? ` class="${cls}"` : ''}${title ? ` title="${title}"` : ''}>` +
      `<span class="em">${emoji}</span>${label ? ' ' + label : ''}${unit ? `<br><span class="u">${unit}</span>` : ''}</th>`;
    let head = '<tr>' +
      th('🕐', '', '', '', 'Slot start time') +
      th('🔮', 'Decision', '', 'l') +
      th('💲', 'Buy', '/kWh') +
      th('💲', 'Sell', '/kWh') +
      // Icon-only headers to save width; meaning is in the hover tooltip
      th('🏠', '', 'kW', '', 'Load') +
      th('☀️', '', 'kW', '', 'Solar') +
      th('<ha-icon class="mdi" icon="mdi:transmission-tower"></ha-icon>', '', 'kW', '', 'Grid: Import + / Export −') +
      (showCurt ? th('✂️', '', 'kW', '', 'Curtailed PV') : '') +
      (showEv ? th('🚗', '', 'kW', '', 'EV charging') : '') +
      th('🔋', '', 'kW', '', 'Battery: Charge + / Discharge −') +
      th('🔋', '', '%', '', 'Battery SoC') +
      th('💲', '', '&nbsp;', '', 'Expected cost (red) / profit (green) for the slot') +   // blank units line keeps 💲 level with the other labels
      '</tr>';

    let body = '';
    for (const d of data) {
      const col = c.row_colours ? (_EMFC_COLOURS[d.cls.color] || null) : null;
      const style = col ? ` style="background:${col.bg};color:${col.txt};"` : '';
      const t = new Date(d.ts).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
      body += `<tr${style}>` +
        `<td>${t}</td>` +
        (this._decText
          ? `<td class="l txt" title="${_emfc_esc(d.cls.note || '')}">${_emfc_esc(d.cls.label)}</td>`
          : `<td class="l" title="${_emfc_esc(d.cls.label + (d.cls.note ? ' — ' + d.cls.note : ''))}"><span class="dec">${_emfc_decisionIcons(d.cls.label)}</span></td>`) +
        `<td>${price(d.buyP, c.buy_decimals)}</td>` +
        `<td>${price(d.sellP, c.sell_decimals)}${d.capHit ? ' <span title="Globird super-export cap reached">⚠</span>' : ''}</td>` +
        `<td>${fmt(d.load, 0.005)}</td>` +
        `<td>${fmt(d.pv, 0.005)}</td>` +
        `<td>${fmt(d.gridKw, gT, 2, true)}</td>` +
        (showCurt ? `<td>${fmt(d.curtailedKw, cT)}</td>` : '') +
        (showEv ? `<td>${fmt(d.evKw, eT)}</td>` : '') +
        `<td>${fmt(d.battKw, bT, 2, true)}</td>` +
        `<td>${d.soc.toFixed(0)}</td>` +
        `<td class="money">${money(d.cost)}</td></tr>`;
    }

    let foot = '';
    if (c.show_totals !== false) {   // rendered into the header row, right-aligned
      const sum = (k) => data.reduce((a, d) => a + d[k], 0);
      const totCost = sum('cost');
      const firstT = new Date(data[0].ts);
      const last = data[data.length - 1];
      const lastT = new Date(last.ts + last.stepH * 3600000);
      const hm = (dt) => dt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
      foot =
        `<span>⏱ ${hm(firstT)}–${hm(lastT)}</span>` +
        `<span title="Grid import"><ha-icon class="mdi imp" icon="mdi:transmission-tower-import"></ha-icon><b>${sum('impKwh').toFixed(2)}</b> kWh</span>` +
        `<span title="Grid export"><ha-icon class="mdi exp" icon="mdi:transmission-tower-export"></ha-icon><b>${sum('expKwh').toFixed(2)}</b> kWh</span>` +
        (showCurt ? `<span title="Curtailed PV">✂️ <b>${sum('curtailKwh').toFixed(2)}</b> kWh</span>` : '') +
        (showEv ? `<span title="EV charging">🚗 <b>${sum('evKwh').toFixed(2)}</b> kWh</span>` : '') +
        `<span title="Net ${totCost < -0.001 ? 'profit' : 'cost'}">💲 <b>${money(totCost)}</b></span>`;
    }

    tot.innerHTML = foot;
    wrap.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  getCardSize() { return 2 + Math.ceil((parseInt(this._config?.rows) || 10) / 2); }

  static getStubConfig() { return { rows: 10 }; }

  static get styles() {
    return `
      ha-card { padding: 8px 10px 10px; overflow: hidden; }
      .hdr { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 4px 16px; padding: 4px 2px 8px; margin-bottom: 4px; border-bottom: 1px solid rgba(200, 200, 200, 0.45); }
      .tl { display: flex; align-items: center; gap: 8px; }
      .ttl { font-size: 16px; font-weight: 600; white-space: nowrap; }
      .dtog { font: inherit; font-size: 10px; font-weight: 600; line-height: 1; padding: 2px 5px; border-radius: 4px; cursor: pointer;
              background: transparent; color: var(--secondary-text-color); border: 1px solid var(--divider-color); opacity: 0.6; }
      .dtog:hover { opacity: 1; }
      .dtog.on { opacity: 1; color: var(--primary-color); border-color: var(--primary-color); }
      .wrap { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; font-variant-numeric: tabular-nums; }
      th { font-weight: 600; text-align: right; padding: 4px 6px; border-bottom: 1px solid var(--divider-color); white-space: nowrap; }
      td { text-align: right; padding: 3px 6px; white-space: nowrap; border-bottom: 1px solid rgba(127,127,127,0.15); }
      th { vertical-align: bottom; line-height: 1.25; }
      th .u { font-weight: 400; font-size: 10px; opacity: 0.65; }
      th:first-child, td:first-child { text-align: left; }
      .l { text-align: left; white-space: nowrap; }
      .l.txt { white-space: normal; min-width: 170px; }   /* original text labels can wrap */
      .dec { display: inline-flex; align-items: center; gap: 2px; }
      .dec .arr { opacity: 0.7; padding: 0 3px; }
      .dec .plus { opacity: 0.55; font-size: 10px; padding: 0 1px; }
      .dec .force { padding-left: 4px; }
      .dec ha-icon.mdi { vertical-align: baseline; display: inline-flex; }
      th, th:first-child, th.l { text-align: center; }   /* headers centred; data cells keep their alignment */
      .dim { opacity: 0.45; }
      .money { font-weight: 700; }
      .cost { color: #f44336; }
      .profit { color: #2e7d32; }
      tr[style] .profit { color: #004400; }
      tr[style] .cost { color: #cc3333; }
      .tot { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px 14px; margin-left: auto; font-size: 12px; font-weight: 400; }
      .tot span { white-space: nowrap; }
      .tot > span { display: inline-flex; align-items: center; gap: 4px; }
      ha-icon.mdi { --mdc-icon-size: 16px; vertical-align: -3px; color: #ff9800; }
      ha-icon.mdi.imp { color: #f44336; }
      ha-icon.mdi.exp { color: #4caf50; }
      tr[style] ha-icon.mdi.imp { color: #c62828; }   /* darker on EM row tints for contrast */
      tr[style] ha-icon.mdi.exp { color: #1b5e20; }
      .tot ha-icon.mdi { vertical-align: baseline; display: inline-flex; }   /* flex-centred on the kWh text */
      .msg { padding: 8px; opacity: 0.8; }
    `;
  }
}

if (!customElements.get('em-forecast-card')) {
  customElements.define('em-forecast-card', EmForecastCard);
}
window.customCards = window.customCards || [];
if (!window.customCards.find((x) => x.type === 'em-forecast-card')) {
  window.customCards.push({
    type: 'em-forecast-card',
    name: 'EM Forecast Card',
    description: 'Compact next-N-slots decisions table from sensor.energy_manager_plan with curtailment and cost/profit',
  });
}
console.info(`%c EM-FORECAST-CARD %c ${_EMFC_VERSION} `, 'background:#4caf50;color:#fff', 'background:#333;color:#fff');
