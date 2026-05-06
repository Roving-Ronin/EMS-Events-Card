// HAEO Events Card v2.4.1b
// Combines Future Decisions (forecast) and Past Events (history) in one card
// Enhanced with: Smart Alert Pills, single-pass day totals, improved formatting
// Requires: sensor.grid_net_cost + associated HAEO sensors
// Copy to /config/www/haeo-events-card.js
// Add resource: /local/haeo-events-card.js (type: JavaScript module)
//
// Card YAML config options (all optional — defaults used if omitted):
//   type: custom:haeo-events-card
//   grid_options:
//     columns: full
//
// ── FUTURE tab: HAEO optimizer sensors (forecast attributes) ──
// Units are auto-detected from unit_of_measurement and normalised to kW internally.
//   entity_haeo_battery:       sensor.battery_active_power       # +ve=discharge, -ve=charge
//   entity_haeo_grid:          sensor.grid_active_power          # +ve=import, -ve=export
//   entity_haeo_load:          sensor.load_power
//   entity_haeo_solar:         sensor.solar_power
//   entity_haeo_soc:           sensor.battery_state_of_charge
//   entity_haeo_buy_price:     number.grid_import_price
//   entity_haeo_sell_price:    number.grid_export_price
//   entity_haeo_grid_net_cost: sensor.grid_net_cost
//
// ── PAST tab: inverter power sensors (actual measured values) ──
// Defaults are Sigenergy Local Modbus. Override for other inverter integrations.
//   entity_past_battery_power: sensor.sigen_plant_battery_power      # -ve=discharge, +ve=charge
//   entity_past_load_power:    sensor.sigen_plant_total_load_power    # always +ve
//   entity_past_solar_power:   sensor.sigen_plant_pv_power            # always +ve
//   entity_past_grid_power:    sensor.sigen_plant_grid_active_power   # +ve=import, -ve=export
//
// ── PAST tab: inverter energy sensors (total_increasing, for kWh delta columns) ──
// IMPORTANT: Use lifetime/total sensors wherever possible. Daily or monthly sensors
// reset at midnight/month-end causing gaps (shown as —) across multi-day lookbacks.
//   entity_past_load_energy:               sensor.sigen_plant_total_load_consumption        # Lifetime
//   entity_past_solar_energy:              sensor.sigen_plant_total_pv_generation            # Lifetime
//   entity_past_grid_import_energy:        sensor.sigen_plant_total_imported_energy          # Lifetime
//   entity_past_grid_export_energy:        sensor.sigen_plant_total_exported_energy          # Lifetime
//   entity_past_battery_charge_energy:     sensor.sigen_plant_daily_battery_charge_energy    # Daily reset
//   entity_past_battery_discharge_energy:  sensor.sigen_plant_daily_battery_discharge_energy # Daily reset

const _HAEO_VERSION = 'v2.4.3b';

// ── Default sensor entity IDs ────────────────────────────────────────────────
// Power sensors: provided by HAEO optimizer — same for all installs
// Energy sensors: provided by inverter integration — Sigenergy Local Modbus defaults
const _HAEO_DEFAULTS = {
  // ── FUTURE tab: HAEO optimizer sensors ──
  haeo_battery:       'sensor.battery_active_power',    // +ve=discharge, -ve=charge
  haeo_grid:          'sensor.grid_active_power',        // +ve=import,    -ve=export
  haeo_load:          'sensor.load_power',
  haeo_solar:         'sensor.solar_power',
  haeo_soc:           'sensor.battery_state_of_charge',
  haeo_buy_price:     'number.grid_import_price',
  haeo_sell_price:    'number.grid_export_price',
  haeo_grid_net_cost: 'sensor.grid_net_cost',
  haeo_export_limit:  'number.grid_export_limit',
  haeo_import_limit:  'number.grid_import_limit',
  haeo_batt_charge_limit:    'number.battery_max_charge_power',
  haeo_batt_discharge_limit: 'number.battery_max_discharge_power',
  // ── PAST tab: inverter power sensors (Sigenergy Local Modbus defaults) ──
  past_battery_power: 'sensor.sigen_plant_battery_power',       // -ve=discharge, +ve=charge
  past_load_power:    'sensor.sigen_plant_total_load_power',    // always +ve
  past_solar_power:   'sensor.sigen_plant_pv_power',            // always +ve
  past_grid_power:    'sensor.sigen_plant_grid_active_power',   // +ve=import, -ve=export
  // ── PAST tab: inverter energy sensors (total_increasing, Sigenergy Local Modbus defaults) ──
  past_load_energy:              'sensor.sigen_plant_total_load_consumption',        // Lifetime
  past_solar_energy:             'sensor.sigen_plant_total_pv_generation',            // Lifetime
  past_grid_import_energy:       'sensor.sigen_plant_total_imported_energy',          // Lifetime
  past_grid_export_energy:       'sensor.sigen_plant_total_exported_energy',          // Lifetime
  past_battery_charge_energy:    'sensor.sigen_plant_daily_battery_charge_energy',    // Daily reset
  past_battery_discharge_energy: 'sensor.sigen_plant_daily_battery_discharge_energy', // Daily reset
};

// ── Colour scheme ─────────────────────────────────────────────────────────────
const _HAEO_COLOURS = {
  solar_green: { bg: '#ccffcc', txt: '#333333', cost: '#333333' },
  solar:       { bg: '#ffffcc', txt: '#333333', cost: '#333333' },
  teal:        { bg: '#ccfff5', txt: '#333333', cost: '#333333' },
  pink:        { bg: '#ffe0e0', txt: '#333333', cost: '#cc3333' },
  red:         { bg: 'rgba(180,50,50,0.35)', txt: '#ffffff', cost: '#ffaaaa' },
  green:       { bg: 'rgba(30,150,80,0.55)',  txt: '#ffffff', cost: '#90ffb0' },
};

// ── Legend ────────────────────────────────────────────────────────────────────
const _HAEO_LEG_L = [
  ['#ccffcc','#333','🌞 Solar → 🏠 Home','Self Consumption - Solar'],
  ['#ccffcc','#333','🌞 Solar → 🏠 Home + 🔋 Battery','Self Consumption - Charge Battery'],
  ['#ccffcc','#333','🌞 Solar → 🏠 Home + ⚡ Grid','Profit - Grid Export (Solar)'],
  ['#ccffcc','#333','🌞 Solar → 🏠 Home + 🔋 Battery + ⚡ Grid','Profit - Grid Export + Charge Battery'],
  ['#ccfff5','#333','🌞 Solar + 🔋 Battery → 🏠 Home','Self Consumption - No Grid'],
  ['#ffe0e0','#333','🌞 Solar + ⚡ Grid → 🏠 Home','Cost - Solar + Grid Import'],
  ['#ffe0e0','#333','🌞 Solar + ⚡ Grid → 🏠 Home + 🔋 Battery (Force)','Cost - Solar + Grid Import + Charge Battery'],
  ['#ffe0e0','#333','🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force)','Profit - Grid Export (Forced)'],
];

const _HAEO_LEG_R = [
  ['#ccfff5','#333','🔋 Battery → 🏠 Home','Self Consumption - Battery'],
  ['#ffffcc','#333','🔋 Battery → 🏠 Home + ⚡ Grid (Force)','Profit - Grid Export (Forced)'],
  ['#ffe0e0','#333','🔋 Battery + ⚡ Grid → 🏠 Home','Cost - Battery + Grid Import'],
  ['rgba(180,50,50,0.35)','#fff','⚡ Grid → 🏠 Home','Cost - Grid Import (Battery Idle | No Solar)'],
  ['rgba(180,50,50,0.35)','#fff','⚡ Grid → 🏠 Home + 🔋 Battery (Force)','Cost - Grid Import (Forced Battery Charge)'],
  ['#ffe0e0','#333','🌞 Solar + 🔋 Battery + ⚡ Grid → 🏠 Home','Cost - Solar + Battery + Grid Import'],
  ['#ccfff5','#333','🚗 EV Charger','Placeholder - EV Charger'],
  ['#ccfff5','#333','❄️ 🚿 Scheduled Load(s)','Placeholder - HVAC, HWS - Surplus Solar'],
];

// ── Determine Mode and Focus from classification ────────────────────────────
function _haeo_getModeAndFocus(label) {
  let mode = '', focus = '';
  let modeColor = '#9c27b0', focusColor = '#555';
  
  // Determine mode from label keywords
  if (label.includes('Self Consumption') || label.includes('Battery → 🏠') || label.includes('Solar → 🏠')) {
    mode = 'SELF CONSUMPTION';
    modeColor = '#28a745'; // green
    focus = 'Optimising Self Use';
    focusColor = '#28a745';
  } else if (label.includes('Profit') || label.includes('Grid Export') || label.includes('→ ⚡ Grid')) {
    mode = 'MAXIMISE PROFIT';
    modeColor = '#FF6B2C'; // orange
    focus = 'Optimising Grid Export';
    focusColor = '#FF6B2C';
  } else if (label.includes('Cost') || label.includes('Grid Import') || label.includes('⚡ Grid →')) {
    mode = 'MINIMISE COST';
    modeColor = '#2196F3'; // blue
    focus = 'Optimising Grid Import';
    focusColor = '#2196F3';
  }
  
  return { mode, focus, modeColor, focusColor };
}

// ── Classify future ───────────────────────────────────────────────────────────
// battKw: positive = discharge, negative = charge
// gridKw: positive = export,    negative = import
function _haeo_classifyFuture(solarKw, loadKw, battKw, gridKw) {
  const T = 0.05;
  const charging    = battKw < -T;
  const discharging = battKw > T;
  const exporting   = gridKw < -T;  // negative = export
  const importing   = gridKw > T;   // positive = import

  // ── Force export (battery discharging to grid) ──
  if (exporting && discharging && solarKw > T)
    return { label: '🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced export: solar and battery exporting to grid', color: 'green' };
  if (exporting && discharging)
    return { label: '🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced discharge: battery exporting to grid', color: 'solar' };

  // ── Forced grid charge ──
  if (charging && importing && solarKw > T)
    return { label: '🌞 Solar + ⚡ Grid → 🏠 Home + 🔋 Battery (Force)', note: 'Solar + forced grid charging battery', color: 'pink' };
  if (charging && importing)
    return { label: '⚡ Grid → 🏠 Home + 🔋 Battery (Force)', note: 'Forced grid charging — cheap rate window', color: 'red' };
  if (charging && solarKw > T)
    return { label: '🌞 Solar → 🏠 Home + 🔋 Battery', note: 'Solar covering home and charging battery — no grid', color: 'solar_green' };

  // ── Solar scenarios ──
  if (solarKw > T && exporting && battKw > T)
    return { label: '🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Solar and battery covering home and exporting', color: 'green' };
  if (solarKw > T && exporting && charging)
    return { label: '🌞 Solar → 🏠 Home + 🔋 Battery + ⚡ Grid', note: 'Solar covering home, charging battery and exporting', color: 'solar_green' };
  if (solarKw > T && exporting)
    return { label: '🌞 Solar → 🏠 Home + ⚡ Grid', note: 'Solar covering home and exporting surplus', color: 'solar_green' };
  if (solarKw > T && discharging && importing)
    return { label: '🌞 Solar + 🔋 Battery + ⚡ Grid → 🏠 Home', note: 'Solar and battery discharging but grid also needed', color: 'pink' };
  if (solarKw > T && discharging)
    return { label: '🌞 Solar + 🔋 Battery → 🏠 Home', note: 'Solar and battery together covering home — no grid', color: 'teal' };
  if (solarKw > T && importing)
    return { label: '🌞 Solar + ⚡ Grid → 🏠 Home', note: 'Solar and grid together covering home', color: 'pink' };
  if (solarKw > T && charging)
    return { label: '🌞 Solar → 🏠 Home + 🔋 Battery', note: 'Solar covering home and charging battery — no grid', color: 'solar_green' };
  if (solarKw > T)
    return { label: '🌞 Solar → 🏠 Home', note: 'Solar covering home — no battery, no grid', color: 'solar_green' };

  // ── No solar ──
  if (discharging && exporting)
    return { label: '🔋 Battery → 🏠 Home + ⚡ Grid (Force)', note: 'Forced discharge: battery exporting to grid', color: 'solar' };
  if (discharging && importing)
    return { label: '🔋 Battery + ⚡ Grid → 🏠 Home', note: 'Battery discharging but grid supplement needed', color: 'pink' };
  if (discharging)
    return { label: '🔋 Battery → 🏠 Home', note: 'Battery powering home — no solar, no grid', color: 'teal' };
  if (importing && charging)
    return { label: '⚡ Grid → 🏠 Home + 🔋 Battery (Force)', note: 'Forced grid charging — cheap rate window', color: 'red' };
  if (importing)
    return { label: '⚡ Grid → 🏠 Home', note: 'Grid covering home — battery idle', color: 'red' };
  // Fallback: load present but source not explicit in forecast
  if (loadKw > T)
    return { label: '🔋 Battery → 🏠 Home', note: 'Inferred: battery powering home — no explicit source in forecast', color: 'teal' };
  return { label: '—', note: '', color: '' };
}

// ── Classify past ─────────────────────────────────────────────────────────────
function _haeo_classifyPast(solarKw, loadKw, battKw, gridKw) {
  const T = 0.10;
  const charging    = battKw < -T;
  const discharging = battKw > T;
  const exporting   = gridKw < -T;  // negative = export
  const importing   = gridKw > T;   // positive = import

  // Force export (battery discharging to grid)
  if (exporting && discharging && solarKw > T)
    return { label: '🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force)', color: 'green' };
  if (exporting && discharging)
    return { label: '🔋 Battery → 🏠 Home + ⚡ Grid (Force)', color: 'solar' };
  // Solar with export
  if (solarKw > T && exporting && charging)
    return { label: '🌞 Solar → 🏠 Home + 🔋 Battery + ⚡ Grid', color: 'solar_green' };
  if (solarKw > T && exporting)
    return { label: '🌞 Solar → 🏠 Home + ⚡ Grid', color: 'solar_green' };
  // Forced grid charge
  if (charging && importing && solarKw > T)
    return { label: '🌞 Solar + ⚡ Grid → 🏠 Home + 🔋 Battery (Force)', color: 'pink' };
  if (charging && importing)
    return { label: '⚡ Grid → 🏠 Home + 🔋 Battery (Force)', color: 'red' };
  if (charging && solarKw > T)
    return { label: '🌞 Solar → 🏠 Home + 🔋 Battery', color: 'solar_green' };
  // Solar self-consumption
  if (solarKw > T && discharging && importing)
    return { label: '🌞 Solar + 🔋 Battery + ⚡ Grid → 🏠 Home', color: 'pink' };
  if (solarKw > T && discharging)
    return { label: '🌞 Solar + 🔋 Battery → 🏠 Home', color: 'teal' };
  if (solarKw > T && importing)
    return { label: '🌞 Solar + ⚡ Grid → 🏠 Home', color: 'pink' };
  if (solarKw > T)
    return { label: '🌞 Solar → 🏠 Home', color: 'solar_green' };
  // No solar
  if (discharging && importing)
    return { label: '🔋 Battery + ⚡ Grid → 🏠 Home', color: 'pink' };
  if (discharging)
    return { label: '🔋 Battery → 🏠 Home', color: 'teal' };
  if (importing && charging)
    return { label: '⚡ Grid → 🏠 Home + 🔋 Battery (Force)', color: 'red' };
  if (importing)
    return { label: '⚡ Grid → 🏠 Home', color: 'red' };
  if (loadKw > T)
    return { label: '⚡ Grid → 🏠 Home', color: 'red' };
  return { label: '—', color: '' };
}

// ── Formatters ────────────────────────────────────────────────────────────────
function _haeo_fmtP(v) {
  return (v < 0 ? '-' : '') + '$' + Math.abs(v).toFixed(4);
}

// Returns {disp, col} — cost > 0 = money spent (import), cost < 0 = money earned (export)
function _haeo_fmtCost(cost) {
  if (cost > 0.0001)  return { disp: '-$' + cost.toFixed(3),           col: null };
  if (cost < -0.0001) return { disp: '$'  + Math.abs(cost).toFixed(3), col: '#4caf50' };
  return { disp: '—', col: null };
}

// Binary search: most recent state value at or before timestamp ts
function _haeo_getAt(arr, ts) {
  if (!arr || !arr.length) return null;
  let lo = 0, hi = arr.length - 1, best = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].t <= ts) { best = arr[mid].s; lo = mid + 1; }
    else hi = mid - 1;
  }
  return best;
}

// Energy delta between two consecutive slots from a total_increasing sensor.
// mult normalises the result to kWh (auto-detected from unit_of_measurement).
// Returns null if no data; 0 if reset detected (delta < 0 — daily/monthly sensor reset).
// Note: daily-reset sensors (e.g. battery charge/discharge) produce a 0 delta at midnight
// rather than a gap, which shows as — in the table. Lifetime sensors are preferred to
// avoid this — see config comments at top of file.
function _haeo_getDelta(arr, ts, prevTs, mult) {
  if (!arr || !arr.length) return null;
  const curr = parseFloat(_haeo_getAt(arr, ts));
  const prev = parseFloat(_haeo_getAt(arr, prevTs));
  if (isNaN(curr) || isNaN(prev)) return null;
  const delta = curr - prev;
  return delta < 0 ? 0 : delta * (mult || 1);
}

// ── Unit normalisation ───────────────────────────────────────────────────────
// Read unit_of_measurement from hass state and return a multiplier so all
// values are normalised to kW (power) or kWh (energy) internally.
// Power:  W→÷1000, kW→×1, MW→×1000
// Energy: Wh→÷1000, kWh→×1, MWh→×1000, GWh→×1000000
function _haeo_powerMult(hass, entityId) {
  // Normalise to uppercase and trim whitespace before comparing
  const u = (hass?.states[entityId]?.attributes?.unit_of_measurement || 'kW').trim().toUpperCase();
  if (u === 'W')   return 0.001;
  if (u === 'KW')  return 1;
  if (u === 'MW')  return 1000;
  return 1; // default kW for unknown/missing unit
}

function _haeo_energyMult(hass, entityId) {
  const u = (hass?.states[entityId]?.attributes?.unit_of_measurement || 'kWh').trim().toUpperCase();
  if (u === 'WH')  return 0.001;
  if (u === 'KWH') return 1;
  if (u === 'MWH') return 1000;
  if (u === 'GWH') return 1000000;
  return 1; // default kWh for unknown/missing unit
}

// ── Legend HTML ───────────────────────────────────────────────────────────────
function _haeo_legTable(items) {
  const rows = items.map(([bg, txt, label, desc]) => {
    if (!label) return '<tr><td colspan="2" style="border:none;padding:2px 0;"></td></tr>';
    return '<tr>' +
      '<td style="background-color:' + bg + ';color:' + txt + ';padding:3px 8px;white-space:nowrap;border:none;font-size:11px;">' + label + '</td>' +
      '<td style="padding:3px 8px;color:var(--primary-text-color);border:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;">' + desc + '</td>' +
      '</tr>';
  }).join('');
  return '<table style="width:100%;border-collapse:collapse;table-layout:auto;border-spacing:0;">' + rows + '</table>';
}

function _haeo_buildLegend() {
  return '<div class="leg" style="font-size:11px;margin-top:12px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;font-weight:bold;">' +
    '<span>📘 Legend</span>' +
    '<span style="color:var(--secondary-text-color);font-size:10px;font-weight:normal;">' + _HAEO_VERSION + '</span>' +
    '</div>' +
    '<div style="display:flex;gap:12px;align-items:flex-start;">' +
    '<div style="flex:1;min-width:0;overflow:hidden;">' + _haeo_legTable(_HAEO_LEG_L) + '</div>' +
    '<div style="flex:1;min-width:0;overflow:hidden;">' + _haeo_legTable(_HAEO_LEG_R) + '</div>' +
    '</div></div>';
}

// ── Shared column definitions ─────────────────────────────────────────────────
// Time(52) | Event(40%) | Buy(68) | Sell(68) | Load kW(44) kWh(46) | PV kW(44) kWh(46) | Grid kW(44) kWh(46) | Batt kW(44) kWh(46) SoC(46) | Cost(68)
const _HAEO_COLGROUP =
  '<colgroup>' +
  '<col style="width:52px;"><col style="width:40%;"><col style="width:68px;"><col style="width:68px;">' +
  '<col style="width:44px;"><col style="width:46px;"><col style="width:44px;"><col style="width:46px;">' +
  '<col style="width:44px;"><col style="width:46px;"><col style="width:44px;"><col style="width:46px;">' +
  '<col style="width:46px;"><col style="width:68px;">' +
  '</colgroup>';

const _HAEO_THEAD =
  '<thead>' +
  '<tr>' +
  '<th rowspan="2" style="text-align:left;vertical-align:bottom;">Time</th>' +
  '<th rowspan="2" style="text-align:center;vertical-align:bottom;">Event</th>' +
  '<th rowspan="2" style="text-align:center;vertical-align:bottom;box-shadow:inset 2px 0 0 #666;">Buy<br>$</th>' +
  '<th rowspan="2" style="text-align:center;vertical-align:bottom;box-shadow:inset 1px 0 0 #555;">Sell<br>$</th>' +
  '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">Load</th>' +
  '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">PV</th>' +
  '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">Grid</th>' +
  '<th colspan="3" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #666;">Battery</th>' +
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
  '</thead>';

// ── CSS ───────────────────────────────────────────────────────────────────────
const _HAEO_STYLE = [
  ':host { display: block; width: 100%; }',
  'ha-card { width: 100%; box-sizing: border-box; }',
  '.card { padding: 8px 12px; font-family: var(--primary-font-family, sans-serif); font-size: 12px; width: 100%; box-sizing: border-box; }',
  '.tabs { display: flex; gap: 0; border-bottom: 2px solid var(--divider-color,#444); margin-bottom: 10px; align-items: stretch; }',
  '.tab { padding: 6px 18px; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--secondary-text-color); border-bottom: 3px solid transparent; margin-bottom: -2px; }',
  '.tab.active { color: #2196F3; border-bottom-color: #2196F3; background: rgba(33,150,243,0.07); }',
  '.sbar { display: flex; gap: 8px; align-items: center; padding: 4px 0 8px 0; font-size: 12px; flex-wrap: wrap; width: 100%; border-bottom: 2px solid #888; margin-bottom: 0; }',
  '.pill { padding: 3px 10px; border-radius: 12px; font-weight: 500; font-size: 11px; color: #fff; }',
  '.stxt { color: var(--secondary-text-color); font-size: 11px; }',
  '.wrap { overflow-y: auto; width: 100%; }',
  '.pane { display: none; }',
  '.pane.active { display: block; }',
  '.dt { border-collapse: collapse; width: 100%; table-layout: fixed; }',
  '.dt th, .dt td { padding: 4px 6px; border-bottom: 1px solid var(--divider-color,#444); font-size: 12px; line-height: 1.3; white-space: nowrap; text-align: right; }',
  '.dt th:nth-child(1) { text-align: left; box-shadow: inset -1px 0 0 #555; }',
  '.dt td:nth-child(1) { text-align: left !important; box-shadow: inset -1px 0 0 #555; }',
  '.dt td:nth-child(2) { text-align: left; white-space: normal; box-shadow: inset -1px 0 0 #555; }',
  '.dt th:nth-child(2) { white-space: normal; box-shadow: inset -1px 0 0 #555; }',
  '.dt thead { background-color: var(--card-background-color,#1c1c1c); }',
  '.dt thead th { background-color: var(--card-background-color,#1c1c1c); font-weight: bold; color: var(--primary-text-color); border-bottom: 1px solid #666; }',
  '.dt thead tr:last-child th { border-bottom: 2px solid #888; }',
  '.bgl { box-shadow: inset 2px 0 0 #666; }',
  '.bgi { box-shadow: inset 1px 0 0 #555; }',
  '.dr td { background: var(--secondary-background-color); font-weight: bold; border-top: 2px solid var(--divider-color); text-align: left !important; padding: 5px 6px; }',
  '.dr td.bgi, .dr td.bgl { text-align: right !important; }',
  '.msg { padding: 20px; text-align: center; color: var(--secondary-text-color); }',
  '.err { padding: 10px; color: #f44336; }',
].join('\n');

// ── HTML template ─────────────────────────────────────────────────────────────
function _haeo_buildHTML() {
  return '<style>' + _HAEO_STYLE + '</style>' +
    '<ha-card><div class="card">' +

    '<div class="tabs">' +
    '<div class="tab active" id="tab-future">📅 Future Decisions</div>' +
    '<div class="tab" id="tab-past">📋 Past Events</div>' +
    '<span id="grid-export-alert" style="margin-left:auto;align-self:center;padding-right:8px;"></span>' +
    '<span id="range-past-wrap" style="display:none;align-self:center;padding-right:4px;">' +
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
    '<div class="sbar" id="sbar-future">⏳ Loading...</div>' +
    '<table class="dt dt-head" style="margin-bottom:0;">' + _HAEO_COLGROUP + _HAEO_THEAD + '</table>' +
    '<div class="wrap"><table class="dt">' + _HAEO_COLGROUP +
    '<tbody id="tb-future"><tr><td colspan="14" class="msg">⏳ Loading...</td></tr></tbody>' +
    '</table></div>' +
    '</div>' +

    '<div class="pane" id="pane-past">' +
    '<div class="sbar">' +
    '<strong style="color:var(--primary-text-color);">Past Events</strong>' +
    '<span class="stxt" id="st-past">Select a range to load</span>' +
    '</div>' +
    '<table class="dt dt-head" style="margin-bottom:0;">' + _HAEO_COLGROUP + _HAEO_THEAD + '</table>' +
    '<div class="wrap"><table class="dt">' + _HAEO_COLGROUP +
    '<tbody id="tb-past"><tr><td colspan="14" class="msg">⏳ Select range to load...</td></tr></tbody>' +
    '</table></div>' +
    '</div>' +

    _haeo_buildLegend() +
    '</div></ha-card>';
}

// ── Custom Element ────────────────────────────────────────────────────────────
class HaeoEventsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass         = null;
    this._config       = {};
    this._activeTab    = 'future';
    this._lastCostTs   = null;
    this._lastRenderTs = 0;
    this._pastState    = 'idle';
    this._pastLoadTs   = 0;     // timestamp when _pastState entered 'loading'
  }

  // Resolve a sensor entity ID: config override → default
  _eid(key) {
    return this._config['entity_' + key] || _HAEO_DEFAULTS[key];
  }

  setConfig(config) {
    this._config = config || {};
    if (!this.shadowRoot.getElementById('tb-future')) {
      this.shadowRoot.innerHTML = _haeo_buildHTML();
      this._wireEvents();
      // Shadow DOM was rebuilt (e.g. navigating back to dashboard) — reset past state
      // so the next set hass triggers a fresh fetch rather than staying stuck.
      this._pastState  = 'idle';
      this._lastCostTs = null;
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
            if (staleMins > 1) this._doRefresh();
          }
        };
        document.addEventListener('visibilitychange', this._visHandler);
      }
    }
  }

  // Smart refresh: fires at :01, :06, :11 ... past the hour (1 min after each 5-min HA boundary)
  _msUntilNextBoundary() {
    const now      = new Date();
    const secInHr  = now.getMinutes() * 60 + now.getSeconds();
    const targets  = [1,6,11,16,21,26,31,36,41,46,51,56];
    const minNow   = now.getMinutes() + now.getSeconds() / 60;
    let nextMin    = targets.find(t => t > minNow);
    if (nextMin === undefined) nextMin = targets[0] + 60;
    return Math.max(1000, (nextMin * 60 - secInHr) * 1000 - now.getMilliseconds());
  }

  _scheduleRefresh() {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => {
      if (document.visibilityState !== 'hidden' && this._hass) this._doRefresh();
      this._scheduleRefresh();
    }, this._msUntilNextBoundary());
  }

  _doRefresh() {
    this._lastCostTs = null;
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
      const leg  = this.shadowRoot.querySelector('.leg');
      const legH = leg ? leg.getBoundingClientRect().height + 12 : 0;
      w.style.height = Math.max(120, window.innerHeight - top - legH - 12) + 'px';
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
      this.shadowRoot.innerHTML = _haeo_buildHTML();
      this._wireEvents();
    }
    // Watch battery sensor for forecast updates — it has the richest data
    const costState = hass.states[this._eid('haeo_battery')];
    const costTs    = costState?.last_changed;
    if (costTs !== this._lastCostTs) {
      this._lastCostTs = costTs;
      this._renderFuture();
    }
    // Stuck-loading recovery: if _pastState has been 'loading' for >30s the
    // WebSocket call likely failed silently — reset to 'idle' to trigger a retry.
    if (this._pastState === 'loading' && (Date.now() - this._pastLoadTs) > 30000) {
      this._pastState = 'idle';
    }
    if (this._pastState === 'idle') {
      this._pastState  = 'loading';
      this._pastLoadTs = Date.now();
      this._loadPast();
    }
  }

  _switchTab(tab) {
    this._activeTab = tab;
    const sr = this.shadowRoot;
    ['future', 'past'].forEach(t => {
      sr.getElementById('tab-'  + t).classList.toggle('active', t === tab);
      sr.getElementById('pane-' + t).classList.toggle('active', t === tab);
    });
    const wrap = sr.getElementById('range-past-wrap');
    if (wrap) wrap.style.display = tab === 'past' ? 'inline-flex' : 'none';
    requestAnimationFrame(() => this._setWrapHeight());
  }

  _wireEvents() {
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
  }

  // ── Future tab render ───────────────────────────────────────────────────────
  _renderFuture() {
    this._lastRenderTs = Date.now();
    const sbar  = this.shadowRoot.getElementById('sbar-future');
    const tbody = this.shadowRoot.getElementById('tb-future');
    if (!sbar || !tbody) return;
    try {
      this._renderFutureInner(sbar, tbody);
    } catch (e) {
      console.error('HAEO card _renderFuture error:', e);
      tbody.innerHTML = '<tr><td colspan="14" class="err">⚠️ Render error: ' + e.message + '</td></tr>';
      sbar.innerHTML = '<span style="color:#f44336;">⚠️ ' + e.message + '</span>';
    }
  }

  _renderFutureInner(sbar, tbody) {

    // Build UTC-epoch-ms → value Map from a sensor's {time, value} forecast attribute.
    // Keying by epoch ms is timezone-safe regardless of UTC offset in time strings.
    // mult: unit multiplier to normalise to kW — auto-detected from unit_of_measurement.
    const buildMap = (entityId, mult) => {
      const fc = this._hass?.states[entityId]?.attributes?.forecast;
      if (!Array.isArray(fc)) return new Map();
      const m = new Map();
      for (const row of fc) {
        if (!row || row.time == null) continue;
        const ts = new Date(row.time).getTime();
        if (!isNaN(ts)) m.set(ts, (row.value != null ? parseFloat(row.value) || 0 : 0) * mult);
      }
      return m;
    };

    // Primary axis: battery_active_power — has the richest power forecast data.
    // Other sensors (prices, cost) have different step sizes so we use nearest-timestamp
    // lookup for those rather than exact epoch-ms matching.
    const battState = this._hass?.states[this._eid('haeo_battery')];
    if (!battState) {
      tbody.innerHTML = '<tr><td colspan="14" class="err">⚠️ ' + this._eid('haeo_battery') + ' not found</td></tr>';
      return;
    }
    const primaryFc = battState.attributes?.forecast;
    if (!Array.isArray(primaryFc) || !primaryFc.length) {
      tbody.innerHTML = '<tr><td colspan="14" class="err">⚠️ No forecast data on ' + this._eid('haeo_battery') + '</td></tr>';
      return;
    }

    // Auto-detect unit_of_measurement for each power sensor and normalise to kW
    // Forecast attribute values are always in kW/% / $/kWh regardless of live sensor unit
    // — do NOT apply powerMult here, that is only for history sensor reads.
    // Grid forecast: HAEO uses negative=export, positive=import — negate to match
    // our display convention (positive=export, negative=import).
    const battMap  = buildMap(this._eid('haeo_battery'),        1);
    const gridMap  = buildMap(this._eid('haeo_grid'),           1); // positive=import, negative=export — matches display
    const loadMap  = buildMap(this._eid('haeo_load'),           1);
    const solarMap = buildMap(this._eid('haeo_solar'),          1);
    const socMap   = buildMap(this._eid('haeo_soc'),            1);
    const buyMap   = buildMap(this._eid('haeo_buy_price'),      1);
    const sellMap  = buildMap(this._eid('haeo_sell_price'),     1);
    // Cost/Profit calculated directly: export profit = |gridKwh| × sellP, import cost = gridKwh × buyP
    // sensor.grid_net_cost is not used for per-slot calculation (cumulative running total,
    // timestamps misalign with battery forecast axis causing nearestGet errors)

    // Nearest-timestamp lookup: for sensors with coarser step sizes (prices, cost)
    // find the Map entry whose key is closest to the target timestamp.
    const nearestGet = (map, ts) => {
      if (map.has(ts)) return map.get(ts);
      let best = null, bestDiff = Infinity;
      for (const [k, v] of map) {
        const d = Math.abs(k - ts);
        if (d < bestDiff) { bestDiff = d; best = v; }
      }
      return best ?? 0;
    };

    // Pre-build sorted timestamp array for step-size calculation
    const fcTimestamps = primaryFc
      .map(r => new Date(r.time).getTime())
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);
    // stepH(ts): hours between this timestamp and the next forecast row
    const stepHFor = (ts) => {
      const idx = fcTimestamps.indexOf(ts);
      if (idx >= 0 && idx < fcTimestamps.length - 1)
        return (fcTimestamps[idx + 1] - ts) / 3600000;
      return 1; // fallback 1h for last row
    };

    const nowTs    = Date.now();
    const todayStr = new Date().toLocaleDateString('en-CA');

    // ── Status bar ──
    const nowSoc  = parseFloat(this._hass?.states[this._eid('haeo_soc')]?.state)       || null;
    const nowBuy  = parseFloat(this._hass?.states[this._eid('haeo_buy_price')]?.state)  || null;
    const nowSell = parseFloat(this._hass?.states[this._eid('haeo_sell_price')]?.state) || null;
    const exportLimit = parseFloat(this._hass?.states[this._eid('haeo_export_limit')]?.state) || null;
    const importLimit = parseFloat(this._hass?.states[this._eid('haeo_import_limit')]?.state) || null;
    const battChargeLimit = parseFloat(this._hass?.states[this._eid('haeo_batt_charge_limit')]?.state) || null;
    const battDischargeLimit = parseFloat(this._hass?.states[this._eid('haeo_batt_discharge_limit')]?.state) || null;

    // Current activity: use live sensors, fallback to forecast if unavailable
    const liveGridKw = parseFloat(this._hass?.states[this._eid('haeo_grid')]?.state) || null;
    const liveBattKw = parseFloat(this._hass?.states[this._eid('haeo_battery')]?.state) || null;
    const currentGridKw = liveGridKw != null ? liveGridKw : gridMap.get(nowTs) || 0;
    const currentBattKw = liveBattKw != null ? liveBattKw : battMap.get(nowTs) || 0;
    const isGridImporting = currentGridKw > 0.05;  // 50W threshold
    const isBattCharging = currentBattKw < -0.1;   // 100W threshold
    const isGridExporting = currentGridKw < -0.05; // 50W threshold
    const isBattExporting = currentBattKw > 0.1 && isGridExporting; // discharge + grid export

    // Get current Mode and Focus
    const nowClassification = _haeo_classifyFuture(solarMap.get(nowTs) || 0, loadMap.get(nowTs) || 0, currentBattKw, currentGridKw);
    const { mode, focus, modeColor, focusColor } = _haeo_getModeAndFocus(nowClassification.label);

    // Morning SoC / Peak SoC — same logic as EM card
    let closestDiff = Infinity, chargingNow = false;
    for (const row of primaryFc) {
      const ts   = new Date(row.time).getTime();
      const diff = Math.abs(ts - nowTs);
      if (diff < closestDiff) {
        closestDiff = diff;
        chargingNow = (solarMap.get(ts) || 0) > 0.5 && (battMap.get(ts) || 0) < -0.1;
      }
    }
    let dawnSoc = null, dawnTime = '', dawnLabel = '';
    if (chargingNow) {
      let pkSoc = 0, pkTime = '';
      for (const row of primaryFc) {
        const ts = new Date(row.time).getTime();
        if (isNaN(ts) || ts < nowTs) continue;
        const soc = socMap.get(ts) || 0;
        if ((solarMap.get(ts) || 0) > 0.5 && (battMap.get(ts) || 0) < -0.01 && soc > pkSoc) {
          pkSoc  = soc;
          pkTime = new Date(ts).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' 0', ' ');
        }
      }
      if (pkSoc > 0) { dawnSoc = pkSoc; dawnTime = pkTime; dawnLabel = 'Peak SoC'; }
    } else {
      for (const row of primaryFc) {
        if (dawnSoc !== null) break;
        const ts = new Date(row.time).getTime();
        if (isNaN(ts) || ts <= nowTs) continue;
        if ((solarMap.get(ts) || 0) > 0.5 && (battMap.get(ts) || 0) < -0.1) {
          dawnSoc   = socMap.get(ts) || 0;
          dawnTime  = new Date(ts).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' 0', ' ');
          dawnLabel = 'Morning SoC';
        }
      }
    }

    // ── Smart Alert Pills: next grid import/export windows ──
    let gridImportTime = '', gridExportTime = '';
    const fmtSbarTime = (ts) => new Date(ts).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    for (const row of primaryFc) {
      const ts = new Date(row.time).getTime();
      if (isNaN(ts) || ts < nowTs) continue;
      const gridKw = gridMap.get(ts) || 0;
      if (!gridImportTime && gridKw > 0.1)
        gridImportTime = fmtSbarTime(ts);
      if (!gridExportTime && gridKw < -0.1)
        gridExportTime = fmtSbarTime(ts);
    }

    const socColor  = nowSoc  != null ? (nowSoc  <= 20 ? '#f44336' : nowSoc  >= 75 ? '#4caf50' : 'var(--primary-text-color)') : '';
    const dawnColor = dawnSoc != null ? (dawnSoc <= 20 ? '#f44336' : dawnSoc <= 35 ? '#ff9800' : '#4caf50') : '';

    sbar.innerHTML =
      (mode ? '📌 Mode: <span class="pill" style="background-color:' + (modeColor || '#555') + ' !important;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + mode + '</span>' : '') +
      (focus ? '🎯 Focus: <span class="pill" style="background-color:' + (focusColor || '#555') + ' !important;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + focus + '</span>' : '') +
      (nowSoc   != null ? '🔋 SoC now: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + nowSoc.toFixed(1)  + '%</span>' : '') +
      (dawnSoc  != null ? '☀️ ' + dawnLabel + ': <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + dawnSoc.toFixed(1) + '% (' + dawnTime + ')</span>' : '') +
      (nowBuy   != null ? '💲 Buy: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">$' + nowBuy.toFixed(4)  + '</span>' : '') +
      (nowSell  != null ? '💲 Sell: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">$' + nowSell.toFixed(4) + '</span>' : '') +
      (exportLimit != null ? '📤 Export Limit: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + exportLimit.toFixed(2) + ' kW</span>' : '') +
      (isGridImporting && importLimit != null ? '⚡ Import Limit: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + importLimit.toFixed(2) + ' kW</span>' : '') +
      (isBattCharging && battChargeLimit != null ? '🔋 ESS Charge Limit: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + battChargeLimit.toFixed(2) + ' kW</span>' : '') +
      (isBattExporting && battDischargeLimit != null ? '🔋 ESS Discharge Limit: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + battDischargeLimit.toFixed(2) + ' kW</span>' : '');

    // Set grid export alert in tab bar
    const alertEl = this.shadowRoot.getElementById('grid-export-alert');
    if (alertEl) {
      alertEl.innerHTML = gridExportTime ? '<span class="pill" style="background:#2e7d32;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">📤 Grid export from ' + gridExportTime + '</span>' : '';
    }

    // ── Single-pass day totals: accumulate while iterating ──
    // Pre-pass: daily cost and kWh totals (single loop)
    const dailyCosts = {};
    const dailyKwh   = {};
    const dailyOrder = [];  // Track order of first appearance

    for (const row of primaryFc) {
      const ts = new Date(row.time).getTime();
      if (isNaN(ts) || ts < nowTs) continue;
      const dayStr = new Date(ts).toLocaleDateString('en-CA');
      const battKw  = battMap.get(ts)  || 0;
      const gridKw  = gridMap.get(ts)  || 0;
      const loadKw  = loadMap.get(ts)  || 0;
      const solarKw = solarMap.get(ts) || 0;
      const stepH   = stepHFor(ts);

      // Cost/Profit: export = |gridKwh| × sellP (negative = profit), import = gridKwh × buyP (positive = cost)
      const buyP0   = nearestGet(buyMap, ts);
      const sellP0  = nearestGet(sellMap, ts);
      const gridKwh0 = gridKw * stepH;
      const cost    = gridKw < -0.05 ? -(Math.abs(gridKwh0) * sellP0)
                    : gridKw >  0.05 ?   Math.abs(gridKwh0) * buyP0
                    : 0;

      if (!dailyCosts.hasOwnProperty(dayStr)) {
        dailyOrder.push(dayStr);
        dailyCosts[dayStr] = 0;
        dailyKwh[dayStr] = { load: 0, pv: 0, grid: 0, batt: 0 };
      }

      dailyCosts[dayStr] += cost;
      const dk = dailyKwh[dayStr];
      dk.load += loadKw  * stepH;
      dk.pv   += solarKw * stepH;
      dk.grid += gridKw  * stepH;
      dk.batt += battKw  * stepH;
    }

    // ── Build day header row ──
    const _buildDayHeaderRow = (day) => {
      const dayTotal = dailyCosts[day] || 0;
      const dk       = dailyKwh[day]  || { load:0, pv:0, grid:0, batt:0 };
      const dayColor = dayTotal <= 0 ? '#4caf50' : '#f44336';
      const dayLabel = day === todayStr ? '📅 Today' : '📅 ' + new Date(day + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
      const dayCostLabel = dayTotal <= 0 ? '$' + Math.abs(dayTotal).toFixed(2) : '-$' + dayTotal.toFixed(2);
      const fmtKd = (v) => Math.abs(v) > 0.001 ? (v < 0 ? '-' : '') + Math.abs(v).toFixed(2) : '—';
      const fmtGrid = (v) => {
        if (Math.abs(v) <= 0.001) return '—';
        const col = v < 0 ? '#4caf50' : '#f44336';
        return '<span style="color:' + col + ';">' + (v < 0 ? '-' : '') + Math.abs(v).toFixed(2) + '</span>';
      };
      const fmtBatt = (v) => {
        if (Math.abs(v) <= 0.001) return '—';
        const col = v < 0 ? '#f44336' : '#4caf50';
        return '<span style="color:' + col + ';">' + (v < 0 ? '-' : '') + Math.abs(v).toFixed(2) + '</span>';
      };
      return '<tr class="dr">' +
        '<td colspan="2">' + dayLabel + '</td>' +
        '<td class="bgl" colspan="2"></td>' +
        '<td class="bgl"></td>' +
        '<td class="bgi" style="text-align:right;">' + fmtKd(dk.load) + '</td>' +
        '<td class="bgl"></td>' +
        '<td class="bgi" style="text-align:right;">' + fmtKd(dk.pv) + '</td>' +
        '<td class="bgl"></td>' +
        '<td class="bgi" style="text-align:right;">' + fmtGrid(dk.grid) + '</td>' +
        '<td class="bgl"></td>' +
        '<td class="bgi" style="text-align:right;">' + fmtBatt(-dk.batt) + '</td>' +
        '<td class="bgi" style="text-align:right;"></td>' +
        '<td class="bgl" style="text-align:right;color:' + dayColor + ';">' + dayCostLabel + '</td>' +
        '</tr>';
    };

    // ── Table rows: single pass with day header injection ──
    const rows = [];
    let lastDay = '';

    for (const row of primaryFc) {
      const ts = new Date(row.time).getTime();
      if (isNaN(ts) || ts < nowTs) continue;

      const dayStr  = new Date(ts).toLocaleDateString('en-CA');
      const timeStr = new Date(ts).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });

      // Inject day header when day changes
      if (dayStr !== lastDay) {
        lastDay = dayStr;
        rows.push(_buildDayHeaderRow(dayStr));
      }

      // Power sensors share the battery timestamp axis — exact match
      const battKw  = battMap.get(ts)       || 0;
      const gridKw  = gridMap.get(ts)       || 0;
      const loadKw  = loadMap.get(ts)       || 0;
      const solarKw = solarMap.get(ts)      || 0;
      const soc     = socMap.get(ts)        || 0;
      // Price/cost sensors have coarser steps — use nearest timestamp
      const buyP    = nearestGet(buyMap,  ts);
      const sellP   = nearestGet(sellMap, ts);
      // kWh = kW × stepH where stepH is inferred from gap to next forecast timestamp
      const stepH    = stepHFor(ts);
      // Cost/Profit: export profit = |gridKwh| × sellP (negative), import cost = gridKwh × buyP (positive)
      const gridKwh  = gridKw * stepH;
      const cost     = gridKw < -0.05 ? -(Math.abs(gridKwh) * sellP)
                     : gridKw >  0.05 ?   Math.abs(gridKwh) * buyP
                     : 0;

      const cls = _haeo_classifyFuture(solarKw, loadKw, battKw, gridKw);
      const c   = _HAEO_COLOURS[cls.color] || { bg: 'transparent', txt: 'var(--primary-text-color)', cost: 'var(--primary-text-color)' };

      // Grid: positive=import (red=costing), negative=export (green=earning)
      const gridCol  = gridKw > 0.1 ? '#f44336' : gridKw < -0.1 ? '#4caf50' : c.txt;
      // Battery: positive=discharge=red, negative=charge; charge from grid=amber, from solar=green
      const battCol  = battKw > 0.1 ? '#f44336'
                     : battKw < -0.1 && gridKw > 0.1 ? '#ff9800'
                     : battKw < -0.1 ? '#4caf50'
                     : c.txt;
      const socCol   = soc <= 20 ? '#f44336' : soc >= 75 ? '#4caf50' : c.txt;
      const costFmt  = _haeo_fmtCost(cost);
      const costCol  = costFmt.col || (cost > 0.0001 ? c.cost : c.txt);
      const fmtKwh   = (v) => Math.abs(v * stepH) > 0.001 ? (v * stepH).toFixed(3) : '—';
      const fmtKwhC  = (v, col) => {
        const kwh = v * stepH;
        if (Math.abs(kwh) <= 0.001) return '—';
        return '<span style="color:' + col + ';">' + kwh.toFixed(3) + '</span>';
      };

      rows.push('<tr style="background-color:' + c.bg + ';color:' + c.txt + ';">' +
        '<td>' + timeStr + '</td>' +
        '<td><span title="' + cls.note + '">' + cls.label + '</span></td>' +
        '<td class="bgl">' + _haeo_fmtP(buyP)   + '</td>' +
        '<td class="bgi">' + _haeo_fmtP(sellP)  + '</td>' +
        '<td class="bgl">' + loadKw.toFixed(2)  + '</td>' +
        '<td class="bgi">' + fmtKwh(loadKw)     + '</td>' +
        '<td class="bgl">' + (solarKw >= 0.05 ? solarKw.toFixed(2) : '—') + '</td>' +
        '<td class="bgi">' + (solarKw >= 0.05 ? fmtKwh(solarKw) : '—') + '</td>' +
        '<td class="bgl">' + (Math.abs(gridKw) >= 0.1 ? '<span style="color:' + gridCol + ';">' + gridKw.toFixed(2) + '</span>' : '—') + '</td>' +
        '<td class="bgi">' + (Math.abs(gridKw) >= 0.1 ? fmtKwhC(gridKw, gridCol) : '—') + '</td>' +
        '<td class="bgl">' + (Math.abs(battKw) >= 0.1 ? '<span style="color:' + battCol + ';">' + (-battKw).toFixed(2) + '</span>' : '—') + '</td>' +
        '<td class="bgi">' + (Math.abs(battKw) >= 0.1 ? '<span style="color:' + battCol + ';">' + fmtKwh(-battKw) + '</span>' : '—') + '</td>' +
        '<td class="bgi"><span style="color:' + socCol + ';">' + soc.toFixed(1) + '</span></td>' +
        '<td class="bgl"><span style="color:' + costCol + ';font-weight:bold;">' + costFmt.disp + '</span></td>' +
        '</tr>');
    }

    tbody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="14" class="msg">No future forecast rows available.</td></tr>';
    requestAnimationFrame(() => this._setWrapHeight());
  } // end _renderFutureInner

  // ── Past tab ────────────────────────────────────────────────────────────────
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

      // Past power sensors — actual inverter measurements (Sigenergy defaults)
      const powerSensors = [
        this._eid('past_battery_power'),
        this._eid('past_load_power'),
        this._eid('past_solar_power'),
        this._eid('past_grid_power'),
        this._eid('haeo_soc'),
        this._eid('haeo_buy_price'),
        this._eid('haeo_sell_price'),
      ];
      // Energy sensors for kWh delta columns
      const energySensors = [
        this._eid('past_load_energy'),
        this._eid('past_solar_energy'),
        this._eid('past_grid_import_energy'),
        this._eid('past_grid_export_energy'),
        this._eid('past_battery_charge_energy'),
        this._eid('past_battery_discharge_energy'),
      ];

      const result = await this._hass.callWS({
        type:             'history/history_during_period',
        start_time:       start.toISOString(),
        end_time:         end.toISOString(),
        entity_ids:       [...new Set([...powerSensors, ...energySensors])],
        minimal_response: true,
        no_attributes:    true,
      });

      const lookup = {};
      for (const [eid, states] of Object.entries(result)) {
        lookup[eid] = states.map(s => ({
          t: (s.lu !== undefined ? s.lu : s.lc) * 1000,
          s: s.s
        })).sort((a, b) => a.t - b.t);
      }

      // Build unit multiplier maps from LIVE sensor state unit_of_measurement.
      this._pwrMult = {
        battery: _haeo_powerMult(this._hass, this._eid('past_battery_power')),
        grid:    _haeo_powerMult(this._hass, this._eid('past_grid_power')),
        load:    _haeo_powerMult(this._hass, this._eid('past_load_power')),
        solar:   _haeo_powerMult(this._hass, this._eid('past_solar_power')),
      };
      this._engMult = {
        past_load_energy:              _haeo_energyMult(this._hass, this._eid('past_load_energy')),
        past_solar_energy:             _haeo_energyMult(this._hass, this._eid('past_solar_energy')),
        past_grid_import_energy:       _haeo_energyMult(this._hass, this._eid('past_grid_import_energy')),
        past_grid_export_energy:       _haeo_energyMult(this._hass, this._eid('past_grid_export_energy')),
        past_battery_charge_energy:    _haeo_energyMult(this._hass, this._eid('past_battery_charge_energy')),
        past_battery_discharge_energy: _haeo_energyMult(this._hass, this._eid('past_battery_discharge_energy')),
      };

      // Auto-switch to Last 24h if today has no load data
      if (!lookup[this._eid('past_load_power')]?.length) {
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

      // ── Single-pass day totals ──
      const pastDailyCosts = {};
      const pastDailyKwh   = {};
      const pastDailyOrder = [];

      for (const ts of entries) {
        const dt     = new Date(ts);
        const dayStr = dt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

        // Sigenergy battery: -ve=discharge, +ve=charge → negate to internal convention (+ve=discharge)
        const battKwR= (parseFloat(_haeo_getAt(lookup[this._eid('past_battery_power')], ts)) || 0) * this._pwrMult.battery;
        const battKw = -battKwR;
        // Sigenergy grid: +ve=import, -ve=export (matches display convention — no negation)
        const gridKw = (parseFloat(_haeo_getAt(lookup[this._eid('past_grid_power')],   ts)) || 0) * this._pwrMult.grid;
        const loadKw = (parseFloat(_haeo_getAt(lookup[this._eid('past_load_power')],   ts)) || 0) * this._pwrMult.load;
        const solarKw= (parseFloat(_haeo_getAt(lookup[this._eid('past_solar_power')],  ts)) || 0) * this._pwrMult.solar;
        const buyP   = parseFloat(_haeo_getAt(lookup[this._eid('haeo_buy_price')],     ts)) || 0;
        const sellP  = parseFloat(_haeo_getAt(lookup[this._eid('haeo_sell_price')],    ts)) || 0;
        const stepH  = 5 / 60;

        const importing = gridKw > 0.1;
        const exporting = gridKw < -0.1;
        const cost = importing ? Math.abs(gridKw) * buyP * stepH : exporting ? -(gridKw * sellP * stepH) : 0;

        if (!pastDailyCosts.hasOwnProperty(dayStr)) {
          pastDailyOrder.push(dayStr);
          pastDailyCosts[dayStr] = 0;
          pastDailyKwh[dayStr] = { load: 0, pv: 0, grid: 0, batt: 0 };
        }

        pastDailyCosts[dayStr] += cost;
        const dk = pastDailyKwh[dayStr];
        dk.load += loadKw  * stepH;
        dk.pv   += solarKw * stepH;
        dk.grid += gridKw  * stepH;
        dk.batt += battKw  * stepH;
      }

      // ── Build day header row (same as future tab) ──
      const _buildDayHeaderRowPast = (day) => {
        const dayTotal = pastDailyCosts[day] || 0;
        const pk       = pastDailyKwh[day]   || { load:0, pv:0, grid:0, batt:0 };
        const dayColor = dayTotal <= 0 ? '#4caf50' : '#f44336';
        const dayCostLbl = dayTotal <= 0 ? '$' + Math.abs(dayTotal).toFixed(2) : '-$' + dayTotal.toFixed(2);
        const fmtKd = (v) => Math.abs(v) > 0.001 ? (v < 0 ? '-' : '') + Math.abs(v).toFixed(2) : '—';
        const fmtKdCol = (v) => {
          if (Math.abs(v) <= 0.001) return '—';
          const col = v < 0 ? '#4caf50' : '#f44336';
          return '<span style="color:' + col + ';">' + (v < 0 ? '-' : '') + Math.abs(v).toFixed(2) + '</span>';
        };
        const fmtKdColBatt = (v) => {
          if (Math.abs(v) <= 0.001) return '—';
          const col = v < 0 ? '#f44336' : '#4caf50';
          return '<span style="color:' + col + ';">' + (v < 0 ? '-' : '') + Math.abs(v).toFixed(2) + '</span>';
        };
        return '<tr class="dr">' +
          '<td colspan="2">📅 ' + day + '</td>' +
          '<td class="bgl" colspan="2"></td>' +
          '<td class="bgl"></td>' +
          '<td class="bgi" style="text-align:right;">' + fmtKd(pk.load) + '</td>' +
          '<td class="bgl"></td>' +
          '<td class="bgi" style="text-align:right;">' + fmtKd(pk.pv) + '</td>' +
          '<td class="bgl"></td>' +
          '<td class="bgi" style="text-align:right;">' + fmtKdCol(pk.grid) + '</td>' +
          '<td class="bgl"></td>' +
          '<td class="bgi" style="text-align:right;">' + fmtKdColBatt(-pk.batt) + '</td>' +
          '<td class="bgi" style="text-align:right;"></td>' +
          '<td class="bgl" style="text-align:right;color:' + dayColor + ';">' + dayCostLbl + '</td>' +
          '</tr>';
      };

      // ── Pass 2: render rows with day header injection ──
      const rows = [];
      let lastDay = '';

      for (const ts of entries) {
        const dt      = new Date(ts);
        const dayStr  = dt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = dt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });

        // Inject day header when day changes
        if (dayStr !== lastDay) {
          lastDay = dayStr;
          rows.push(_buildDayHeaderRowPast(dayStr));
        }

        // Power values from Sigenergy inverter sensors
        const battKwR = (parseFloat(_haeo_getAt(lookup[this._eid('past_battery_power')], ts)) || 0) * this._pwrMult.battery;
        const battKw  = -battKwR;
        const gridKw  = (parseFloat(_haeo_getAt(lookup[this._eid('past_grid_power')],   ts)) || 0) * this._pwrMult.grid;
        const loadKw  = (parseFloat(_haeo_getAt(lookup[this._eid('past_load_power')],   ts)) || 0) * this._pwrMult.load;
        const solarKw = (parseFloat(_haeo_getAt(lookup[this._eid('past_solar_power')],  ts)) || 0) * this._pwrMult.solar;
        const soc     = parseFloat(_haeo_getAt(lookup[this._eid('haeo_soc')],           ts)) || 0;
        const buyP    = parseFloat(_haeo_getAt(lookup[this._eid('haeo_buy_price')],     ts)) || 0;
        const sellP   = parseFloat(_haeo_getAt(lookup[this._eid('haeo_sell_price')],    ts)) || 0;

        if (soc === 0 && Math.abs(battKw) < 0.01 && Math.abs(gridKw) < 0.01 && loadKw < 0.01 && solarKw < 0.01) continue;

        const cls = _haeo_classifyPast(solarKw, loadKw, battKw, gridKw);
        const c   = _HAEO_COLOURS[cls.color] || { bg: '#ffffcc', txt: '#888888', cost: '#888888' };

        // Grid: positive=import (red=costing), negative=export (green=earning)
        const gridCol = gridKw > 0.1 ? '#f44336' : gridKw < -0.1 ? '#4caf50' : c.txt;
        // Battery: positive=discharge=red, negative=charge; from grid=amber, from solar=green
        const battCol = battKw > 0.05 ? '#f44336'
                      : battKw < -0.05 && gridKw > 0.05 ? '#ff9800'
                      : battKw < -0.05 ? '#4caf50'
                      : c.txt;
        const socCol  = soc <= 20 ? '#f44336' : soc >= 75 ? '#4caf50' : c.txt;

        // Cost for this slot
        const stepH    = 5 / 60;
        const importing = gridKw > 0.1;
        const exporting = gridKw < -0.1;
        const slotCost  = importing ? Math.abs(gridKw) * buyP * stepH : exporting ? -(gridKw * sellP * stepH) : 0;
        const costFmt   = _haeo_fmtCost(slotCost);
        const costCol   = costFmt.col || (slotCost > 0.0001 ? c.cost : c.txt);

        // Energy kWh deltas from total_increasing sensors
        const prevTs  = ts - step;
        const eLoad   = _haeo_getDelta(lookup[this._eid('past_load_energy')],              ts, prevTs, this._engMult.past_load_energy);
        const eSolar  = _haeo_getDelta(lookup[this._eid('past_solar_energy')],             ts, prevTs, this._engMult.past_solar_energy);
        const eGImp   = _haeo_getDelta(lookup[this._eid('past_grid_import_energy')],       ts, prevTs, this._engMult.past_grid_import_energy);
        const eGExp   = _haeo_getDelta(lookup[this._eid('past_grid_export_energy')],       ts, prevTs, this._engMult.past_grid_export_energy);
        const eBattC  = _haeo_getDelta(lookup[this._eid('past_battery_charge_energy')],    ts, prevTs, this._engMult.past_battery_charge_energy);
        const eBattD  = _haeo_getDelta(lookup[this._eid('past_battery_discharge_energy')], ts, prevTs, this._engMult.past_battery_discharge_energy);

        const stepHG  = 5 / 60;
        const eGrid   = exporting ? (eGExp !== null ? -eGExp : -(Math.abs(gridKw) * stepHG))
                      : importing ? (eGImp !== null ?  eGImp :   Math.abs(gridKw) * stepHG)
                      : null;
        const stepHB  = 5 / 60;
        const eBatt   = battKw > 0.1
          ? (eBattD !== null ? -eBattD : -(battKw * stepHB))
          : battKw < -0.1
          ? (eBattC !== null ? eBattC  :  (-battKw * stepHB))
          : null;

        const fmtE = (v) => v !== null && Math.abs(v) > 0.005 ? v.toFixed(3) : '—';

        rows.push('<tr style="background-color:' + c.bg + ';color:' + c.txt + ';">' +
          '<td>' + timeStr + '</td>' +
          '<td>' + cls.label + '</td>' +
          '<td class="bgl">' + _haeo_fmtP(buyP)   + '</td>' +
          '<td class="bgi">' + _haeo_fmtP(sellP)  + '</td>' +
          '<td class="bgl">' + loadKw.toFixed(2)  + '</td>' +
          '<td class="bgi">' + fmtE(eLoad)  + '</td>' +
          '<td class="bgl">' + (solarKw >= 0.05 ? solarKw.toFixed(2) : '—') + '</td>' +
          '<td class="bgi">' + (solarKw >= 0.05 ? fmtE(eSolar) : '—') + '</td>' +
          '<td class="bgl">' + (Math.abs(gridKw) >= 0.1 ? '<span style="color:' + gridCol + ';">' + gridKw.toFixed(2) + '</span>' : '—') + '</td>' +
          '<td class="bgi">' + (Math.abs(gridKw) >= 0.1 && eGrid !== null && Math.abs(eGrid) > 0.005 ? '<span style="color:' + gridCol + ';">' + eGrid.toFixed(3) + '</span>' : '—') + '</td>' +
          '<td class="bgl">' + (Math.abs(battKw) >= 0.1 ? '<span style="color:' + battCol + ';">' + (-battKw).toFixed(2) + '</span>' : '—') + '</td>' +
          '<td class="bgi">' + (Math.abs(battKw) >= 0.1 && eBatt !== null && Math.abs(eBatt) > 0.005 ? '<span style="color:' + battCol + ';">' + eBatt.toFixed(3) + '</span>' : '—') + '</td>' +
          '<td class="bgi"><span style="color:' + socCol + ';">' + soc.toFixed(1) + '</span></td>' +
          '<td class="bgl"><span style="color:' + costCol + ';font-weight:bold;">' + costFmt.disp + '</span></td>' +
          '</tr>');
      }

      tb.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="14" class="msg">⚠️ No readings for this period.</td></tr>';
      requestAnimationFrame(() => this._setWrapHeight());
      const sel2 = this.shadowRoot.getElementById('range-past');
      st.textContent = entries.length + ' readings — ' + (sel2 ? sel2.options[sel2.selectedIndex].text : '');
      this._pastState = 'ready';

    } catch (e) {
      const tb2 = this.shadowRoot.getElementById('tb-past');
      if (tb2) tb2.innerHTML = '<tr><td colspan="14" class="err">⚠️ ' + e.message + '</td></tr>';
      const st2 = this.shadowRoot.getElementById('st-past');
      if (st2) st2.textContent = 'Error — ' + e.message.slice(0, 60);
      this._pastState = 'ready';
    }
  }

  getCardSize() { return 12; }
}

if (!customElements.get('haeo-events-card')) {
  customElements.define('haeo-events-card', HaeoEventsCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === 'haeo-events-card')) {
  window.customCards.push({
    type: 'haeo-events-card',
    name: 'HAEO Events Card',
    description: 'HAEO Optimizer future forecast and past events in one card',
  });
}
