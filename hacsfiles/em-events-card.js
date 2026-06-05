// EM Events Card — STATE-WATCH + MULTI-PROVIDER (Globird/Amber/Local Volts/Flow Power)
// Combines Future Decisions (timeline) and Past Events (history) in one card
// Supports: Amber Electric, Local Volts, Globird, Flow Power
// Requires: sensor.energy_manager_plan + inverter sensors
// Watches: automation.update_energy_manager_decision_sensor for updates
// Copy to /config/www/em-events-card.js
// Add resource: /local/em-events-card.js (type: JavaScript module)

const _EMEC_VERSION = 'v2.8.4';

let _EMEC_CUR = '$';

const _EMEC_SENSORS = [
  'sensor.energy_manager_decision',
  'automation.update_energy_manager_decision_sensor',
  'sensor.inverter_pv_power',
  'sensor.inverter_load_power',
  'sensor.inverter_import_power',
  'sensor.inverter_export_power',
  'sensor.inverter_battery_charging_power',
  'sensor.inverter_battery_discharging_power',
  'sensor.inverter_battery_level',
  'sensor.nodered_buyprice',
  'sensor.nodered_sellprice',
  'sensor.monthly_imported_energy',
  'sensor.monthly_exported_energy',
  'sensor.monthly_solar_generation',
  'sensor.monthly_battery_charge',
  'sensor.monthly_battery_discharge',
  'sensor.daily_consumed_energy',
  'sensor.daily_exported_energy',
];

const _EMEC_COLOURS = {
  green:  { bg: '#66ff66', txt: '#333333', cost: '#004400' },
  yellow: { bg: '#ffff80', txt: '#333333', cost: '#333333' },
  teal:   { bg: '#99ffff', txt: '#333333', cost: '#333333' },
  pink:   { bg: '#ffe0e0', txt: '#333333', cost: '#cc3333' },
};


const _EMEC_COLGROUP =
  '<colgroup>' +
  '<col style="width:52px;">' +
  '<col style="width:auto; min-width:154px;">' +
  '<col style="width:68px;">' +
  '<col style="width:68px;">' +
  '<col style="width:54px;">' +
  '<col style="width:56px;">' +
  '<col style="width:54px;">' +
  '<col style="width:56px;">' +
  '<col style="width:54px;">' +
  '<col style="width:56px;">' +
  '<col style="width:54px;">' +
  '<col style="width:56px;">' +
  '<col style="width:56px;">' +
  '<col style="width:72px;">' +
  '</colgroup>';

function _emec_classifyFuture(mode, solarKw, impKw, expKw, battCKw, battDKw, curtail, soc, gridThreshold) {
  const T = gridThreshold;
  if (mode === 'FORCED_EXPORT') {
    if (solarKw > T && expKw > T) return { label: '🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced export: solar and battery to home and grid', color: 'pink' };
    return                            { label: '🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced export: battery to home and grid', color: 'yellow' };
  }
  if (mode === 'FORCED_DISCHARGE') {
    if (solarKw > T && expKw > T) return { label: '🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced discharge: solar and battery to home and grid', color: 'pink' };
    return                            { label: '🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced discharge: battery to home and grid', color: 'yellow' };
  }
  if (mode === 'FORCED_CHARGE') {
    if (impKw > T)               return { label: '⚡ Grid → 🏠 Home + 🔋 Battery (Force)', note: 'Forced grid charging — cheap rate window', color: 'pink' };
    if (battCKw > T && solarKw > T) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery', note: 'Solar covering home and charging battery', color: 'green' };
    return                              { label: '🌞 Solar → 🏠 Home (Self Consumption)', note: 'Solar covering home — battery full', color: 'green' };
  }
  if (mode === 'SELF_CONSUMPTION') {
    if (solarKw > T && expKw > T && battCKw > T) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery + ⚡ Grid', note: 'Solar covering home, charging battery and exporting', color: 'green' };
    if (solarKw > T && expKw > T)               return { label: '🌞 Solar → 🏠 Home + ⚡ Grid', note: 'Solar covering home and exporting surplus', color: 'green' };
    if (solarKw > T && curtail === 100 && battCKw > T && soc < 99) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery', note: 'Solar covering home and charging battery — exports blocked', color: 'green' };
    if (solarKw > T && curtail === 100 && soc >= 99 && battCKw < T) return { label: '🌞 Solar → 🏠 Home (Self Consumption)', note: 'Solar covering home — battery full, exports blocked', color: 'green' };
    if (solarKw > T && curtail === 100 && soc >= 99 && battCKw > T) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery', note: 'Solar covering home with trickle charge — exports blocked', color: 'green' };
    if (solarKw > T && battCKw > T && impKw < T && expKw < T) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery', note: 'Solar covering home and charging battery — no grid', color: 'green' };
    if (solarKw > T && battDKw > T && impKw < T) return { label: '🌞 Solar + 🔋 Battery → 🏠 Home', note: 'Solar and battery together covering home', color: 'teal' };
    if (solarKw > T && impKw < T && expKw < T && battCKw < T && battDKw < T) return { label: '🌞 Solar → 🏠 Home (Self Consumption)', note: 'Solar covering home — no battery, no grid', color: 'green' };
    if (battDKw > T && impKw > T) return { label: '🔋 Battery + ⚡ Grid → 🏠 Home', note: 'Battery discharging but grid also needed', color: 'pink' };
    if (battDKw > T && expKw > T) return { label: '🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced discharge: battery to home and grid', color: 'yellow' };
    if (battDKw > T)              return { label: '🔋 Battery → 🏠 Home (Self Consumption)', note: 'Battery powering home — no solar, no grid', color: 'teal' };
    if (battCKw > T && impKw > T) return { label: '⚡ Grid → 🏠 Home + 🔋 Battery (Force)', note: 'Grid charging battery and covering home', color: 'pink' };
    if (impKw > T)                return { label: '⚡ Grid → 🏠 Home', note: 'Grid covering home — battery idle', color: 'pink' };
    return null;
  }
  return null;
}

function _emec_classifyPast(solar, gridImp, gridExp, battC, battD, gridThreshold) {
  const T = gridThreshold;
  if (solar > T && gridExp > T && battD > T) return { label: '🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force)', color: 'pink' };
  if (solar > T && gridExp > T && battC > T) return { label: '🌞 Solar → 🏠 Home + 🔋 Battery + ⚡ Grid', color: 'green' };
  if (solar > T && gridExp > T)              return { label: '🌞 Solar → 🏠 Home + ⚡ Grid', color: 'green' };
  if (battD > T && gridExp > T)              return { label: '🔋 Battery → 🏠 Home + ⚡ Grid (Force)', color: 'yellow' };
  if (solar > T && gridImp > T && battC > T) return { label: '🌞 Solar + ⚡ Grid → 🏠 Home + 🔋 Battery (Force)', color: 'pink' };
  if (solar > T && gridImp > T)              return { label: '🌞 Solar + ⚡ Grid → 🏠 Home', color: 'pink' };
  if (solar > T && battC > T)                return { label: '🌞 Solar → 🏠 Home + 🔋 Battery', color: 'green' };
  if (solar > T && battD > T)                return { label: '🌞 Solar + 🔋 Battery → 🏠 Home', color: 'teal' };
  if (solar > T)                             return { label: '🌞 Solar → 🏠 Home (Self Consumption)', color: 'green' };
  if (battD > T && gridImp > T)             return { label: '🔋 Battery + ⚡ Grid → 🏠 Home', color: 'pink' };
  if (battD > T)                             return { label: '🔋 Battery → 🏠 Home (Self Consumption)', color: 'teal' };
  if (gridImp > T && battC > T)             return { label: '⚡ Grid → 🏠 Home + 🔋 Battery (Force)', color: 'pink' };
  if (gridImp > T)                           return { label: '⚡ Grid → 🏠 Home', color: 'pink' };
  return { label: '—', color: '' };
}

function _emec_fmtP(v) {
  return (v < 0 ? '-' : '') + _EMEC_CUR + Math.abs(v).toFixed(4);
}

function _emec_fmtCost(cost) {
  if (cost > 0.0001)  return { disp: '-' + _EMEC_CUR + cost.toFixed(3),           col: null };
  if (cost < -0.0001) return { disp: _EMEC_CUR  + Math.abs(cost).toFixed(3), col: '#4caf50' };
  return { disp: '—', col: null };
}

function _emec_timeToMins(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function _emec_tsToMins(ts) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

function _emec_inWindow(mins, startMins, endMins) {
  if (startMins <= endMins) {
    return mins >= startMins && mins < endMins;
  } else {
    return mins >= startMins || mins < endMins;
  }
}

function _emec_getPrices(ts, provider, hass, rowBuyP, rowSellP) {
  const mins = _emec_tsToMins(ts);

  if (provider === 'Globird') {
    const peakBuyStart = _emec_timeToMins(hass.states['input_datetime.globird_peak_buy_start']?.state || '16:00:00');
    const peakBuyEnd   = _emec_timeToMins(hass.states['input_datetime.globird_peak_buy_end']?.state   || '23:00:00');
    const freeBuyStart = _emec_timeToMins(hass.states['input_datetime.globird_free_buy_start']?.state  || '11:00:00');
    const freeBuyEnd   = _emec_timeToMins(hass.states['input_datetime.globird_free_buy_end']?.state    || '14:00:00');

    const peakBuyP  = parseFloat(hass.states['input_number.globird_peak_buy_price']?.state  || 0) / 100;
    const freeBuyP  = parseFloat(hass.states['input_number.globird_free_buy_price']?.state  || 0) / 100;
    const otherBuyP = parseFloat(hass.states['input_number.globird_other_buy_price']?.state || 0) / 100;

    let buyP;
    if (_emec_inWindow(mins, peakBuyStart, peakBuyEnd)) {
      buyP = peakBuyP;
    } else if (_emec_inWindow(mins, freeBuyStart, freeBuyEnd)) {
      buyP = freeBuyP;
    } else {
      buyP = otherBuyP;
    }

    const superStart = _emec_timeToMins(hass.states['input_datetime.globird_super_start']?.state || '18:00:00');
    const superEnd   = _emec_timeToMins(hass.states['input_datetime.globird_super_end']?.state   || '21:00:00');
    const stdStart   = _emec_timeToMins(hass.states['input_datetime.globird_std_start']?.state   || '16:00:00');
    const stdEnd     = _emec_timeToMins(hass.states['input_datetime.globird_std_end']?.state     || '21:00:00');

    const superSellP = parseFloat(hass.states['input_number.globird_super_sell']?.state || 0) / 100;
    const stdSellP   = parseFloat(hass.states['input_number.globird_std_sell']?.state   || 0) / 100;
    const otherSellP = parseFloat(hass.states['input_number.globird_other_sell']?.state || 0) / 100;

    const inSuper = _emec_inWindow(mins, superStart, superEnd);

    let sellP;
    if (inSuper) {
      sellP = superSellP;
    } else if (_emec_inWindow(mins, stdStart, stdEnd)) {
      sellP = stdSellP;
    } else {
      sellP = otherSellP;
    }

    return { buyP, sellP, inSuper, stdSellP, otherSellP, mins, stdStart, stdEnd };

  } else if (provider === 'Flow Power') {
    const buyP = parseFloat(hass.states['input_number.flowpower_buy_price']?.state || 0) / 100;
    const peakStart = _emec_timeToMins(hass.states['input_datetime.flowpower_peak_start_time']?.state || '17:30:00');
    const peakEnd   = _emec_timeToMins(hass.states['input_datetime.flowpower_peak_end_time']?.state   || '19:30:00');
    const peakSellP = parseFloat(hass.states['input_number.flowpower_peak_feedin_price']?.state    || 0) / 100;
    const offSellP  = parseFloat(hass.states['input_number.flowpower_offpeak_feedin_price']?.state || 0) / 100;
    const sellP = _emec_inWindow(mins, peakStart, peakEnd) ? peakSellP : offSellP;
    return { buyP, sellP, inSuper: false };

  } else {
    return { buyP: rowBuyP, sellP: rowSellP, inSuper: false };
  }
}

function _emec_getAt(arr, ts) {
  if (!arr || !arr.length) return null;
  let lo = 0, hi = arr.length - 1, best = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].t <= ts) { best = arr[mid].s; lo = mid + 1; }
    else hi = mid - 1;
  }
  return best;
}

function _emec_getDelta(arr, ts, prevTs) {
  if (!arr || !arr.length) return null;
  const curr = parseFloat(_emec_getAt(arr, ts));
  const prev = parseFloat(_emec_getAt(arr, prevTs));
  if (isNaN(curr) || isNaN(prev)) return null;
  const delta = curr - prev;
  return delta < -0.01 ? 0 : delta;
}

function _emec_fmtKwh(kwh) {
  if (kwh === null || kwh === undefined) return '';
  if (kwh < 0.001) return '';
  if (kwh < 0.1)   return ' (' + (kwh * 1000).toFixed(0) + 'Wh)';
  return ' (' + kwh.toFixed(3) + 'kWh)';
}

function _emec_buildLegend() {
  return '<div class="leg" style="font-size:11px;margin-top:12px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;font-weight:bold;">' +
    '<button id="view-legend-btn" style="background:#000099;color:#fff;border:none;cursor:pointer;padding:4px 12px;border-radius:12px;font-weight:bold;font-size:11px;">View Legend</button>' +
    '<span style="display:flex;align-items:center;gap:10px;margin-left:auto;">' +
    '<span class="pill" style="background:#555;font-size:10px;" id="provider-pill">⚡ ...</span>' +
    '<button id="settings-btn" style="background:none;border:none;cursor:pointer;color:var(--primary-text-color);font-size:14px;padding:0;title=Settings;" title="Settings">⚙️ Settings</button>' +
    '<span style="color:var(--secondary-text-color);font-size:10px;font-weight:normal;">' + _EMEC_VERSION + '</span>' +
    '</span>' +
    '</div>' +
    '<div id="legend-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:1000;justify-content:center;align-items:center;padding:20px;">' +
    '<div style="background:var(--card-background-color,#1c1c1c);border-radius:8px;padding:20px;max-width:700px;max-height:80vh;overflow-y:auto;color:var(--primary-text-color);box-shadow:0 4px 20px rgba(0,0,0,0.5);">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
    '<h2 style="margin:0;font-size:16px;">Event Legend</h2>' +
    '<button id="close-legend-btn" style="background:none;border:none;color:var(--primary-text-color);font-size:24px;cursor:pointer;padding:0;width:32px;height:32px;">✕</button>' +
    '</div>' +
    '<div style="margin-bottom:16px;padding:8px;background:rgba(33,150,243,0.1);border-radius:4px;">' +
    '<strong style="font-size:12px;">Filter by:</strong>' +
    '<div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div>' +
    '<div style="font-size:10px;color:var(--secondary-text-color);margin-bottom:4px;font-weight:bold;">Power Source</div>' +
    '<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;">' +
    '<input type="checkbox" id="filter-solar" class="legend-filter" checked> <span>☀️ Solar</span>' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;">' +
    '<input type="checkbox" id="filter-battery" class="legend-filter" checked> <span>🔋 Battery</span>' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
    '<input type="checkbox" id="filter-grid" class="legend-filter" checked> <span>⚡ Grid</span>' +
    '</label>' +
    '</div>' +
    '<div>' +
    '<div style="font-size:10px;color:var(--secondary-text-color);margin-bottom:4px;font-weight:bold;">Category</div>' +
    '<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;">' +
    '<input type="checkbox" id="filter-self" class="legend-filter-cat" checked> <span>Self Consumption</span>' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;">' +
    '<input type="checkbox" id="filter-profit" class="legend-filter-cat" checked> <span>Profit</span>' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
    '<input type="checkbox" id="filter-cost" class="legend-filter-cat" checked> <span>Cost</span>' +
    '</label>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div id="legend-items" style="font-size:10px;line-height:1.6;"></div>' +
    '</div>' +
    '</div>' +
    '</div>';
}

const _EMEC_STYLE = [
  ':host { display: block; }',
  '.card { padding: 8px 12px; font-family: var(--primary-font-family, sans-serif); font-size: 12px; }',
  '.dt { border-collapse: collapse; width: 100%; table-layout: fixed; }',
  '.dt th, .dt td { padding: 4px 6px; border-bottom: 1px solid var(--divider-color,#444); font-size: 12px; line-height: 1.3; white-space: nowrap; text-align: right; }',
  '.dt td { padding-right: 8px; }',
  '.dt th:nth-child(1) { text-align: left; box-shadow: inset -1px 0 0 #555; }',
  '.dt td:nth-child(1) { text-align: left !important; box-shadow: inset -1px 0 0 #555; }',
  '.dt td:nth-child(2) { text-align: left; white-space: normal; box-shadow: inset -1px 0 0 #555; }',
  '.dt th:nth-child(2) { white-space: normal; box-shadow: inset -1px 0 0 #555; }',
  '.dt thead { background-color: var(--card-background-color,#1c1c1c); }',
  '.dt thead th { background-color: var(--card-background-color,#1c1c1c); font-weight: bold; color: var(--primary-text-color); border-bottom: 1px solid #666; }',
  '.dt thead tr:last-child th { border-bottom: 2px solid #888; }',
  '.tabs { display: flex; gap: 0; border-bottom: 2px solid var(--divider-color,#444); margin-bottom: 10px; align-items: stretch; }',
  '.tab { padding: 6px 18px; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--secondary-text-color); border-bottom: 3px solid transparent; margin-bottom: -2px; }',
  '.tab.active { color: #2196F3; border-bottom-color: #2196F3; background: rgba(33,150,243,0.07); }',
  '.sbar { display: flex; gap: 14px; align-items: center; padding: 4px 0 8px 0; font-size: 12px; flex-wrap: wrap; width: 100%; margin-bottom: 0; }',
  '.pill { padding: 2px 8px; border-radius: 10px; font-weight: bold; font-size: 11px; color: #fff; }',
  '.stxt { color: var(--secondary-text-color); font-size: 11px; }',
  '.wrap { overflow-y: auto; width: 100%; }',
  '.pane { display: none; }',
  '.pane.active { display: block; }',
  '.bgl { box-shadow: inset 2px 0 0 #666; }',
  '.bgi { box-shadow: inset 1px 0 0 #555; }',
  '.dt td:nth-child(4), .dt th:nth-child(4) { box-shadow: inset 2px 0 0 #666; }',
  '.dr td { background: var(--secondary-background-color); font-weight: bold; text-align: left !important; padding: 5px 6px; }',
  '.dr td.bgi, .dr td.bgl { text-align: right !important; }',
  '.dr td:nth-child(4) { box-shadow: inset 2px 0 0 #666; }',
  '.msg { padding: 20px; text-align: center; color: var(--secondary-text-color); }',
  '.err { padding: 10px; color: #f44336; }',
].join('\n');

function _emec_buildHTML() {
  return '<style>' + _EMEC_STYLE + '</style>' +
    '<ha-card><div class="card">' +
    '<div class="tabs">' +
    '<div style="display:flex;gap:0;align-items:stretch;">' +
    '<div class="tab active" id="tab-future">📅 Future Decisions</div>' +
    '<div class="tab" id="tab-past">📋 Past Events</div>' +
    '</div>' +
    '<div id="em-decision-badge" style="margin-left:auto;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--secondary-text-color);padding-right:12px;">' +
    '</div>' +
    '<span id="range-past-wrap" style="display:none;padding-right:12px;">' +
    '<select id="range-past" style="font-size:11px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;padding:2px 6px;cursor:pointer;">' +
    '<option value="today">Today</option>' +
    '<option value="yesterday">Yesterday</option>' +
    '<option value="24">Last 24h</option>' +
    '<option value="48">Last 48h</option>' +
    '<option value="72">Last 72h</option>' +
    '<option value="96">Last 96h</option>' +
    '<option value="168">Last 7 days</option>' +
    '</select></span>' +
    '</div>' +
    '<div class="pane active" id="pane-future">' +
    '<div id="tab-alerts" class="sbar" style="border-bottom: none;"></div>' +
    '<div class="sbar" id="sbar-future">⏳ Loading...</div>' +
    '<div class="sbar" id="finances-bar-future" style="border-bottom: 2px solid #888;">⏳ Loading...</div>' +
    '<table class="dt dt-head" style="margin-bottom:0;">' +
    _EMEC_COLGROUP +
    '<thead>' +
    '<tr>' +
    '<th rowspan="2" style="text-align:left;vertical-align:bottom;">Time</th>' +
    '<th rowspan="2" style="text-align:center;vertical-align:bottom;"><span style="font-size:2.0em;">🔮</span> Planned Future Decisions</th>' +
    '<th rowspan="2" style="text-align:center;vertical-align:bottom;box-shadow:inset 2px 0 0 #666;">Buy<br>💲/kWh</th>' +
    '<th rowspan="2" style="text-align:center;vertical-align:bottom;box-shadow:inset 1px 0 0 #555;">Sell<br>💲/kWh</th>' +
    '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">🏠 Base Load</th>' +
    '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">☀️ Solar</th>' +
    '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">⚡ Grid</th>' +
    '<th colspan="3" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">🔋 Battery</th>' +
    '<th rowspan="2" style="text-align:center;vertical-align:bottom;box-shadow:inset 2px 0 0 #666;">Cost/<br>Profit</th>' +
    '</tr>' +
    '<tr>' +
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;">kW</th>' +
    '<th class="bgi" style="text-align:right;">kWh</th>' +
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;">kW</th>' +
    '<th class="bgi" style="text-align:right;">kWh</th>' +
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;">kW</th>' +
    '<th class="bgi" style="text-align:right;">kWh</th>' +
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;">kW</th>' +
    '<th class="bgi" style="text-align:right;">kWh</th>' +
    '<th class="bgi" style="text-align:right;">SoC %</th>' +
    '</tr>' +
    '</thead>' +
    '</table>' +
    '<div class="wrap"><table class="dt">' +
    _EMEC_COLGROUP +
    '<tbody id="tb-future"><tr><td colspan="14" class="msg">⏳ Loading...</td></tr></tbody>' +
    '</table></div>' +
    '</div>' +
    '<div class="pane" id="pane-past">' +
    '<div class="sbar">' +
    '<strong style="color:var(--primary-text-color);">Past Events</strong>' +
    '<span class="stxt" id="st-past">Loading...</span>' +
    '<span style="margin:0 auto;font-size:inherit;color:#ff3333;font-weight:600;">📝 Note: Shows recorded sensor values for your inverter/battery system, not Energy Manager decisions</span>' +
    '</div>' +
    '<table class="dt dt-head" style="margin-bottom:0;border-top:2px solid #888;">' +
    _EMEC_COLGROUP +
    '<thead>' +
    '<tr>' +
    '<th rowspan="2" style="text-align:left;vertical-align:bottom;">Time</th>' +
    '<th rowspan="2" style="text-align:center;vertical-align:bottom;"><span style="font-size:2.0em;">🔎</span> Historical Past Events</th>' +
    '<th rowspan="2" style="text-align:center;vertical-align:bottom;box-shadow:inset 2px 0 0 #666;">Buy<br>💲/kWh</th>' +
    '<th rowspan="2" style="text-align:center;vertical-align:bottom;box-shadow:inset 1px 0 0 #555;">Sell<br>💲/kWh</th>' +
    '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">🏠 Base Load</th>' +
    '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">☀️ Solar</th>' +
    '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">⚡ Grid</th>' +
    '<th colspan="3" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">🔋 Battery</th>' +
    '<th rowspan="2" style="text-align:center;vertical-align:bottom;box-shadow:inset 2px 0 0 #666;">Cost/<br>Profit</th>' +
    '</tr>' +
    '<tr>' +
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;">kW</th>' +
    '<th class="bgi" style="text-align:right;">kWh</th>' +
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;">kW</th>' +
    '<th class="bgi" style="text-align:right;">kWh</th>' +
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;">kW</th>' +
    '<th class="bgi" style="text-align:right;">kWh</th>' +
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;">kW</th>' +
    '<th class="bgi" style="text-align:right;">kWh</th>' +
    '<th class="bgi" style="text-align:right;">SoC %</th>' +
    '</tr>' +
    '</thead>' +
    '</table>' +
    '<div class="wrap"><table class="dt">' +
    _EMEC_COLGROUP +
    '<tbody id="tb-past"><tr><td colspan="14" class="msg">⏳ Select range to load...</td></tr></tbody>' +
    '</table></div>' +
    '</div>' +
    _emec_buildLegend() +
    '</div>' +
    // Settings Modal
    '<div id="settings-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:1001;justify-content:center;align-items:center;padding:20px;">' +
    '<div style="background:var(--card-background-color,#1c1c1c);border-radius:8px;padding:20px;max-width:800px;width:90%;max-height:80vh;overflow-y:auto;color:var(--primary-text-color);box-shadow:0 4px 20px rgba(0,0,0,0.5);display:flex;flex-direction:column;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--divider-color);padding-bottom:12px;">' +
    '<h2 style="margin:0;font-size:16px;">Card Settings</h2>' +
    '<button id="close-settings-btn" style="background:none;border:none;color:var(--primary-text-color);font-size:24px;cursor:pointer;padding:0;width:32px;height:32px;">✕</button>' +
    '</div>' +
    '<div style="display:flex;border-bottom:1px solid var(--divider-color);gap:4px;margin-bottom:16px;">' +
    '<button class="settings-tab-btn active" data-tab="display-thresholds" style="flex:1;padding:12px;background:transparent;border:none;border-bottom:3px solid transparent;color:var(--primary-text-color);cursor:pointer;font-weight:600;font-size:13px;">Display Thresholds</button>' +
    '<button class="settings-tab-btn" data-tab="colours" style="flex:1;padding:12px;background:transparent;border:none;border-bottom:3px solid transparent;color:var(--secondary-text-color);cursor:pointer;font-weight:600;font-size:13px;">Colours</button>' +
    '<button class="settings-tab-btn" data-tab="backup" style="flex:1;padding:12px;background:transparent;border:none;border-bottom:3px solid transparent;color:var(--secondary-text-color);cursor:pointer;font-weight:600;font-size:13px;">Backup</button>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;margin-bottom:16px;">' +
    // Display Thresholds Tab
    '<div id="tab-display-thresholds" class="settings-tab-content active" style="display:block;">' +
    '<div style="margin-bottom:16px;">' +
    '<p style="margin:0 0 12px 0;color:var(--secondary-text-color);font-size:12px;">Configure power thresholds for each column type. Energy thresholds (kWh) are calculated automatically.</p>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:120px 100px 150px;gap:12px;align-items:center;font-weight:bold;font-size:12px;margin-bottom:12px;padding-bottom:12px;border-bottom:2px solid var(--divider-color);">' +
    '<div>Column Type</div>' +
    '<div style="text-align:center;">Filter (W)</div>' +
    '<div style="text-align:center;">Calculated kWh</div>' +
    '</div>' +
    // Load row
    '<div style="display:grid;grid-template-columns:120px 100px 150px;gap:12px;align-items:center;padding:12px;background:rgba(255,255,255,0.02);border-radius:4px;">' +
    '<label style="font-weight:600;font-size:13px;">🏠 Base Load</label>' +
    '<div style="display:flex;flex-direction:column;gap:4px;">' +
    '<input type="number" id="settings-load-threshold" min="0" step="1" value="5" style="padding:6px;font-size:12px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="font-size:10px;color:var(--secondary-text-color);text-align:center;">Default: 5 W</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:var(--primary-text-color);">' +
    '<div style="text-align:center;"><strong>5min:</strong><br><span id="load-kwh-5min">0.00042</span></div>' +
    '<div style="text-align:center;"><strong>30min:</strong><br><span id="load-kwh-30min">0.0025</span></div>' +
    '</div>' +
    '</div>' +
    // PV row
    '<div style="display:grid;grid-template-columns:120px 100px 150px;gap:12px;align-items:center;padding:12px;background:rgba(255,255,255,0.02);border-radius:4px;">' +
    '<label style="font-weight:600;font-size:13px;">☀️ Solar</label>' +
    '<div style="display:flex;flex-direction:column;gap:4px;">' +
    '<input type="number" id="settings-solar-threshold" min="0" step="1" value="5" style="padding:6px;font-size:12px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="font-size:10px;color:var(--secondary-text-color);text-align:center;">Default: 5 W</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:var(--primary-text-color);">' +
    '<div style="text-align:center;"><strong>5min:</strong><br><span id="solar-kwh-5min">0.00042</span></div>' +
    '<div style="text-align:center;"><strong>30min:</strong><br><span id="solar-kwh-30min">0.0025</span></div>' +
    '</div>' +
    '</div>' +
    // Grid row
    '<div style="display:grid;grid-template-columns:120px 100px 150px;gap:12px;align-items:center;padding:12px;background:rgba(255,255,255,0.02);border-radius:4px;">' +
    '<label style="font-weight:600;font-size:13px;">⚡ Grid</label>' +
    '<div style="display:flex;flex-direction:column;gap:4px;">' +
    '<input type="number" id="settings-grid-threshold" min="0" step="1" value="10" style="padding:6px;font-size:12px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="font-size:10px;color:var(--secondary-text-color);text-align:center;">Default: 10 W</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:var(--primary-text-color);">' +
    '<div style="text-align:center;"><strong>5min:</strong><br><span id="grid-kwh-5min">0.00083</span></div>' +
    '<div style="text-align:center;"><strong>30min:</strong><br><span id="grid-kwh-30min">0.005</span></div>' +
    '</div>' +
    '</div>' +
    // Battery row
    '<div style="display:grid;grid-template-columns:120px 100px 150px;gap:12px;align-items:center;padding:12px;background:rgba(255,255,255,0.02);border-radius:4px;">' +
    '<label style="font-weight:600;font-size:13px;">🔋 Battery</label>' +
    '<div style="display:flex;flex-direction:column;gap:4px;">' +
    '<input type="number" id="settings-battery-threshold" min="0" step="1" value="10" style="padding:6px;font-size:12px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="font-size:10px;color:var(--secondary-text-color);text-align:center;">Default: 10 W</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:var(--primary-text-color);">' +
    '<div style="text-align:center;"><strong>5min:</strong><br><span id="battery-kwh-5min">0.00083</span></div>' +
    '<div style="text-align:center;"><strong>30min:</strong><br><span id="battery-kwh-30min">0.005</span></div>' +
    '</div>' +
    '</div>' +
    // Decimal Places row
    '<div style="display:grid;grid-template-columns:120px 100px 150px;gap:12px;align-items:center;padding:12px;background:rgba(255,255,255,0.02);border-radius:4px;">' +
    '<label style="font-weight:600;font-size:13px;">💲 Price Decimals</label>' +
    '<div style="display:flex;flex-direction:column;gap:4px;">' +
    '<select id="settings-price-decimals" style="padding:6px;font-size:12px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;">' +
    '<option value="2">2 places</option>' +
    '<option value="3" selected>3 places</option>' +
    '<option value="4">4 places</option>' +
    '<option value="5">5 places</option>' +
    '</select>' +
    '<div style="font-size:10px;color:var(--secondary-text-color);text-align:center;">Default: 3</div>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--primary-text-color);text-align:center;padding:8px;background:rgba(0,0,0,0.2);border-radius:4px;">Example: 0.352</div>' +
    '</div>' +
    '</div>' +
    // Other empty tabs
    '<div id="tab-colours" class="settings-tab-content" style="display:none;">' +
    '<div style="font-size:12px;margin-bottom:12px;color:var(--secondary-text-color);">Customize event colors — Solar events (left, 8 types) | Battery/Grid events (right, 5 types):</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;max-height:600px;overflow-y:auto;padding:12px;">' +
    
    // LEFT COLUMN: Solar Events (8 types)
    '<div>' +
    '<div style="font-size:13px;font-weight:bold;color:var(--primary-text-color);margin-bottom:12px;">Solar Events</div>' +
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;font-size:11px;font-weight:bold;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--divider-color);position:sticky;top:0;background:var(--card-background-color);z-index:1;"><div>Event</div><div style="text-align:center;">BKG</div><div style="text-align:center;">Text</div><div style="text-align:center;">Cost</div></div>' +
    
    // Solar Event 1: Solar → Home (green)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color);background:rgba(102,255,102,0.1);">' +
    '<div style="font-size:11px;">🌞 Solar → Home</div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    
    // Solar Event 2: Solar → Home + Battery (green)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color);background:rgba(102,255,102,0.1);">' +
    '<div style="font-size:11px;">🌞 Solar → Home + Battery</div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    
    // Solar Event 3: Solar → Home + Battery + Grid (green)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color);background:rgba(102,255,102,0.1);">' +
    '<div style="font-size:11px;">🌞 Solar → Home + Battery + Grid</div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    
    // Solar Event 4: Solar → Home + Grid (green)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color);background:rgba(102,255,102,0.1);">' +
    '<div style="font-size:11px;">🌞 Solar → Home + Grid</div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-green-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    
    // Solar Event 5: Solar + Battery → Home (teal)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color);background:rgba(153,255,255,0.1);">' +
    '<div style="font-size:11px;">🌞 Solar + Battery → Home</div>' +
    '<div style="text-align:center;"><input type="color" id="color-teal-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-teal-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-teal-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    
    // Solar Event 6: Solar + Battery → Home + Grid (Force) (yellow)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color);background:rgba(255,255,128,0.1);">' +
    '<div style="font-size:11px;">🌞 Solar + Battery → Home + Grid (Force)</div>' +
    '<div style="text-align:center;"><input type="color" id="color-yellow-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-yellow-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-yellow-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    
    // Solar Event 7: Solar + Grid → Home (pink)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color);background:rgba(255,224,224,0.1);">' +
    '<div style="font-size:11px;">🌞 Solar + Grid → Home</div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    
    // Solar Event 8: Solar + Grid → Home + Battery (Force) (pink)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;background:rgba(255,224,224,0.1);">' +
    '<div style="font-size:11px;">🌞 Solar + Grid → Home + Battery (Force)</div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    '</div>' +
    
    // RIGHT COLUMN: Battery/Grid Events (5 types)
    '<div>' +
    '<div style="font-size:13px;font-weight:bold;color:var(--primary-text-color);margin-bottom:12px;">Battery / Grid Events</div>' +
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;font-size:11px;font-weight:bold;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--divider-color);position:sticky;top:0;background:var(--card-background-color);z-index:1;"><div>Event</div><div style="text-align:center;">BKG</div><div style="text-align:center;">Text</div><div style="text-align:center;">Cost</div></div>' +
    
    // Battery/Grid Event 1: Battery → Home (teal)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color);background:rgba(153,255,255,0.1);">' +
    '<div style="font-size:11px;">🔋 Battery → Home</div>' +
    '<div style="text-align:center;"><input type="color" id="color-teal-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-teal-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-teal-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    
    // Battery/Grid Event 2: Battery → Home + Grid (Force) (yellow)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color);background:rgba(255,255,128,0.1);">' +
    '<div style="font-size:11px;">🔋 Battery → Home + Grid (Force)</div>' +
    '<div style="text-align:center;"><input type="color" id="color-yellow-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-yellow-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-yellow-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    
    // Battery/Grid Event 3: Battery + Grid → Home (pink)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color);background:rgba(255,224,224,0.1);">' +
    '<div style="font-size:11px;">🔋 Battery + Grid → Home</div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    
    // Battery/Grid Event 4: Grid → Home (pink)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color);background:rgba(255,224,224,0.1);">' +
    '<div style="font-size:11px;">⚡ Grid → Home</div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    
    // Battery/Grid Event 5: Grid → Home + Battery (Force) (pink)
    '<div style="display:grid;grid-template-columns:240px 45px 45px 45px;gap:8px;align-items:center;padding:8px;background:rgba(255,224,224,0.1);">' +
    '<div style="font-size:11px;">⚡ Grid → Home + Battery (Force)</div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-bg" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-txt" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '<div style="text-align:center;"><input type="color" id="color-pink-cost" class="color-picker" style="width:35px;height:24px;cursor:pointer;border:none;border-radius:2px;"></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;gap:12px;justify-content:flex-start;margin-top:12px;border-top:1px solid var(--divider-color);padding-top:12px;">' +
    '<button id="reset-colors-btn" style="background:#0099ff;color:#fff;border:none;cursor:pointer;padding:8px 16px;border-radius:4px;font-weight:600;font-size:12px;">Reset to Defaults</button>' +
    '</div>' +
    '</div>' +
    
    // BACKUP TAB
    '<div id="tab-backup" class="settings-tab-content" style="display:none;">' +
    '<div style="padding:20px;display:flex;flex-direction:column;gap:20px;">' +
    '<div style="border:1px solid var(--divider-color);border-radius:4px;padding:16px;">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
    '<span style="font-size:18px;">⬇️</span>' +
    '<div style="font-weight:bold;font-size:13px;color:var(--primary-text-color);">Export Settings</div>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--secondary-text-color);margin-bottom:12px;">Download all card settings to a JSON file (thresholds, colors). Share with others or backup your configuration.</div>' +
    '<button id="export-settings-btn" style="width:100%;padding:12px 16px;background:#0099ff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">⬇️ Download Backup</button>' +
    '</div>' +
    '<div style="border:1px solid var(--divider-color);border-radius:4px;padding:16px;">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
    '<span style="font-size:18px;">⬆️</span>' +
    '<div style="font-weight:bold;font-size:13px;color:var(--primary-text-color);">Import Settings</div>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--secondary-text-color);margin-bottom:12px;">Restore settings from a previously exported JSON file. This will replace all current settings.</div>' +
    '<button id="import-settings-btn" style="width:100%;padding:12px 16px;background:#0099ff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">⬆️ Select Backup File</button>' +
    '<input type="file" id="import-settings-file" accept=".json" style="display:none;">' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;gap:12px;justify-content:space-between;border-top:1px solid var(--divider-color);padding-top:12px;">' +
    '<button id="settings-reset-btn" style="background:#666;color:#fff;border:none;cursor:pointer;padding:8px 16px;border-radius:4px;font-weight:600;font-size:12px;">Reset to Defaults</button>' +
    '<button id="settings-apply-btn" style="background:#0099ff;color:#fff;border:none;cursor:pointer;padding:8px 16px;border-radius:4px;font-weight:600;font-size:12px;">Apply</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div></ha-card>';
}

class EmEventsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass         = null;
    this._config       = {};
    this._activeTab    = 'future';
    this._lastPlanTs   = null;
    this._lastRenderTs = 0;
    this._pastState    = 'idle';
    this._pastLoadTs   = 0;
    this._lastUpdateTime = null;
    this._lastAutomationState = null;  // ✅ NEW: Track previous automation state
    this._updateTimerInterval = null;
    this._colorSettings = JSON.parse(JSON.stringify(_EMEC_COLOURS));  // Deep copy defaults
  }

  setConfig(config) {
    this._config = config || {};
    _EMEC_CUR = this._config.currency_symbol || '$';
    
    // Load color settings from localStorage if available
    try {
      const savedColors = localStorage.getItem('em-events-card-colors');
      if (savedColors) {
        const loaded = JSON.parse(savedColors);
        
        // Validate structure: all required colors with bg, txt, cost
        let isValid = true;
        for (const [key, colorObj] of Object.entries(_EMEC_COLOURS)) {
          if (!loaded[key] || 
              typeof loaded[key] !== 'object' ||
              !('bg' in loaded[key]) ||
              !('txt' in loaded[key]) ||
              !('cost' in loaded[key])) {
            isValid = false;
            break;
          }
        }
        
        if (isValid) {
          this._colorSettings = loaded;
        }
      }
    } catch (e) {
      // localStorage unavailable or corrupted, use defaults
    }
    
    if (!this.shadowRoot.getElementById('tb-future')) {
      this.shadowRoot.innerHTML = _emec_buildHTML();
      this._initializeSettings();
      this._wireRange();
      this._populateColorPickers();  // Initialize color pickers
      this._pastState  = 'idle';
      this._lastPlanTs = null;
      requestAnimationFrame(() => this._setWrapHeight());
      if (!this._ro) {
        this._ro = new ResizeObserver(() => this._setWrapHeight());
        this._ro.observe(document.documentElement);
      }
      this._scheduleRefresh();
      if (!this._visHandler) {
        this._visHandler = () => {
          if (document.visibilityState === 'visible' && this._hass) {
            const staleMins = (Date.now() - this._lastRenderTs) / 60000;
            if (staleMins > 1) {
              this._doRefresh();
            }
          }
        };
        document.addEventListener('visibilitychange', this._visHandler);
      }
    }
  }

  _msUntilNextBoundary() {
    const now = new Date();
    const secInHour = now.getMinutes() * 60 + now.getSeconds();
    const targets = [1,6,11,16,21,26,31,36,41,46,51,56];
    const minNow  = now.getMinutes() + now.getSeconds() / 60;
    let nextMin = targets.find(t => t > minNow);
    if (nextMin === undefined) nextMin = targets[0] + 60;
    const msUntil = (nextMin * 60 - secInHour) * 1000 - now.getMilliseconds();
    return Math.max(1000, msUntil);
  }

  _scheduleRefresh() {
    // This now serves as a FALLBACK timer for when automation doesn't trigger
    // Primary updates come from automation state changes via _watchAutomationState()
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => {
      if (document.visibilityState !== 'hidden' && this._hass) {
        console.log('⏲️ [Fallback Timer] Boundary refresh triggered');
        this._doRefresh();
      }
      this._scheduleRefresh();
    }, this._msUntilNextBoundary());
  }

  _doRefresh() {
    this._lastPlanTs = null;
    this._renderFuture();
    if (this._activeTab === 'past' && this._pastState === 'ready') {
      this._pastState = 'loading';
      this._loadPast();
    }
    this._lastRenderTs = Date.now();
  }

  _setWrapHeight() {
    const wraps = this.shadowRoot.querySelectorAll('.wrap');
    wraps.forEach(w => {
      const top = w.getBoundingClientRect().top;
      if (top < 10) return;
      const leg = this.shadowRoot.querySelector('.leg');
      const legH = leg ? leg.getBoundingClientRect().height + 12 : 0;
      const viewportH = Math.max(120, window.innerHeight - top - legH - 12);
      const contentH  = w.scrollHeight;
      w.style.height = Math.min(viewportH, contentH) + 'px';
    });
    const wrap = this.shadowRoot.querySelector('.pane.active .wrap');
    if (!wrap) return;
    const scrollbarW = wrap.offsetWidth - wrap.clientWidth;
    this.shadowRoot.querySelectorAll('.pane.active table.dt-head').forEach(t => {
      t.style.width = 'calc(100% - ' + scrollbarW + 'px)';
    });
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.getElementById('tb-future')) {
      this.shadowRoot.innerHTML = _emec_buildHTML();
      this._wireRange();
    }
    const providerState = hass.states['input_select.electricity_provider']?.state || 'Amber Electric';
    const provPill = this.shadowRoot.getElementById('provider-pill');
    if (provPill) provPill.textContent = '⚡ ' + providerState;

    // Watch for automation state changes
    this._watchAutomationState();

    const planState = hass.states['sensor.energy_manager_plan'];
    const planTs    = planState?.last_changed;
    if (planTs !== this._lastPlanTs) {
      this._lastPlanTs = planTs;
      this._renderFuture();
    }
    if (this._pastState === 'idle') {
      this._pastState = 'loading';
      this._pastLoadTs = Date.now();
      this._loadPast();
    } else if (this._pastState === 'loading' && this._pastLoadTs && (Date.now() - this._pastLoadTs) > 30000) {
      this._pastState = 'idle';
    }
  }

  _watchAutomationState() {
    if (!this._hass) return;
    
    const automationEntity = 'automation.update_energy_manager_decision_sensor';
    const automationState = this._hass.states[automationEntity];
    
    if (automationState?.attributes?.last_triggered) {
      const newTime = new Date(automationState.attributes.last_triggered);
      
      // Only update if this is a NEW trigger (not the same timestamp)
      if (!this._lastUpdateTime || this._lastUpdateTime.getTime() !== newTime.getTime()) {
        this._lastUpdateTime = newTime;
        
        // ✅ Update badge with new trigger time
        this._updateLastUpdatedBadge();
        
        // ✅ Keep "time ago" display fresh (updates every second)
        this._startUpdateTimer();
        
        // ✅ CRITICAL: Immediately refresh card data instead of waiting for time boundary
        // This is the key difference - automation trigger drives the refresh, not the timer
        if (document.visibilityState === 'visible') {
          console.log('🔄 [EM Decision] Automation triggered at', newTime.toLocaleTimeString(), '- refreshing card');
          this._doRefresh();
        } else {
          console.log('🔄 [EM Decision] Automation triggered but tab hidden - will refresh on visibility');
        }
      }
    }
  }

  _updateLastUpdatedBadge() {
    if (!this._lastUpdateTime) return;
    
    const now = new Date();
    const diffMs = now - this._lastUpdateTime;
    
    let timeStr = '';
    if (diffMs < 0) {
      timeStr = 'just now';
    } else {
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const remainingSecs = diffSecs % 60;
      
      // Format: XmYs (minutes and seconds) or just Xs (if under 1 minute)
      if (diffMins === 0) {
        timeStr = diffSecs + 's';  // Just seconds: "45s"
      } else if (diffMins < 60) {
        timeStr = diffMins + 'm ' + remainingSecs + 's';  // Minutes and seconds: "2m 15s"
      } else {
        const diffHours = Math.floor(diffMins / 60);
        const hrs_remaining_mins = diffMins % 60;
        timeStr = diffHours + 'h ' + hrs_remaining_mins + 'm';  // Hours and minutes: "1h 25m"
      }
    }
    
    // Get actual decision time in HH:MM format
    const decisionTime = this._lastUpdateTime.toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit', hour12:true }).toLowerCase();
    
    // Update EM Decision badge in header row (far right)
    const emDecisionBadge = this.shadowRoot.getElementById('em-decision-badge');
    if (emDecisionBadge && timeStr) {
      emDecisionBadge.innerHTML = '🔄 EM Decision: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + timeStr + ' (' + decisionTime + ')</span>';
    }
  }

  _startUpdateTimer() {
    // Update the "time ago" display every second to keep it fresh
    if (this._updateTimerInterval) clearInterval(this._updateTimerInterval);
    this._updateTimerInterval = setInterval(() => {
      this._updateLastUpdatedBadge();
    }, 1000);
  }

  _switchTab(tab) {
    this._activeTab = tab;
    const sr = this.shadowRoot;
    ['future','past'].forEach(t => {
      sr.getElementById('tab-'  + t).classList.toggle('active', t === tab);
      sr.getElementById('pane-' + t).classList.toggle('active', t === tab);
    });
    const wrap = sr.getElementById('range-past-wrap');
    if (wrap) wrap.style.display = tab === 'past' ? 'inline-flex' : 'none';
    if (tab === 'past') {
      const tabAlerts = sr.getElementById('tab-alerts');
      if (tabAlerts) tabAlerts.innerHTML = '';
    }
    requestAnimationFrame(() => this._setWrapHeight());
  }

  _wireRange() {
    const tabFuture = this.shadowRoot.getElementById('tab-future');
    const tabPast   = this.shadowRoot.getElementById('tab-past');
    if (tabFuture && !tabFuture._wired) {
      tabFuture._wired = true;
      tabFuture.addEventListener('click', () => this._switchTab('future'));
    }
    if (tabPast && !tabPast._wired) {
      tabPast._wired = true;
      tabPast.addEventListener('click', () => this._switchTab('past'));
    }
    const sel = this.shadowRoot.getElementById('range-past');
    if (sel && !sel._wired) {
      sel._wired = true;
      sel.addEventListener('change', () => {
        this._pastState = 'loading';
        const tb = this.shadowRoot.getElementById('tb-past');
        if (tb) tb.innerHTML = '<tr><td colspan="14" class="msg">⏳ Fetching history...</td></tr>';
        this._loadPast();
      });
    }
    const viewBtn = this.shadowRoot.getElementById('view-legend-btn');
    const closeBtn = this.shadowRoot.getElementById('close-legend-btn');
    const modal = this.shadowRoot.getElementById('legend-modal');
    const filters = this.shadowRoot.querySelectorAll('.legend-filter');
    
    if (viewBtn && !viewBtn._wired) {
      viewBtn._wired = true;
      viewBtn.addEventListener('click', () => this._openLegendModal());
    }
    if (closeBtn && !closeBtn._wired) {
      closeBtn._wired = true;
      closeBtn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
    }
    if (modal && !modal._wired) {
      modal._wired = true;
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    }
    
    // Settings modal listeners
    const settingsBtn = this.shadowRoot.getElementById('settings-btn');
    const closeSettingsBtn = this.shadowRoot.getElementById('close-settings-btn');
    const settingsModal = this.shadowRoot.getElementById('settings-modal');
    const applySettingsBtn = this.shadowRoot.getElementById('settings-apply-btn');
    const resetSettingsBtn = this.shadowRoot.getElementById('settings-reset-btn');
    const settingsTabs = this.shadowRoot.querySelectorAll('.settings-tab-btn');
    const thresholdInputs = this.shadowRoot.querySelectorAll('[id^="settings-"][id*="-threshold"]');
    
    if (settingsBtn && !settingsBtn._wired) {
      settingsBtn._wired = true;
      settingsBtn.addEventListener('click', () => this._openSettingsModal());
    }
    if (closeSettingsBtn && !closeSettingsBtn._wired) {
      closeSettingsBtn._wired = true;
      closeSettingsBtn.addEventListener('click', () => this._closeSettingsModal());
    }
    if (settingsModal && !settingsModal._wired) {
      settingsModal._wired = true;
      settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) this._closeSettingsModal(); });
    }
    if (applySettingsBtn && !applySettingsBtn._wired) {
      applySettingsBtn._wired = true;
      applySettingsBtn.addEventListener('click', () => this._applySettings());
    }
    if (resetSettingsBtn && !resetSettingsBtn._wired) {
      resetSettingsBtn._wired = true;
      resetSettingsBtn.addEventListener('click', () => this._resetSettings());
    }
    
    // Wire export/import buttons
    const exportBtn = this.shadowRoot.getElementById('export-settings-btn');
    const importBtn = this.shadowRoot.getElementById('import-settings-btn');
    const importFileInput = this.shadowRoot.getElementById('import-settings-file');
    
    if (exportBtn && !exportBtn._wired) {
      exportBtn._wired = true;
      exportBtn.addEventListener('click', () => this._exportSettings());
    }
    
    if (importBtn && !importBtn._wired) {
      importBtn._wired = true;
      importBtn.addEventListener('click', () => {
        importFileInput.click();
      });
    }
    
    if (importFileInput && !importFileInput._wired) {
      importFileInput._wired = true;
      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          this._importSettings(file);
        }
      });
    }
    
    thresholdInputs.forEach((input) => {
      if (!input._wired) {
        input._wired = true;
        input.addEventListener('input', () => this._updateKwhDisplays());
      }
    });

    settingsTabs.forEach((tab) => {
      if (!tab._wired) {
        tab._wired = true;
        tab.addEventListener('click', () => {
          const tabName = tab.dataset.tab;
          // Update active tab button
          settingsTabs.forEach(t => {
            t.classList.remove('active');
            t.style.borderBottomColor = 'transparent';
            t.style.color = 'var(--secondary-text-color)';
          });
          tab.classList.add('active');
          tab.style.borderBottomColor = '#0099ff';
          tab.style.color = 'var(--primary-text-color)';
          
          // Update active tab content
          const contents = this.shadowRoot.querySelectorAll('.settings-tab-content');
          contents.forEach(c => c.style.display = 'none');
          const activeContent = this.shadowRoot.getElementById(`tab-${tabName}`);
          if (activeContent) activeContent.style.display = 'block';
        });
      }
    });
    
    filters.forEach((f) => {
      if (!f._wired) {
        f._wired = true;
        f.addEventListener('change', () => this._applyLegendFilters());
      }
    });
    const catFilters = this.shadowRoot.querySelectorAll('.legend-filter-cat');
    catFilters.forEach((f) => {
      if (!f._wired) {
        f._wired = true;
        f.addEventListener('change', () => this._applyLegendFilters());
      }
    });
  }

  _getExportLimitDisp(gridLimitStr) {
    // Format a value as kW or W depending on magnitude
    const formatUnit = (kw) => {
      if (kw < 1) {
        return (kw * 1000).toFixed(0) + ' W';
      }
      return kw.toFixed(1) + ' kW';
    };
    
    // Parse grid limit
    if (!gridLimitStr) return null;
    const gridKw = parseFloat(gridLimitStr);
    const gridFormatted = formatUnit(gridKw);
    
    // Get Globird EM limit if available
    const superStart = this._hass?.states['input_datetime.globird_super_start']?.state;
    const superEnd = this._hass?.states['input_datetime.globird_super_end']?.state;
    const superMaxPct = parseFloat(this._hass?.states['input_number.globird_super_max_export_kw_percentage']?.state || 100);
    const otherMaxPct = parseFloat(this._hass?.states['input_number.globird_other_max_export_kw_percentage']?.state || 100);
    const badWeatherMax = parseFloat(this._hass?.states['input_number.globird_bad_weather_max_export']?.state || 100);
    const inverterMax = parseFloat(this._hass?.states['input_number.inverter_export_power_hardlimit']?.state);
    
    // If Globird sensors not available, just show grid limit
    if (!inverterMax || !superStart || !superEnd) {
      return gridFormatted;
    }
    
    // Check if current time is in Super Export window
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const superStartTime = superStart.slice(0, 5);
    const superEndTime = superEnd.slice(0, 5);
    
    const inSuperWindow = currentTime >= superStartTime && currentTime < superEndTime;
    const effectiveMaxPct = inSuperWindow ? superMaxPct : otherMaxPct;
    
    // Calculate EM limit
    let emLimit = inverterMax * (effectiveMaxPct / 100) * (badWeatherMax / 100);
    const emFormatted = formatUnit(emLimit);
    
    // Return combined Grid | EM format
    return gridFormatted + ' (Grid) | ' + emFormatted + ' (EM)';
  }

  _buildSbar(timeline, bs, summary, provider, nowTs, decisionFocus, nowBuyP, nowSellP) {
    const fmtSbarTime = (ts) => new Date(ts).toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit', hour12:true }).toLowerCase();

    const modeLabel  = bs?.mode || summary?.now_mode || 'UNKNOWN';
    const modeColors = { SELF_CONSUMPTION:'#28a745', FORCED_CHARGE:'#2196F3', FORCED_EXPORT:'#FF6B2C', FORCED_DISCHARGE:'#ff9800' };
    const modeIcons  = { SELF_CONSUMPTION:'🏠', FORCED_CHARGE:'⚡', FORCED_EXPORT:'📤', FORCED_DISCHARGE:'📤' };
    const modeColor  = modeColors[modeLabel] || '#9c27b0';
    const modeIcon   = modeIcons[modeLabel]  || '🔧';
    const nowSoc     = summary?.now_soc_pct;
    const batteryCapKwh = parseFloat(this._hass.states['sensor.inverter_battery_capacity']?.state || 0);

    // Check if CURRENTLY charging: find closest forecast slot to now
    let chargingNow = false;
    let closestDiff = Infinity;
    for (const row of timeline) {
      const ts = new Date(row.ts).getTime();
      const diff = Math.abs(ts - nowTs);
      if (diff < closestDiff) {
        closestDiff = diff;
        chargingNow = (row.inputs.pv_kw || 0) > 0.5 && (row.expected.battery_charge_kw || 0) > 0.1;
      }
    }

    // Scan timeline once for min/max forecasted SoC (direct from em_plan)
    let minSoc = null, minSocTime = '', maxSoc = null, maxSocTime = '';
    
    for (const row of timeline) {
      const ts = new Date(row.ts).getTime();
      if (ts <= nowTs) continue; // Skip past events
      
      const forecSoc = row.inputs.soc_pct_start || 0; // SoC AT the start of this slot
      
      // Track minimum
      if (minSoc === null || forecSoc < minSoc) {
        minSoc = forecSoc;
        minSocTime = fmtSbarTime(ts);
      }
      
      // Track maximum
      if (maxSoc === null || forecSoc > maxSoc) {
        maxSoc = forecSoc;
        maxSocTime = fmtSbarTime(ts);
      }
    }
    
    // Calculate kWh display: soc_pct * capacity_kwh / 100
    const fmtSocKwh = (soc) => {
      if (!soc || batteryCapKwh <= 0) return ''; // Fallback: no kWh shown if capacity unavailable
      const kwh = (soc * batteryCapKwh) / 100;
      return ` | ${kwh.toFixed(1)} kWh`;
    };
    
    // Show the appropriate metric: Peak if charging, Minimum if not
    let dawnSoc = null, dawnTime = '', dawnLabel = '', dawnKwh = '';
    if (chargingNow && maxSoc !== null) {
      // Currently charging — show peak
      dawnSoc = maxSoc;
      dawnTime = maxSocTime;
      dawnLabel = '🔋 Peak SoC:';
      dawnKwh = fmtSocKwh(maxSoc);
    } else if (minSoc !== null && minSoc < 99) {
      // Not charging — show minimum before recovery
      dawnSoc = minSoc;
      dawnTime = minSocTime;
      dawnLabel = '🌅 Minimum SoC:';
      dawnKwh = fmtSocKwh(minSoc);
    }

    const dawnColor  = dawnSoc <= 20 ? '#ff6b6b' : dawnSoc <= 35 ? '#ff9800' : '#39ff14';

    let nextImporting = false, nextCharging = false;
    for (const row of timeline) {
      if (new Date(row.ts).getTime() < nowTs) continue;
      nextImporting = (row.expected.grid_import_kw   || 0) > 0.1;
      nextCharging  = (row.expected.battery_charge_kw|| 0) > 0.1;
      break;
    }

    const exportLimitW  = parseFloat(this._hass.states['sensor.inverter_current_export_power_limit']?.state || 0);
    const chargeLimitW  = parseFloat(this._hass.states['sensor.inverter_current_max_charge_power']?.state  || 0);
    const importLimitKw = parseFloat(this._hass.states['input_number.inverter_import_limit']?.state        || 0);
    const chargeLimitKw = Math.min(chargeLimitW / 1000, importLimitKw > 0 ? importLimitKw : Infinity);
    const fmtKwLimit = (kw) => (kw === Math.floor(kw) ? kw.toFixed(0) : kw.toFixed(1)) + ' kW';
    const showExportLimit = exportLimitW > 0;
    const showChargeLimit = (nextImporting || nextCharging) && chargeLimitKw > 0 && isFinite(chargeLimitKw);
    const exportLimitDisp = showExportLimit ? fmtKwLimit(exportLimitW / 1000) : null;
    const chargeLimitDisp = showChargeLimit ? fmtKwLimit(chargeLimitKw)       : null;

    let superExportPill = '';
    let dynamicChargingPill = '';
    
    if (provider === 'Globird' && this._hass) {
      // Check for dynamic charging in current/next row OR lookahead for tomorrow
      let foundCurrent = false;
      
      // First check: current/next 5 minutes
      for (const row of timeline) {
        const ts = new Date(row.ts).getTime();
        if (ts >= nowTs - 5 * 60000) { // Current or future
          const dynamicLimitW = row.setpoints?.dynamic_charge_limit_w || 0;
          const isDynamicActive = row.setpoints?.dynamic_charge_active || false;
          
          if (isDynamicActive && dynamicLimitW > 0) {
            const dynamicLimitKw = (dynamicLimitW / 1000).toFixed(1);
            dynamicChargingPill = '<span>🔌 Dynamic Charging: <span class="pill" style="background:#2196F3;color:#fff;" title="Charging now at low import tariff rate. Limit shown prevents grid congestion">' + dynamicLimitKw + ' kW</span></span>';
            foundCurrent = true;
            break;
          }
        }
      }
      
      // Second check: if not found in next 5 mins, scan full timeline for any dynamic charging (lookahead)
      if (!foundCurrent) {
        for (const row of timeline) {
          const dynamicLimitW = row.setpoints?.dynamic_charge_limit_w || 0;
          const isDynamicActive = row.setpoints?.dynamic_charge_active || false;
          const drivers = row.drivers || [];
          
          if (isDynamicActive && dynamicLimitW > 0 && drivers.includes('free_import')) {
            const dynamicLimitKw = (dynamicLimitW / 1000).toFixed(1);
            const rowTs = new Date(row.ts);
            const timeStr = rowTs.toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit', hour12:true }).toLowerCase();
            dynamicChargingPill = '<span>🔌 Next: <span class="pill" style="background:#2196F3;color:#fff;" title="Cheap import tariff window coming. Battery will charge at this limit to take advantage of low rates">' + dynamicLimitKw + ' kW @ ' + timeStr + '</span></span>';
            break;
          }
        }
      }
      
      // Super export remaining (current period)
      const superCapKwh = parseFloat(this._hass.states['input_number.globird_super_max_export']?.state || 10);
      const dailyExported = parseFloat(this._hass.states['sensor.daily_exported_energy']?.state || 0);
      const remaining = Math.max(0, superCapKwh - dailyExported);
      if (remaining <= 0) {
        superExportPill = '<span>⚡ Super Export: <span class="pill" style="background:#f44336;color:#fff;" title="Daily export bonus cap reached. No more bonus payments available today">Cap reached</span></span>';
      } else {
        superExportPill = '<span>⚡ Super Export: <span class="pill" style="background:#555;" title="Remaining daily export quota for bonus rates. Export any surplus at premium prices before limit reached">' + remaining.toFixed(1) + ' kWh remaining</span></span>';
      }
    }

    // Use decisionFocus passed from _renderFuture (already properly formatted)
    let focusCap = decisionFocus;
    
    // Capitalize all words in focus text
    if (focusCap) {
      focusCap = focusCap.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }
    
    // Check if current timeline row has drivers - use to override focus with better context
    let currentRowDrivers = [];
    for (const row of timeline) {
      const ts = new Date(row.ts).getTime();
      if (ts >= nowTs - 5 * 60000 && ts <= nowTs + 5 * 60000) { // Within 5 mins of now
        currentRowDrivers = row.drivers || [];
        break;
      }
    }
    
    // Override focus based on drivers for better context
    if (currentRowDrivers.includes('free_import')) {
      focusCap = 'Free Imports';
    } else if (currentRowDrivers.includes('peak_export')) {
      focusCap = 'Peak Export Period';
    } else if (currentRowDrivers.includes('dynamic_charging')) {
      focusCap = 'Charging Battery';
    }

    const html =
      '<span style="color:#2196F3;font-weight:bold;margin-right:10px;">STATUS:</span>' +
      '<span>' + modeIcon + ' Mode: <span class="pill" style="background-color:' + modeColor + ';">' + modeLabel.replace(/_/g,' ') + '</span></span>' +
      (focusCap ? '<span>🎯 Focus: <span class="pill" style="background:#555;" title="Primary strategy: Free Imports = cheap rate, Peak Export = high export price, Charging Battery = low import tariff">' + focusCap + '</span></span>' : '') +
      (nowSoc != null ? '<span>🔋 SoC now: <span class="pill" style="background:#555;">' + nowSoc.toFixed(1) + '% | ' + (nowSoc / 100 * batteryCapKwh).toFixed(1) + ' kWh</span></span>' : '') +
      (dawnSoc != null ? '<span>' + dawnLabel + ' <span class="pill" style="background:#555;color:' + dawnColor + ';">' + dawnSoc.toFixed(1) + '%' + dawnKwh + ' (' + dawnTime + ')</span></span>' : '') +
      (this._getExportLimitDisp(exportLimitDisp) ? '<span>📤 Export Limit: <span class="pill" style="background:#555;" title="Maximum export to grid. Shows EM-controlled limit + Grid Operator limits combined">' + this._getExportLimitDisp(exportLimitDisp) + '</span></span>' : '') +
      (chargeLimitDisp ? '<span>⚡ ESS Charge Limit: <span class="pill" style="background:#555;" title="Maximum charge rate allowed. Prevents overcharging battery during fast-charge windows">' + chargeLimitDisp + '</span></span>' : '') +
      dynamicChargingPill +
      superExportPill;
    
    return html;
  }

  _buildFinancialsBar(nowBuyP, nowSellP) {
    // Build finances bar with BUY, SELL, and daily financial badges
    const importFormatted = this._hass?.states['sensor.import_formatted']?.state || 'N/A';
    const exportFormatted = this._hass?.states['sensor.export_formatted']?.state || 'N/A';
    const netFormatted = this._hass?.states['sensor.net_formatted']?.state || 'N/A';
    const dailyImportedEnergy = this._hass?.states['sensor.daily_imported_energy']?.state || 'N/A';
    const dailyExportedEnergy = this._hass?.states['sensor.daily_exported_energy']?.state || 'N/A';
    
    // Determine net background color based on value
    let netBgColor = '#555'; // Default grey
    if (netFormatted !== 'N/A') {
      const netValue = parseFloat(netFormatted.replace('$', '').replace('-', ''));
      if (netFormatted.includes('-')) {
        netBgColor = '#ff5252'; // Red for negative (cost)
      } else if (netValue > 0) {
        netBgColor = '#00FF00'; // Green for positive (credit) - same as buy badge
      } else if (netValue === 0) {
        netBgColor = '#FFEB3B'; // Yellow for zero
      }
    }
    
    const html =
      '<span style="color:#FF9800;font-weight:bold;margin-right:10px;">FINANCES:</span>' +
      '<span>💲 Buy: <span class="pill" style="background:' + (nowBuyP <= 0.00 ? '#00FF00;color:#000;' : '#555;') + '">' + this._fmtPrice(nowBuyP) + '</span></span>' +
      '<span>💲 Sell: <span class="pill" style="background:' + (nowSellP <= 0.00 ? '#ff5252;color:#000;' : '#555;') + '">' + this._fmtPrice(nowSellP) + '</span></span>' +
      '<span>💰 Net: <span class="pill" style="background:' + netBgColor + ';color:#000;" title="Today\'s net cost. Positive (green) = credit owed to you. Negative (red) = cost to you">' + netFormatted + '</span></span>' +
      '<span>📥 Imported: <span class="pill" style="background:#555;">' + importFormatted + ' | ' + dailyImportedEnergy + ' kWh</span></span>' +
      '<span>📤 Exported: <span class="pill" style="background:#555;">' + exportFormatted + ' | ' + dailyExportedEnergy + ' kWh</span></span>';
    
    return html;
  }

  _buildDayHeaderRow(day, dailyCosts, dailyKwh, todayStr, displayLabel) {
    const dayTotal = dailyCosts[day] || 0;
    const dk       = dailyKwh[day]  || { load:0, pv:0, gridImp:0, gridExp:0, battChg:0, battDis:0 };
    const dayColor = dayTotal <= 0 ? '#4caf50' : '#f44336';
    const dayLabel = displayLabel 
      ? '📅 ' + displayLabel 
      : (day === todayStr ? '📅 Today' : '📅 ' + new Date(day + 'T00:00:00').toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' }));
    const dayCostLabel = dayTotal <= 0 ? _EMEC_CUR + Math.abs(dayTotal).toFixed(2) : '-' + _EMEC_CUR + dayTotal.toFixed(2);
    const fmtKd = (v) => Math.abs(v) > 0.001 ? v.toFixed(3) : '—';
    const fmtGridImp = (v) => Math.abs(v) > 0.001 ? '<span style="color:#f44336;">' + v.toFixed(3) + '</span>' : '—';
    const fmtGridExp = (v) => Math.abs(v) > 0.001 ? '<span style="color:#4caf50;">' + v.toFixed(3) + '</span>' : '—';
    const fmtBattChg = (v) => Math.abs(v) > 0.001 ? '<span style="color:#4caf50;">' + v.toFixed(3) + '</span>' : '—';
    const fmtBattDis = (v) => Math.abs(v) > 0.001 ? '<span style="color:#f44336;">' + v.toFixed(3) + '</span>' : '—';
    
    const row1 = '<tr class="dr" style="border-bottom: 1px solid var(--divider-color,#444);vertical-align:middle;height:auto;">' +
      '<td colspan="2" style="vertical-align:middle;">' + dayLabel + '</td>' +
      '<td class="bgl" colspan="2"></td>' +
      '<td class="bgl"></td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtKd(dk.load) + '</td>' +
      '<td class="bgl"></td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtKd(dk.pv) + '</td>' +
      '<td class="bgl" style="text-align:right;font-weight:bold;font-size:10px;color:#666;vertical-align:middle;">Import</td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtGridImp(dk.gridImp) + '</td>' +
      '<td class="bgl" style="text-align:right;font-weight:bold;font-size:10px;color:#666;vertical-align:middle;">Charge</td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtBattChg(dk.battChg) + '</td>' +
      '<td class="bgl" style="vertical-align:middle;"></td>' +
      '<td class="bgl" style="text-align:right;color:' + dayColor + ';font-weight:bold;vertical-align:middle;">' + dayCostLabel + '</td>' +
      '</tr>';
    
    const row2 = '<tr class="dr" style="border-top: 1px solid var(--divider-color,#444);vertical-align:middle;height:auto;">' +
      '<td colspan="2" style="vertical-align:middle;"></td>' +
      '<td class="bgl" colspan="2"></td>' +
      '<td class="bgl"></td>' +
      '<td class="bgi" style="vertical-align:middle;"></td>' +
      '<td class="bgl"></td>' +
      '<td class="bgi" style="vertical-align:middle;"></td>' +
      '<td class="bgl" style="text-align:right;font-weight:bold;font-size:10px;color:#666;vertical-align:middle;">Export</td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtGridExp(dk.gridExp) + '</td>' +
      '<td class="bgl" style="text-align:right;font-weight:bold;font-size:10px;color:#666;vertical-align:middle;">Disch.</td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtBattDis(dk.battDis) + '</td>' +
      '<td class="bgl" style="vertical-align:middle;"></td>' +
      '<td class="bgl" style="vertical-align:middle;"></td>' +
      '</tr>';
    
    return row1 + row2;
  }

  _buildDayHeaderRowPast(day, pastDailyCosts, pastDailyKwh, displayLabel) {
    const dayTotal = pastDailyCosts[day] || 0;
    const dk = pastDailyKwh[day] || { load: 0, pv: 0, gridImp: 0, gridExp: 0, battChg: 0, battDis: 0 };
    const dayColor = dayTotal <= 0 ? '#4caf50' : '#f44336';
    const dayLabel = '📅 ' + displayLabel;
    const dayCostLabel = dayTotal <= 0 ? _EMEC_CUR + Math.abs(dayTotal).toFixed(2) : '-' + _EMEC_CUR + dayTotal.toFixed(2);
    const fmtKd = (v) => Math.abs(v) > 0.001 ? v.toFixed(3) : '—';
    const fmtGridImp = (v) => Math.abs(v) > 0.001 ? '<span style="color:#f44336;">' + v.toFixed(3) + '</span>' : '—';
    const fmtGridExp = (v) => Math.abs(v) > 0.001 ? '<span style="color:#4caf50;">' + v.toFixed(3) + '</span>' : '—';
    const fmtBattChg = (v) => Math.abs(v) > 0.001 ? '<span style="color:#4caf50;">' + v.toFixed(3) + '</span>' : '—';
    const fmtBattDis = (v) => Math.abs(v) > 0.001 ? '<span style="color:#f44336;">' + v.toFixed(3) + '</span>' : '—';
    
    const row1 = '<tr class="dr" style="border-bottom: 1px solid var(--divider-color,#444);vertical-align:middle;height:auto;">' +
      '<td colspan="2" style="vertical-align:middle;">' + dayLabel + '</td>' +
      '<td class="bgl" colspan="2"></td>' +
      '<td class="bgl"></td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtKd(dk.load) + '</td>' +
      '<td class="bgl"></td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtKd(dk.pv) + '</td>' +
      '<td class="bgl" style="text-align:right;font-weight:bold;font-size:10px;color:#666;vertical-align:middle;">Import</td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtGridImp(dk.gridImp) + '</td>' +
      '<td class="bgl" style="text-align:right;font-weight:bold;font-size:10px;color:#666;vertical-align:middle;">Charge</td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtBattChg(dk.battChg) + '</td>' +
      '<td class="bgl" style="vertical-align:middle;"></td>' +
      '<td class="bgl" style="text-align:right;color:' + dayColor + ';font-weight:bold;vertical-align:middle;">' + dayCostLabel + '</td>' +
      '</tr>';
    
    const row2 = '<tr class="dr" style="border-top: 1px solid var(--divider-color,#444);vertical-align:middle;height:auto;">' +
      '<td colspan="2" style="vertical-align:middle;"></td>' +
      '<td class="bgl" colspan="2"></td>' +
      '<td class="bgl"></td>' +
      '<td class="bgi" style="vertical-align:middle;"></td>' +
      '<td class="bgl"></td>' +
      '<td class="bgi" style="vertical-align:middle;"></td>' +
      '<td class="bgl" style="text-align:right;font-weight:bold;font-size:10px;color:#666;vertical-align:middle;">Export</td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtGridExp(dk.gridExp) + '</td>' +
      '<td class="bgl" style="text-align:right;font-weight:bold;font-size:10px;color:#666;vertical-align:middle;">Disch.</td>' +
      '<td class="bgi" style="text-align:right;vertical-align:middle;">' + fmtBattDis(dk.battDis) + '</td>' +
      '<td class="bgl" style="vertical-align:middle;"></td>' +
      '<td class="bgl" style="vertical-align:middle;"></td>' +
      '</tr>';
    
    return row1 + row2;
  }

  _buildTimelineRow(row, provider, meta, nowTs) {
    const ts = new Date(row.ts).getTime();
    const timeStr = new Date(ts).toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit', hour12:false });

    const solarKw    = row.inputs.pv_kw      || 0;
    const loadKw  = row.inputs.load_kw    || 0;
    const soc     = row.inputs.soc_pct_start || 0;
    const rowStepH = (row.interval_minutes || meta?.step_minutes || 30) / 60;
    let { buyP, sellP, inSuper, stdSellP, otherSellP, mins, stdStart, stdEnd } = _emec_getPrices(ts, provider, this._hass, row.inputs.buy_price || 0, row.inputs.sell_price || 0);
    const impKw   = row.expected.grid_import_kw      || 0;
    const expKw   = row.expected.grid_export_kw      || 0;
    const battCKw = row.expected.battery_charge_kw   || 0;
    const battDKw = row.expected.battery_discharge_kw|| 0;
    const curtail = row.setpoints?.curtail_pct || 0;
    const gridThreshold = (this._settings?.gridThreshold || 10) / 1000; // Convert W to kW
    const batteryThreshold = (this._settings?.batteryThreshold || 10) / 1000; // Convert W to kW
    const gridKw  = expKw > gridThreshold ? -expKw : impKw > gridThreshold ? impKw : 0;
    const battKw  = battCKw > batteryThreshold ? battCKw : battDKw > batteryThreshold ? -battDKw : 0;

    let capHit = false;
    if (provider === 'Globird' && inSuper && expKw > gridThreshold && this._hass) {
      const superCapKwh = parseFloat(this._hass.states['input_number.globird_super_max_export']?.state || 10);
      const slotExpKwh = expKw * rowStepH;
      const dailyExpedNow = parseFloat(this._hass.states['sensor.daily_exported_energy']?.state || 0);
      if (dailyExpedNow >= superCapKwh) {
        sellP = _emec_inWindow(mins, stdStart, stdEnd) ? stdSellP : otherSellP;
        capHit = true;
      } else if (dailyExpedNow + slotExpKwh > superCapKwh) {
        const superPortion   = superCapKwh - dailyExpedNow;
        const fallbackP      = _emec_inWindow(mins, stdStart, stdEnd) ? stdSellP : otherSellP;
        sellP = (superPortion * sellP + (slotExpKwh - superPortion) * fallbackP) / slotExpKwh;
        capHit = true;
      }
    }

    const cost    = ((impKw * buyP) - (expKw * sellP)) * rowStepH;

    const cls = _emec_classifyFuture(row.mode, solarKw, impKw, expKw, battCKw, battDKw, curtail, soc, gridThreshold);
    if (!cls) return null;

    const c       = this._colorSettings[cls.color] || _EMEC_COLOURS[cls.color] || { bg:'transparent', txt:'var(--primary-text-color)', cost:'var(--primary-text-color)' };
    const gridCol = gridKw < 0 ? '#4caf50' : gridKw > 0 ? '#f44336' : c.txt;
    const battCol = battKw < 0 ? '#f44336' : battKw > 0 ? '#4caf50' : c.txt;
    const socCol  = soc <= 20 ? '#f44336' : soc >= 75 ? '#4caf50' : c.txt;
    const costFmt = _emec_fmtCost(cost);
    const costCol = costFmt.col || (cost > 0.0001 ? c.cost : c.txt);

    const fLoadKwh  = loadKw  * rowStepH;
    const fSolarKwh    = solarKw    * rowStepH;
    const fGridKwh  = gridKw  * rowStepH;
    const fBattKwh  = battKw  * rowStepH;

    // Calculate kWh thresholds based on interval and column-specific kW thresholds
    const loadThresholdKw = (this._settings?.loadThreshold || 5) / 1000;
    const solarThresholdKw = (this._settings?.solarThreshold || 5) / 1000;
    const gridThresholdKw = (this._settings?.gridThreshold || 10) / 1000;
    const battThresholdKw = (this._settings?.batteryThreshold || 10) / 1000;
    
    const loadKwhThreshold = loadThresholdKw * rowStepH;
    const solarKwhThreshold = solarThresholdKw * rowStepH;
    const gridKwhThreshold = gridThresholdKw * rowStepH;
    const battKwhThreshold = battThresholdKw * rowStepH;

    const fmtKw  = (v) => Math.abs(v) < 0.005 ? '<span style="color:' + c.txt + ';">—</span>' : '<span style="color:' + c.txt + ';">' + v.toFixed(3) + '</span>';
    const fmtLKw = (v) => Math.abs(v) < loadThresholdKw ? '<span style="color:' + c.txt + ';">—</span>' : '<span style="color:' + c.txt + ';">' + v.toFixed(3) + '</span>';
    const fmtSolarKw = (v) => Math.abs(v) < solarThresholdKw ? '<span style="color:' + c.txt + ';">—</span>' : '<span style="color:' + c.txt + ';">' + v.toFixed(3) + '</span>';
    const fmtGKw = (v) => Math.abs(v) < gridThresholdKw ? '<span style="color:' + c.txt + ';">—</span>' : '<span style="color:' + gridCol + ';">' + v.toFixed(3) + '</span>';
    const fmtBKw = (v) => Math.abs(v) < battThresholdKw ? '<span style="color:' + c.txt + ';">—</span>' : '<span style="color:' + battCol + ';">' + v.toFixed(3) + '</span>';
    const fmtLKwh = (v) => Math.abs(v) < loadKwhThreshold ? '—' : '<span style="color:' + c.txt + ';">' + v.toFixed(3) + '</span>';
    const fmtSolarKwh = (v) => Math.abs(v) < solarKwhThreshold ? '—' : '<span style="color:' + c.txt + ';">' + v.toFixed(3) + '</span>';
    const fmtGKwh = (v) => Math.abs(v) < gridKwhThreshold ? '—' : '<span style="color:' + gridCol + ';">' + v.toFixed(3) + '</span>';
    const fmtBKwh = (v) => Math.abs(v) < battKwhThreshold ? '—' : '<span style="color:' + battCol + ';">' + v.toFixed(3) + '</span>';
    const sellDisp = this._fmtPrice(sellP) + (capHit ? ' ⚠' : '');

    return '<tr style="background-color:' + c.bg + ';color:' + c.txt + ';">' +
      '<td>' + timeStr + '</td>' +
      '<td><span title="' + (cls.note || '').replace(/"/g, '&quot;') + '">' + cls.label + '</span></td>' +
      '<td class="bgl">' + this._fmtPrice(buyP)  + '</td>' +
      '<td class="bgi" style="opacity:1;font-size:12px;">' + sellDisp + '</td>' +
      '<td class="bgl">' + fmtLKw(loadKw) + '</td>' +
      '<td class="bgi">' + fmtLKwh(fLoadKwh) + '</td>' +
      '<td class="bgl">' + fmtSolarKw(solarKw) + '</td>' +
      '<td class="bgi">' + fmtSolarKwh(fSolarKwh) + '</td>' +
      '<td class="bgl">' + fmtGKw(gridKw) + '</td>' +
      '<td class="bgi">' + fmtGKwh(fGridKwh) + '</td>' +
      '<td class="bgl">' + fmtBKw(battKw) + '</td>' +
      '<td class="bgi">' + fmtBKwh(fBattKwh) + '</td>' +
      '<td class="bgi"><span style="color:' + socCol + ';">' + soc.toFixed(1) + '</span></td>' +
      '<td class="bgl"><span style="color:' + costCol + ';font-weight:bold;">' + costFmt.disp + '</span></td>' +
      '</tr>';
  }

  _renderFuture() {
    this._lastRenderTs = Date.now();
    const sbar  = this.shadowRoot.getElementById('sbar-future');
    const tbody = this.shadowRoot.getElementById('tb-future');
    if (!sbar || !tbody) return;

    const planState = this._hass?.states['sensor.energy_manager_plan'];
    if (!planState) {
      tbody.innerHTML = '<tr><td colspan="14" class="err">⚠️ sensor.energy_manager_plan not found</td></tr>';
      return;
    }

    const attr     = planState.attributes;
    const plan     = attr.energy_plan;
    const bs       = attr.blocks_summary;
    const summary  = plan?.summary;
    const provider = this._hass?.states['input_select.electricity_provider']?.state || 'Amber Electric';

    // Extract Focus from blocks_summary first (Amber/LocalVolts/FlowPower), fallback to decision sensor for Globird
    let decisionFocus = '';
    if (bs?.focus) {
      // Amber/LocalVolts/FlowPower have focus in blocks_summary
      decisionFocus = bs.focus;
    } else {
      // Globird fallback: extract from sensor.energy_manager_decision state (HTML format)
      const decisionEntity = this._hass?.states['sensor.energy_manager_decision'];
      if (decisionEntity?.state) {
        // Parse HTML state: <li>Reason: Curtailed</li> or <li>Reason:Curtailed</li>
        let reasonMatch = decisionEntity.state.match(/<li>Reason:\s*([^<]+)<\/li>/i);
        if (!reasonMatch) {
          // Try without space after colon
          reasonMatch = decisionEntity.state.match(/<li>Reason:([^<]+)<\/li>/i);
        }
        if (reasonMatch && reasonMatch[1]) {
          decisionFocus = reasonMatch[1].trim();
        }
      }
    }

    const isGlobird = provider === 'Globird';
    let timeline, meta, stepH;

    // Unified parsing: all providers (Globbird, Amber, LocalVolts, FlowPower) use the same format
    timeline = plan?.timeline || [];
    meta     = plan?.meta || {};
    stepH    = (meta.fine_step_minutes || meta.step_minutes || 30) / 60;


    if (!timeline.length) {
      tbody.innerHTML = '<tr><td colspan="14" class="err">⚠️ No timeline data found</td></tr>';
      return;
    }

    const nowTs    = Date.now();
    const todayStr = new Date().toLocaleDateString('en-CA');

    const dailyCosts = {};
    const dailyKwh   = {};
    let curDay = '', curTotal = 0, curKwh = { load:0, pv:0, gridImp:0, gridExp:0, battChg:0, battDis:0 };

    for (const row of timeline) {
      const ts      = new Date(row.ts).getTime();
      if (ts < nowTs) continue;
      const day     = new Date(ts).toLocaleDateString('en-CA');
      const rowStepH = (row.interval_minutes || meta?.step_minutes || 30) / 60;
      const { buyP, sellP } = _emec_getPrices(ts, provider, this._hass, row.inputs.buy_price || 0, row.inputs.sell_price || 0);
      const rImpKw  = row.expected.grid_import_kw       || 0;
      const rExpKw  = row.expected.grid_export_kw       || 0;
      const rBattC  = row.expected.battery_charge_kw    || 0;
      const rBattD  = row.expected.battery_discharge_kw || 0;
      const net = (rImpKw * buyP - rExpKw * sellP) * rowStepH;
      if (day !== curDay) {
        if (curDay) { dailyCosts[curDay] = Math.round(curTotal * 10000) / 10000; dailyKwh[curDay] = { ...curKwh }; }
        curDay = day; curTotal = net;
        curKwh = { load: (row.inputs.load_kw||0)*rowStepH, pv: (row.inputs.pv_kw||0)*rowStepH, gridImp: rImpKw*rowStepH, gridExp: rExpKw*rowStepH, battChg: rBattC*rowStepH, battDis: rBattD*rowStepH };
      } else {
        curTotal += net;
        curKwh.load   += (row.inputs.load_kw||0) * rowStepH;
        curKwh.pv     += (row.inputs.pv_kw||0)   * rowStepH;
        curKwh.gridImp += rImpKw * rowStepH;
        curKwh.gridExp += rExpKw * rowStepH;
        curKwh.battChg += rBattC * rowStepH;
        curKwh.battDis += rBattD * rowStepH;
      }
    }
    if (curDay) { dailyCosts[curDay] = Math.round(curTotal * 10000) / 10000; dailyKwh[curDay] = { ...curKwh }; }

    // Calculate current prices
    const rawBuyNow  = parseFloat(this._hass.states['sensor.nodered_buyprice']?.state  || 0);
    const rawSellNow = parseFloat(this._hass.states['sensor.nodered_sellprice']?.state || 0);
    const { buyP: nowBuyP, sellP: nowSellP } = _emec_getPrices(nowTs, provider, this._hass, rawBuyNow, rawSellNow);

    sbar.innerHTML = this._buildSbar(timeline, bs, summary, provider, nowTs, decisionFocus, nowBuyP, nowSellP);
    
    // Populate financials bar
    const financialsBar = this.shadowRoot.getElementById('finances-bar-future');
    if (financialsBar) {
      financialsBar.innerHTML = this._buildFinancialsBar(nowBuyP, nowSellP);
    }

    const tabAlerts = this.shadowRoot.getElementById('tab-alerts');
    const activePane = this.shadowRoot.querySelector('.pane.active');
    const isFutureTab = activePane?.id === 'pane-future';
    
    if (tabAlerts && isFutureTab) {
      let gridImportTime = '', gridExportTime = '', forceExportTime = '', forceImportTime = '';
      let gridImportTs = 0, gridExportTs = 0, forceExportTs = 0, forceImportTs = 0;
      let forceExportSellP = 0, forceImportBuyP = 0;
      
      const fmtAlertTime = (ts) => {
        const d = new Date(ts);
        const timeStr = d.toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit', hour12:true }).toLowerCase();
        const today = new Date().toLocaleDateString('en-CA');
        const eventDay = d.toLocaleDateString('en-CA');
        
        if (eventDay === today) {
          return timeStr;
        } else {
          const dayName = d.toLocaleDateString('en-AU', { weekday:'long' });
          return dayName + ' ' + timeStr;
        }
      };

      for (const row of timeline) {
        const ts = new Date(row.ts).getTime();
        if (ts < nowTs) continue;
        
        if (!gridImportTime && (row.expected.grid_import_kw||0) > 0.1) {
          gridImportTime = fmtAlertTime(ts);
          gridImportTs = ts;
        }
        if (!gridExportTime && (row.expected.grid_export_kw||0) > 0.1) {
          gridExportTime = fmtAlertTime(ts);
          gridExportTs = ts;
        }
        if (!forceExportTime && row.mode === 'FORCED_EXPORT') {
          forceExportTime = fmtAlertTime(ts);
          forceExportTs = ts;
          forceExportSellP = row.inputs.sell_price || 0;
        }
        if (!forceImportTime && row.mode === 'FORCED_CHARGE') {
          forceImportTime = fmtAlertTime(ts);
          forceImportTs = ts;
          forceImportBuyP = row.inputs.buy_price || 0;
        }
      }

      const feCol = forceExportSellP > 0 ? '#28a745' : '#ff9800';
      const fiCol = forceImportBuyP  < 0 ? '#28a745' : '#f44336';

      // Calculate current/next curtailment percentage for alert badge
      let currentCurtail = 0;
      for (const row of timeline) {
        const ts = new Date(row.ts).getTime();
        if (ts >= nowTs) {
          currentCurtail = row.setpoints?.curtail_pct || 0;
          break;
        }
      }

      // Determine curtailment pill background color (new thresholds: green=1-24%, yellow=25-49%, amber=50-74%, red=75-100%)
      let curtailPillBg = '#555'; // default grey for 0%
      if (currentCurtail > 0 && currentCurtail <= 24) {
        curtailPillBg = '#4caf50'; // green
      } else if (currentCurtail > 24 && currentCurtail <= 49) {
        curtailPillBg = '#ffeb3b'; // yellow
      } else if (currentCurtail > 49 && currentCurtail <= 74) {
        curtailPillBg = '#ff9800'; // amber
      } else if (currentCurtail > 74) {
        curtailPillBg = '#f44336'; // red
      }

      const curtailPill = currentCurtail > 0 ? '<span class="pill" style="background:' + curtailPillBg + ';color:#fff;" title="Solar production being limited. % shows how much of peak power is allowed. 0-25% = slight limit, 75%+ = severe curtailment">⚠️ Curtail On: ' + currentCurtail.toFixed(0) + '%</span>' : '';
      const weatherPill = bs?.weather_restrict ? '<span class="pill" style="background:#00bcd4;color:#fff;">⛈️ Export: Weather Restricted</span>' : '';
      const demandPill = bs?.demand_now ? '<span class="pill" style="background:#ff5722;color:#fff;">💲 Peak Period</span>' : '';
      
      // Dynamic Reserve badge (only shows if active)
      const dynReserve = plan?.debug?.dynamic_reserve;
      const dynamicReservePill = (dynReserve?.active) ? 
        '<span class="pill" style="background:#c72c48;color:#fff;" title="Battery discharge is constrained by dynamic reserve. Floor: ' + dynReserve.reserve_pct.toFixed(1) + '%">🗜️ Dynamic Reserve: On</span>' : '';

      tabAlerts.innerHTML =
        '<span style="color:#ff5722;font-weight:bold;margin-right:10px;">ALERTS:</span>' +
        weatherPill +
        curtailPill +
        dynamicReservePill +
        demandPill +
        (forceExportTime ? '<span class="pill" style="background:' + feCol + ';">⚠️ Forced Export: ' + forceExportTime + '</span>' : '') +
        (!forceExportTime && gridExportTime  ? '<span class="pill" style="background:#28a745;">⚠️ Grid Export: ' + gridExportTime + '</span>' : '') +
        (forceImportTime ? '<span class="pill" style="background:' + fiCol + ';">⚠️ Forced Import: ' + forceImportTime + '</span>' : '') +
        (!forceImportTime && gridImportTime  ? '<span class="pill" style="background:#e65100;">⚠️ Grid Import: ' + gridImportTime + '</span>' : '');
    } else if (tabAlerts) {
      tabAlerts.innerHTML = '';
    }

    const rows = [];
    let lastDay = '';

    for (const row of timeline) {
      const ts = new Date(row.ts).getTime();
      if (ts < nowTs) continue;
      const tsDate = new Date(ts);
      const day = tsDate.toLocaleDateString('en-CA');

      if (day !== lastDay) {
        lastDay = day;
        rows.push(this._buildDayHeaderRow(day, dailyCosts, dailyKwh, todayStr));
      }

      const dataRow = this._buildTimelineRow(row, provider, meta, nowTs);
      if (dataRow) rows.push(dataRow);
    }

    tbody.innerHTML = rows.join('');
    requestAnimationFrame(() => this._setWrapHeight());
  }

  _getRangeP() {
    const sel = this.shadowRoot.getElementById('range-past');
    const val = sel ? sel.value : 'today';
    const now = new Date();
    let start, end;
    if (val === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end   = now;
    } else if (val === 'yesterday') {
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      start = new Date(end - 86400000);
    } else {
      end   = now;
      start = new Date(end - parseInt(val) * 3600000);
    }
    return { start, end };
  }

  async _loadPast() {
    const st = this.shadowRoot.getElementById('st-past');
    const tb = this.shadowRoot.getElementById('tb-past');
    if (!st || !tb) return;

    try {
      const { start, end } = this._getRangeP();
      st.textContent = 'Fetching...';

      const provider = this._hass?.states['input_select.electricity_provider']?.state || 'Amber Electric';

      const result = await this._hass.callWS({
        type: 'history/history_during_period',
        start_time: start.toISOString(),
        end_time:   end.toISOString(),
        entity_ids: _EMEC_SENSORS,
        minimal_response: true,
        no_attributes:    true,
      });

      const lookup = {};
      for (const [eid, states] of Object.entries(result)) {
        lookup[eid] = states.map(s => ({
          t: (s.lu !== undefined ? s.lu : s.lc) * 1000,
          s: s.s
        })).sort((a,b) => a.t - b.t);
      }

      if (!lookup['sensor.inverter_load_power']?.length) {
        const sel = this.shadowRoot.getElementById('range-past');
        if (sel && sel.value === 'today') {
          st.textContent = 'No data yet — switching to Last 24h...';
          sel.value = '24';
          this._pastState = 'loading';
          setTimeout(() => this._loadPast(), 500);
          return;
        }
        tb.innerHTML = '<tr><td colspan="14" class="msg">⚠️ No sensor data for this period.</td></tr>';
        st.textContent = 'No data';
        this._pastState = 'ready';
        return;
      }

      const step    = 5 * 60 * 1000;
      const startMs = Math.ceil(start.getTime() / step) * step;
      const entries = [];
      for (let t = startMs; t <= end.getTime(); t += step) entries.push(t);
      entries.reverse();

      const pastDailyCosts = {};
      const pastDailyKwh = {};

      for (const ts of entries) {
        const dt = new Date(ts);
        const dayStr = dt.toLocaleDateString('en-CA');
        
        const gridImpKw = (parseFloat(_emec_getAt(lookup['sensor.inverter_import_power'], ts)) || 0) / 1000;
        const gridExpKw = (parseFloat(_emec_getAt(lookup['sensor.inverter_export_power'], ts)) || 0) / 1000;
        const solarKw = (parseFloat(_emec_getAt(lookup['sensor.inverter_pv_power'], ts)) || 0) / 1000;
        const loadKw = (parseFloat(_emec_getAt(lookup['sensor.inverter_load_power'], ts)) || 0) / 1000;
        const battCKw = (parseFloat(_emec_getAt(lookup['sensor.inverter_battery_charging_power'], ts)) || 0) / 1000;
        const battDKw = (parseFloat(_emec_getAt(lookup['sensor.inverter_battery_discharging_power'], ts)) || 0) / 1000;
        const buyP = parseFloat(_emec_getAt(lookup['sensor.nodered_buyprice'], ts)) || 0;
        const sellP = parseFloat(_emec_getAt(lookup['sensor.nodered_sellprice'], ts)) || 0;
        
        const stepHP = 5 / 60;
        const cost = (gridImpKw * buyP - gridExpKw * sellP) * stepHP;
        
        if (!pastDailyCosts.hasOwnProperty(dayStr)) {
          pastDailyCosts[dayStr] = 0;
          pastDailyKwh[dayStr] = { load: 0, pv: 0, gridImp: 0, gridExp: 0, battChg: 0, battDis: 0 };
        }
        
        pastDailyCosts[dayStr] += cost;
        pastDailyKwh[dayStr].load += loadKw * stepHP;
        pastDailyKwh[dayStr].pv += solarKw * stepHP;
        pastDailyKwh[dayStr].gridImp += gridImpKw * stepHP;
        pastDailyKwh[dayStr].gridExp += gridExpKw * stepHP;
        pastDailyKwh[dayStr].battChg += battCKw * stepHP;
        pastDailyKwh[dayStr].battDis += battDKw * stepHP;
      }

      const rows = [];
      let lastDay = '';

      for (const ts of entries) {
        const dt      = new Date(ts);
        const dayStr  = dt.toLocaleDateString('en-CA');
        const dayStrDisplay = dt.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
        const timeStr = dt.toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit', hour12:false });

        if (dayStr !== lastDay) {
          lastDay = dayStr;
          rows.push(this._buildDayHeaderRowPast(dayStr, pastDailyCosts, pastDailyKwh, dayStrDisplay));
        }

        const gridImpKw = (parseFloat(_emec_getAt(lookup['sensor.inverter_import_power'], ts)) || 0) / 1000;
        const gridExpKw = (parseFloat(_emec_getAt(lookup['sensor.inverter_export_power'], ts)) || 0) / 1000;
        const solarKw   = (parseFloat(_emec_getAt(lookup['sensor.inverter_pv_power'],     ts)) || 0) / 1000;
        const loadKw    = (parseFloat(_emec_getAt(lookup['sensor.inverter_load_power'],   ts)) || 0) / 1000;
        const battCKw   = (parseFloat(_emec_getAt(lookup['sensor.inverter_battery_charging_power'],    ts)) || 0) / 1000;
        const battDKw   = (parseFloat(_emec_getAt(lookup['sensor.inverter_battery_discharging_power'], ts)) || 0) / 1000;
        const gridThreshold = (this._settings?.gridThreshold || 10) / 1000; // Convert W to kW
        const batteryThreshold = (this._settings?.batteryThreshold || 10) / 1000; // Convert W to kW
        const gridKw    = gridExpKw > gridThreshold ? -gridExpKw : gridImpKw > gridThreshold ? gridImpKw : 0;
        const battKw    = battCKw   > batteryThreshold ? battCKw    : battDKw   > batteryThreshold ? -battDKw  : 0;
        const rawBuyP   = parseFloat(_emec_getAt(lookup['sensor.nodered_buyprice'],  ts)) || 0;
        const rawSellP  = parseFloat(_emec_getAt(lookup['sensor.nodered_sellprice'], ts)) || 0;
        let { buyP, sellP, inSuper, stdSellP, otherSellP, mins, stdStart, stdEnd } = _emec_getPrices(ts, provider, this._hass, rawBuyP, rawSellP);

        let capHit = false;
        if (provider === 'Globird' && inSuper) {
          const superCapKwhP = parseFloat(this._hass.states['input_number.globird_super_max_export']?.state || 10);
          const dailyExpP    = parseFloat(_emec_getAt(lookup['sensor.daily_exported_energy'], ts)) || 0;
          if (dailyExpP >= superCapKwhP) {
            sellP  = _emec_inWindow(mins, stdStart, stdEnd) ? stdSellP : otherSellP;
            capHit = true;
          }
        }

        const stepHP = 5 / 60;
        const cost = (gridImpKw * buyP - gridExpKw * sellP) * stepHP;

        const soc     = parseFloat(_emec_getAt(lookup['sensor.inverter_battery_level'],            ts)) || 0;
        if (soc === 0 && battCKw === 0 && battDKw === 0 && loadKw === 0) continue;

        const cls     = _emec_classifyPast(solarKw, gridImpKw, gridExpKw, battCKw, battDKw, gridThreshold);
        const c       = this._colorSettings[cls.color] || _EMEC_COLOURS[cls.color] || { bg:'transparent', txt:'var(--primary-text-color)', cost:'var(--primary-text-color)' };
        const gridCol = gridKw < 0 ? '#4caf50' : gridKw > 0 ? '#f44336' : c.txt;
        const battCol = battKw < 0 ? '#f44336' : battKw > 0 ? '#4caf50' : c.txt;
        const socCol  = soc <= 20 ? '#f44336'  : soc >= 75 ? '#4caf50'  : c.txt;

        let costDisp, costCol;
        if (gridExpKw > 0.2 && cost < -0.0001) {
          costDisp = _EMEC_CUR + Math.abs(cost).toFixed(3);
          costCol  = '#4caf50';
        } else if (gridImpKw > 0.2 && cost > 0.0001) {
          costDisp = '-' + _EMEC_CUR + cost.toFixed(3);
          costCol  = '#f44336';
        } else {
          costDisp = '—';
          costCol  = c.txt;
        }

        const eLoad = loadKw * stepHP;
        const eSolar = solarKw * stepHP;
        const eGrid = gridKw * stepHP;
        const eBatt = battKw * stepHP;

        const fmtKw  = (v) => Math.abs(v) < 0.005 ? '<span style="color:' + c.txt + ';">—</span>' : '<span style="color:' + c.txt + ';">' + v.toFixed(3) + '</span>';
        const fmtGKw = (v) => Math.abs(v) < 0.005 ? '<span style="color:' + c.txt + ';">—</span>' : '<span style="color:' + gridCol + ';">' + v.toFixed(3) + '</span>';
        const fmtBKw = (v) => Math.abs(v) < 0.005 ? '<span style="color:' + c.txt + ';">—</span>' : '<span style="color:' + battCol + ';">' + v.toFixed(3) + '</span>';
        const fmtKwh = (v) => Math.abs(v) > 0.001 ? v.toFixed(3) : '—';
        const fmtGKwh = (v) => Math.abs(v) > 0.001 ? '<span style="color:' + gridCol + ';">' + (v < 0 ? '-' : '') + Math.abs(v).toFixed(3) + '</span>' : '—';
        const fmtBKwh = (v) => Math.abs(v) > 0.001 ? '<span style="color:' + battCol + ';">' + (v < 0 ? '-' : '') + Math.abs(v).toFixed(3) + '</span>' : '—';

        rows.push('<tr style="background-color:' + c.bg + ';color:' + c.txt + ';">' +
          '<td>' + timeStr + '</td>' +
          '<td><span title="">' + cls.label + '</span></td>' +
          '<td class="bgl">' + this._fmtPrice(buyP)    + '</td>' +
          '<td class="bgi" style="opacity:1;font-size:12px;">' + this._fmtPrice(sellP) + (capHit ? ' ⚠' : '') + '</td>' +
          '<td class="bgl">' + fmtKw(loadKw) + '</td>' +
          '<td class="bgi">' + fmtKwh(eLoad) + '</td>' +
          '<td class="bgl">' + fmtKw(solarKw) + '</td>' +
          '<td class="bgi">' + fmtKwh(eSolar) + '</td>' +
          '<td class="bgl">' + fmtGKw(gridKw) + '</td>' +
          '<td class="bgi">' + fmtGKwh(eGrid) + '</td>' +
          '<td class="bgl">' + fmtBKw(battKw) + '</td>' +
          '<td class="bgi">' + fmtBKwh(eBatt) + '</td>' +
          '<td class="bgi"><span style="color:' + socCol  + ';">' + soc.toFixed(1)   + '</span></td>' +
          '<td class="bgl"><span style="color:' + costCol + ';font-weight:bold;">' + costDisp + '</span></td>' +
          '</tr>');
      }

      tb.innerHTML = rows.join('');
      
      requestAnimationFrame(() => this._setWrapHeight());
      const sel2 = this.shadowRoot.getElementById('range-past');
      st.textContent = entries.length + ' readings — ' + (sel2 ? sel2.options[sel2.selectedIndex].text : '');
      this._pastState = 'ready';

    } catch(e) {
      const tb2 = this.shadowRoot.getElementById('tb-past');
      if (tb2) tb2.innerHTML = '<tr><td colspan="14" class="err">⚠️ ' + e.message + '</td></tr>';
      const st2 = this.shadowRoot.getElementById('st-past');
      if (st2) st2.textContent = 'Error — ' + e.message.slice(0,60);
      this._pastState = 'ready';
    }
  }

  _openLegendModal() {
    const modal = this.shadowRoot.getElementById('legend-modal');
    if (modal) {
      modal.style.display = 'flex';
      this._populateLegendModal();
    }
  }

  _populateLegendModal() {
    const container = this.shadowRoot.getElementById('legend-items');
    if (!container) return;
    
    const gridThreshold = (this._settings?.gridThreshold || 10) / 1000;
    const T = gridThreshold;
    
    // Generate all possible event classifications
    const events = new Map();
    
    // Solar scenarios
    const solarEvents = [
      _emec_classifyFuture('SELF_CONSUMPTION', 5, 0, 0, 0.5, 0, 0, 50, gridThreshold),
      _emec_classifyFuture('SELF_CONSUMPTION', 5, 0, 2, 3, 0, 0, 50, gridThreshold),
      _emec_classifyFuture('SELF_CONSUMPTION', 5, 0, 3, 2, 0, 0, 50, gridThreshold),
      _emec_classifyFuture('SELF_CONSUMPTION', 5, 0, 2, 1.5, 0, 0, 50, gridThreshold),
      _emec_classifyFuture('SELF_CONSUMPTION', 5, 2, 0, 0, 0, 0, 50, gridThreshold),
    ];
    
    // Battery scenarios
    const batteryEvents = [
      _emec_classifyFuture('SELF_CONSUMPTION', 0, 0, 0, 0, 3, 0, 50, gridThreshold),
      _emec_classifyFuture('SELF_CONSUMPTION', 0, 0, 2, 0, 2, 0, 50, gridThreshold),
      _emec_classifyFuture('SELF_CONSUMPTION', 0, 0, 2, 0, 2, 0, 50, gridThreshold),
      _emec_classifyFuture('SELF_CONSUMPTION', 0, 2, 0, 0, 0, 0, 50, gridThreshold),
    ];
    
    // Forced charge/export
    const forcedEvents = [
      _emec_classifyFuture('FORCED_CHARGE', 0, 3, 0, 2, 0, 0, 50, gridThreshold),
      _emec_classifyFuture('FORCED_CHARGE', 5, 0, 0, 2, 0, 0, 50, gridThreshold),
      _emec_classifyFuture('FORCED_EXPORT', 5, 0, 3, 0, 0, 0, 50, gridThreshold),
      _emec_classifyFuture('FORCED_EXPORT', 0, 0, 3, 0, 2, 0, 50, gridThreshold),
    ];
    
    // Collect unique events
    const allEvents = [...solarEvents, ...batteryEvents, ...forcedEvents].filter(e => e && !events.has(e.label));
    allEvents.forEach(e => events.set(e.label, e));
    
    // Sort by label
    const sorted = Array.from(events.values()).sort((a, b) => a.label.localeCompare(b.label));
    
    // Build HTML
    let html = '<div style="font-size:12px;">';
    for (const event of sorted) {
      html += '<div style="padding:8px;margin:4px 0;background:rgba(200,200,200,0.1);border-radius:4px;border-left:3px solid #555;">' +
        '<div style="font-weight:bold;color:var(--primary-text-color);margin-bottom:2px;">' + event.label + '</div>' +
        '<div style="color:var(--secondary-text-color);font-size:11px;">' + event.note + '</div>' +
        '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  _applyLegendFilters() {
    const solar = this.shadowRoot.getElementById('filter-solar')?.checked;
    const batt = this.shadowRoot.getElementById('filter-battery')?.checked;
    const grid = this.shadowRoot.getElementById('filter-grid')?.checked;
    const self = this.shadowRoot.getElementById('filter-self')?.checked;
    const profit = this.shadowRoot.getElementById('filter-profit')?.checked;
    const cost = this.shadowRoot.getElementById('filter-cost')?.checked;
    
    const items = this.shadowRoot.querySelectorAll('#legend-items > div');
    items.forEach(item => {
      const label = item.querySelector('div:first-child')?.textContent || '';
      const desc = item.querySelector('div:last-child')?.textContent || '';
      
      const powerOk = (solar && label.includes('🌞')) || (batt && label.includes('🔋')) || (grid && label.includes('⚡'));
      
      const isProfit = label.includes('(Force)') || label.includes('Grid') && label.includes('→') && (label.includes('Export') || label.includes('Profit'));
      const isCost = desc.includes('cost') || desc.includes('peak tariff') || desc.includes('import');
      const isSelf = label.includes('Self Consumption') || (label.includes('Solar') && !label.includes('Grid')) || (label.includes('Battery') && !label.includes('Grid'));
      
      const catOk = (self && isSelf) || (profit && isProfit) || (cost && isCost);
      
      item.style.display = (powerOk && catOk) ? 'block' : 'none';
    });
  }

  _fmtPrice(v) {
    const decimals = this._settings?.priceDecimals || 3;
    return (v < 0 ? '-' : '') + _EMEC_CUR + Math.abs(v).toFixed(decimals);
  }

  getCardSize() { return 12; }

  // ── Settings Modal Functions ──────────────────────────────────────────────
  
  _initializeSettings() {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('em_events_card_settings');
    if (savedSettings) {
      this._settings = JSON.parse(savedSettings);
    } else {
      this._settings = {
        loadThreshold: 5,
        solarThreshold: 5,
        gridThreshold: 10,
        batteryThreshold: 10,
        priceDecimals: 3
      };
      this._saveSettings();
    }
  }

  _saveSettings() {
    localStorage.setItem('em_events_card_settings', JSON.stringify(this._settings));
  }

  _populateColorPickers() {
    // Step 1: Set all color picker values from _colorSettings
    const colorPickers = this.shadowRoot.querySelectorAll('.color-picker');
    
    colorPickers.forEach(picker => {
      // Extract color name from id: "color-green-bg" → "green", "bg"
      const parts = picker.id.match(/color-(.+?)-(bg|txt|cost)$/);
      if (!parts || picker.disabled) return;  // Skip disabled pickers
      
      const colorName = parts[1];  // "green", "yellow", "teal", "pink"
      const colorKey = parts[2];   // "bg", "txt", "cost"
      
      const colorValue = this._colorSettings[colorName]?.[colorKey];
      if (colorValue) {
        picker.value = colorValue;
      }
    });
    
    // Step 2: Wire event handlers (mark as wired to avoid double-binding)
    colorPickers.forEach(picker => {
      if (picker._wired || picker.disabled) return;  // Skip if already wired or disabled
      picker._wired = true;
      
      const parts = picker.id.match(/color-(.+?)-(bg|txt|cost)$/);
      if (!parts) return;
      
      const colorName = parts[1];
      const colorKey = parts[2];
      
      picker.addEventListener('change', (e) => {
        const newValue = e.target.value;
        
        // Update in memory
        if (!this._colorSettings[colorName]) {
          this._colorSettings[colorName] = { bg: '#fff', txt: '#000', cost: '#000' };
        }
        this._colorSettings[colorName][colorKey] = newValue;
        
        // Save to localStorage
        try {
          localStorage.setItem('em-events-card-colors', JSON.stringify(this._colorSettings));
        } catch (err) {
          console.error('Failed to save color settings:', err);
        }
        
        // Rebuild tables immediately
        if (this._activeTab === 'future') {
          this._renderFuture();
        } else {
          this._renderPast();
        }
      });
    });
    
    // Step 3: Wire reset button
    const resetBtn = this.shadowRoot.getElementById('reset-colors-btn');
    if (resetBtn && !resetBtn._wired) {
      resetBtn._wired = true;
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Reset colors to defaults
        this._colorSettings = JSON.parse(JSON.stringify(_EMEC_COLOURS));
        
        // Update all picker values
        const pickers = this.shadowRoot.querySelectorAll('.color-picker:not([disabled])');
        pickers.forEach(picker => {
          const parts = picker.id.match(/color-(.+?)-(bg|txt|cost)$/);
          if (!parts) return;
          
          const colorName = parts[1];
          const colorKey = parts[2];
          
          if (this._colorSettings[colorName]) {
            picker.value = this._colorSettings[colorName][colorKey];
          }
        });
        
        // Save to localStorage
        try {
          localStorage.setItem('em-events-card-colors', JSON.stringify(this._colorSettings));
        } catch (err) {
          console.error('Failed to save color settings:', err);
        }
        
        // Rebuild tables
        if (this._activeTab === 'future') {
          this._renderFuture();
        } else {
          this._renderPast();
        }
      });
    }
  }

  _exportSettings() {
    // Collect all settings to export
    const allSettings = {
      version: _EMEC_VERSION,
      exportDate: new Date().toISOString(),
      thresholds: this._settings,
      colors: this._colorSettings
    };
    
    // Convert to JSON string with indentation
    const json = JSON.stringify(allSettings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger
    const a = document.createElement('a');
    a.href = url;
    a.download = `em-events-card-backup-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}.json`;
    a.click();
    
    // Cleanup
    URL.revokeObjectURL(url);
  }

  _importSettings(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validate backup format
        if (!data.thresholds || !data.colors) {
          alert('Invalid backup file format. Please use a file exported from Energy Manager Events Card.');
          return;
        }
        
        // Apply threshold settings
        if (data.thresholds) {
          this._settings = {
            loadThreshold: data.thresholds.loadThreshold || 5,
            solarThreshold: data.thresholds.solarThreshold || 5,
            gridThreshold: data.thresholds.gridThreshold || 10,
            batteryThreshold: data.thresholds.batteryThreshold || 10,
            priceDecimals: data.thresholds.priceDecimals || 3
          };
        }
        
        // Apply color settings
        if (data.colors) {
          this._colorSettings = data.colors;
        }
        
        // Save to localStorage
        try {
          localStorage.setItem('em_events_card_settings', JSON.stringify(this._settings));
          localStorage.setItem('em-events-card-colors', JSON.stringify(this._colorSettings));
        } catch (err) {
          console.error('Failed to save imported settings:', err);
        }
        
        alert('Settings imported successfully! Reloading...');
        window.location.reload();
      } catch (error) {
        alert('Error reading backup file: ' + error.message);
      }
    };
    reader.readAsText(file);
  }


  _loadThresholdInputs() {
    const inputs = {
      load: this.shadowRoot.getElementById('settings-load-threshold'),
      pv: this.shadowRoot.getElementById('settings-solar-threshold'),
      grid: this.shadowRoot.getElementById('settings-grid-threshold'),
      battery: this.shadowRoot.getElementById('settings-battery-threshold'),
      decimals: this.shadowRoot.getElementById('settings-price-decimals')
    };
    
    if (inputs.load) inputs.load.value = this._settings?.loadThreshold || 5;
    if (inputs.pv) inputs.pv.value = this._settings?.solarThreshold || 5;
    if (inputs.grid) inputs.grid.value = this._settings?.gridThreshold || 10;
    if (inputs.battery) inputs.battery.value = this._settings?.batteryThreshold || 10;
    if (inputs.decimals) inputs.decimals.value = this._settings?.priceDecimals || 3;
    
    this._updateKwhDisplays();
  }

  _updateKwhDisplays() {
    const types = [
      { key: 'load', prefix: 'load' },
      { key: 'pv', prefix: 'pv' },
      { key: 'grid', prefix: 'grid' },
      { key: 'battery', prefix: 'battery' }
    ];
    
    types.forEach(type => {
      const input = this.shadowRoot.getElementById(`settings-${type.key}-threshold`);
      const wValue = parseFloat(input?.value) || (type.key === 'load' || type.key === 'pv' ? 5 : 10);
      
      // Calculate kWh for 5min and 30min intervals
      const kw = wValue / 1000;
      const kwh5min = kw * (5 / 60);
      const kwh30min = kw * (30 / 60);
      
      // Update display
      const span5min = this.shadowRoot.getElementById(`${type.prefix}-kwh-5min`);
      const span30min = this.shadowRoot.getElementById(`${type.prefix}-kwh-30min`);
      if (span5min) span5min.textContent = kwh5min.toFixed(5);
      if (span30min) span30min.textContent = kwh30min.toFixed(5);
    });
  }

  _openSettingsModal() {
    const modal = this.shadowRoot.getElementById('settings-modal');
    if (!modal) return;
    
    this._initializeSettings();
    this._loadThresholdInputs();
    modal.style.display = 'flex';
  }

  _closeSettingsModal() {
    const modal = this.shadowRoot.getElementById('settings-modal');
    if (modal) modal.style.display = 'none';
  }

  _applySettings() {
    const load = parseFloat(this.shadowRoot.getElementById('settings-load-threshold')?.value) || 5;
    const pv = parseFloat(this.shadowRoot.getElementById('settings-solar-threshold')?.value) || 5;
    const grid = parseFloat(this.shadowRoot.getElementById('settings-grid-threshold')?.value) || 10;
    const battery = parseFloat(this.shadowRoot.getElementById('settings-battery-threshold')?.value) || 10;
    const decimals = parseInt(this.shadowRoot.getElementById('settings-price-decimals')?.value) || 3;
    
    // Validate
    if (load < 0 || pv < 0 || grid < 0 || battery < 0) {
      alert('Thresholds cannot be negative');
      return;
    }
    
    // Save to settings
    this._settings = {
      loadThreshold: load,
      solarThreshold: pv,
      gridThreshold: grid,
      batteryThreshold: battery,
      priceDecimals: decimals
    };
    this._saveSettings();
    
    // Close modal and refresh display
    this._closeSettingsModal();
    
    // Refresh the active tab with new thresholds
    if (this._activeTab === 'future') {
      this._renderFuture();
    } else {
      this._loadPast();
    }
  }

  _resetSettings() {
    // Reset to defaults
    this._settings = {
      loadThreshold: 5,
      solarThreshold: 5,
      gridThreshold: 10,
      batteryThreshold: 10,
      priceDecimals: 3
    };
    this._saveSettings();
    this._loadThresholdInputs();
  }

}

if (!customElements.get('em-events-card')) {
  customElements.define('em-events-card', EmEventsCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === 'em-events-card')) {
  window.customCards.push({
    type: 'em-events-card',
    name: 'EM Events Card',
    description: 'Energy Manager future decisions and past events in one card',
  });
}
