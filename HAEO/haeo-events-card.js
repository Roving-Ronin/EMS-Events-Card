// HAEO Events Card
// Combines Future Decisions (forecast) and Past Events (history) in one card
// Enhanced with: Smart Alert Pills, single-pass day totals, improved formatting
// Requires: sensor.grid_net_cost + associated HAEO sensors
// Copy to /config/www/haeo-events-card.js
// Add resource: /local/haeo-events-card.js (type: JavaScript module)

const _HAEO_VERSION = 'v3.1.0';

let _HAEO_CUR = '$';

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
  haeo_ev_power:      'sensor.ev_active_power',
  haeo_ev_soc:        'sensor.ev_state_of_charge',
  haeo_ev1_power:     'sensor.ev1_active_power',
  haeo_ev1_soc:       'sensor.ev1_state_of_charge',
  haeo_ev2_power:     'sensor.ev2_active_power',
  haeo_ev2_soc:       'sensor.ev2_state_of_charge',
  haeo_deferrable_load: 'sensor.deferrable_loads_power_forecast',
  // ── PAST tab: inverter power sensors (Sigenergy Local Modbus defaults) ──
  past_battery_power: 'sensor.sigen_plant_battery_power',       // -ve=discharge, +ve=charge
  past_load_power:    'sensor.sigen_plant_total_load_power',    // always +ve
  past_solar_power:   'sensor.sigen_plant_pv_power',            // always +ve
  past_grid_power:    'sensor.sigen_plant_grid_active_power',   // +ve=import, -ve=export
  past_deferrable_load: 'sensor.deferrable_loads_power',        // Deferrable loads power (PAST)
  // ── PAST tab: inverter energy sensors (total_increasing, Sigenergy Local Modbus defaults) ──
  past_load_energy:              'sensor.sigen_plant_total_load_consumption',        // Lifetime
  past_solar_energy:             'sensor.sigen_plant_total_pv_generation',            // Lifetime
  past_grid_import_energy:       'sensor.sigen_plant_total_imported_energy',          // Lifetime
  past_grid_export_energy:       'sensor.sigen_plant_total_exported_energy',          // Lifetime
  past_battery_charge_energy:    'sensor.sigen_plant_daily_battery_charge_energy',    // Daily reset
  past_battery_discharge_energy: 'sensor.sigen_plant_daily_battery_discharge_energy', // Daily reset
};

// ── Colour scheme ─────────────────────────────────────────────────────────────
// Colors mapped to event types for clear semantics
const _HAEO_COLOURS = {
  // Event classification colors (alphabetically sorted by classification name)
  battery_ev_charge:                    { bg: '#ccfff5', txt: '#333333', cost: '#333333' },  // Battery → EV (charging)
  battery_ev_to_baseload:               { bg: '#ccfff5', txt: '#333333', cost: '#333333' },  // Battery → EV + Base Load
  battery_ev_to_grid_force:             { bg: '#ffffcc', txt: '#333333', cost: '#333333' },  // Battery + EV → Grid (Force)
  battery_ev_to_loads:                  { bg: '#ccfff5', txt: '#333333', cost: '#333333' },  // Battery + EV → Loads
  battery_grid_to_loads:                { bg: '#FFD4E5', txt: '#333333', cost: '#cc3333' },  // Battery + Grid → Loads
  battery_to_baseload_grid_force:       { bg: '#ffffcc', txt: '#333333', cost: '#333333' },  // Battery → Base Load + Grid (Force)
  battery_to_grid_force:                { bg: '#ffffcc', txt: '#333333', cost: '#333333' },  // Battery → Grid (Force)
  battery_to_loads_grid_force:          { bg: '#ffffcc', txt: '#333333', cost: '#333333' },  // Battery → Loads + Grid (Force)
  battery_to_loads_inferred:            { bg: '#ccfff5', txt: '#333333', cost: '#333333' },  // Battery → Loads (inferred)
  battery_to_loads_only:                { bg: '#ccfff5', txt: '#333333', cost: '#333333' },  // Battery → Loads only
  grid_to_baseload_battery_force:       { bg: '#ffe0e0', txt: '#333333', cost: '#cc3333' },  // Grid → Base Load + Battery (Force)
  grid_to_baseload_ev_battery_force:    { bg: '#ffe0e0', txt: '#333333', cost: '#cc3333' },  // Grid → Base Load + EV + Battery (Force)
  grid_to_baseload_ev_force:            { bg: '#ffe0e0', txt: '#333333', cost: '#cc3333' },  // Grid → Base Load + EV (Force)
  grid_to_loads_battery_force:          { bg: '#ffe0e0', txt: '#333333', cost: '#cc3333' },  // Grid → Loads + Battery (Force)
  grid_to_loads_only:                   { bg: '#ffe0e0', txt: '#333333', cost: '#cc3333' },  // Grid → Loads only
  pv_battery_ev_to_grid_export:         { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar + Battery + EV → Grid (Export)
  pv_battery_ev_to_loads:               { bg: '#ccfff5', txt: '#333333', cost: '#333333' },  // 🌞 Solar + Battery + EV → Loads
  pv_battery_grid_to_loads:             { bg: '#FFD4E5', txt: '#333333', cost: '#cc3333' },  // 🌞 Solar + Battery + Grid → Loads
  pv_battery_to_baseload_ev_charge:     { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar + Battery → Base Load + EV (Charge)
  pv_battery_to_baseload_grid_force:    { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar + Battery → Base Load + Grid (Force)
  pv_battery_to_loads_grid_force:       { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar + Battery → Loads + Grid (Force)
  pv_battery_to_loads_no_grid:          { bg: '#ccfff5', txt: '#333333', cost: '#333333' },  // 🌞 Solar + Battery → Loads (no Grid)
  pv_ev_to_loads:                       { bg: '#ccfff5', txt: '#333333', cost: '#333333' },  // 🌞 Solar + EV → Loads
  pv_grid_to_baseload_battery_force:    { bg: '#FFD4E5', txt: '#333333', cost: '#cc3333' },  // 🌞 Solar + Grid → Base Load + Battery (Force)
  pv_grid_to_baseload_ev_battery_force: { bg: '#FFD4E5', txt: '#333333', cost: '#cc3333' },  // 🌞 Solar + Grid → Base Load + EV + Battery (Force)
  pv_grid_to_baseload_ev_charge:        { bg: '#FFD4E5', txt: '#333333', cost: '#cc3333' },  // 🌞 Solar + Grid → Base Load + EV (Charge)
  pv_grid_to_loads:                     { bg: '#FFD4E5', txt: '#333333', cost: '#cc3333' },  // 🌞 Solar + Grid → Loads
  pv_to_baseload_battery:               { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar → Base Load + Battery
  pv_to_baseload_battery_grid:          { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar → Base Load + Battery + Grid
  pv_to_baseload_ev:                    { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar → Base Load + EV
  pv_to_baseload_ev_battery_force:      { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar → Base Load + EV + Battery (Force)
  pv_to_loads_battery:                  { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar → Loads + Battery
  pv_to_loads_battery_grid:             { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar → Loads + Battery + Grid
  pv_to_loads_grid:                     { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar → Loads + Grid
  pv_to_loads_only:                     { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // 🌞 Solar → Loads only
  
  // Legacy color keys (mapped to new event classifications)
  self_consumption: { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // → solar_to_loads_only
  profit:           { bg: '#ffffcc', txt: '#333333', cost: '#333333' },  // → solar_battery_to_loads_grid_force
  battery:          { bg: '#ccfff5', txt: '#333333', cost: '#333333' },  // → battery_to_loads_only
  cost:             { bg: '#ffe0e0', txt: '#333333', cost: '#cc3333' },  // → grid_to_loads_only
  forced_export:    { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // → solar_battery_to_baseload_grid_force
  loss:             { bg: '#ffe0e0', txt: '#333333', cost: '#cc3333' },  // → grid_to_loads_only
  gain:             { bg: '#ccffcc', txt: '#333333', cost: '#333333' },  // → solar_battery_ev_to_grid_export
};

// ── Event label descriptions for settings display ──────────────────────────────
const _HAEO_EVENT_LABELS = {
  battery_ev_charge:                    '🔋 Battery → 🚗 EV (Charge)',
  battery_ev_to_baseload:               '🔋 Battery + 🚗 EV → 🏠 Base Load',
  battery_ev_to_grid_force:             '🔋 Battery + 🚗 EV → ⚡ Grid (Force)',
  battery_ev_to_loads:                  '🔋 Battery + 🚗 EV → Loads',
  battery_grid_to_loads:                '🔋 Battery + ⚡ Grid → Loads',
  battery_to_baseload_grid_force:       '🔋 Battery → 🏠 Base Load + ⚡ Grid (Force)',
  battery_to_grid_force:                '🔋 Battery → ⚡ Grid (Force)',
  battery_to_loads_grid_force:          '🔋 Battery → Loads + ⚡ Grid (Force)',
  battery_to_loads_inferred:            '🔋 Battery → Loads (Inferred)',
  battery_to_loads_only:                '🔋 Battery → Loads Only',
  grid_to_baseload_battery_force:       '⚡ Grid → 🏠 Base Load + 🔋 Battery (Force)',
  grid_to_baseload_ev_battery_force:    '⚡ Grid → 🏠 Base Load + 🚗 EV + 🔋 Battery (Force)',
  grid_to_baseload_ev_force:            '⚡ Grid → 🏠 Base Load + 🚗 EV (Force)',
  grid_to_loads_battery_force:          '⚡ Grid → Loads + 🔋 Battery (Force)',
  grid_to_loads_only:                   '⚡ Grid → Loads Only',
  pv_battery_ev_to_grid_export:         '🌞 Solar + 🔋 Battery + 🚗 EV → ⚡ Grid',
  pv_battery_ev_to_loads:               '🌞 Solar + 🔋 Battery + 🚗 EV → Loads',
  pv_battery_grid_to_loads:             '🌞 Solar + 🔋 Battery + ⚡ Grid → Loads',
  pv_battery_to_baseload_ev_charge:     '🌞 Solar + 🔋 Battery → 🏠 Base Load + 🚗 EV (Charge)',
  pv_battery_to_baseload_grid_force:    '🌞 Solar + 🔋 Battery → 🏠 Base Load + ⚡ Grid (Force)',
  pv_battery_to_loads_grid_force:       '🌞 Solar + 🔋 Battery → Loads + ⚡ Grid (Force)',
  pv_battery_to_loads_no_grid:          '🌞 Solar + 🔋 Battery → Loads (No Grid)',
  pv_ev_to_loads:                       '🌞 Solar + 🚗 EV → Loads',
  pv_grid_to_baseload_battery_force:    '🌞 Solar + ⚡ Grid → 🏠 Base Load + 🔋 Battery (Force)',
  pv_grid_to_baseload_ev_battery_force: '🌞 Solar + ⚡ Grid → 🏠 Base Load + 🚗 EV + 🔋 Battery (Force)',
  pv_grid_to_baseload_ev_charge:        '🌞 Solar + ⚡ Grid → 🏠 Base Load + 🚗 EV (Charge)',
  pv_grid_to_loads:                     '🌞 Solar + ⚡ Grid → Loads',
  pv_to_baseload_battery:               '🌞 Solar → 🏠 Base Load + 🔋 Battery',
  pv_to_baseload_battery_grid:          '🌞 Solar → 🏠 Base Load + 🔋 Battery + ⚡ Grid',
  pv_to_baseload_ev:                    '🌞 Solar → 🏠 Base Load + 🚗 EV (Charge)',
  pv_to_baseload_ev_battery_force:      '🌞 Solar → 🏠 Base Load + 🚗 EV + 🔋 Battery (Force)',
  pv_to_loads_battery:                  '🌞 Solar + 🔋 Battery → Loads',
  pv_to_loads_battery_grid:             '🌞 Solar + 🔋 Battery → Loads + ⚡ Grid',
  pv_to_loads_grid:                     '🌞 Solar → Loads + ⚡ Grid',
  pv_to_loads_only:                     '🌞 Solar → Loads Only'
};

// ── Deferrable Loads Presets ───────────────────────────────────────────────
const _HAEO_DEFERRABLE_PRESETS = [
  { name: 'Air Conditioner', displayName: 'Air Conditioner (HVAC)', abbr: 'HVAC', emoji: '🌡️', defaultSensor: 'sensor.hvac_power' },
  { name: 'Hot Water System', displayName: 'Hot Water System (HWS)', abbr: 'HWS', emoji: '🚿', defaultSensor: 'sensor.hot_water_power' },
  { name: 'Clothes Dryer', displayName: 'Clothes Dryer', abbr: 'C. Dryer', emoji: '👚', defaultSensor: 'sensor.dryer_power' },
  { name: 'Washing Machine', displayName: 'Washing Machine', abbr: 'W. Machine', emoji: '🗑️', defaultSensor: 'sensor.washing_machine_power' },
  { name: 'Dishwasher', displayName: 'Dishwasher', abbr: 'Dishw.', emoji: '🍽️', defaultSensor: 'sensor.dishwasher_power' },
  { name: 'IT Hardware', displayName: 'IT Hardware', abbr: 'IT H/W', emoji: '💻', defaultSensor: 'sensor.it_hardware_power' },
  { name: 'Pool', displayName: 'Pool Heater/Pump', abbr: 'Pool', emoji: '🏊', defaultSensor: 'sensor.pool_power' },
  { name: 'Generic Load', displayName: 'Generic Load', abbr: 'Generic', emoji: '🔌', defaultSensor: 'sensor.generic_load_power' },
];

// ── Legend ────────────────────────────────────────────────────────────────────
const _HAEO_LEG_L = [
  ['#ccffcc','#333','🌞 Solar → 🏠 Base Load','Self Consumption - Solar'],
  ['#ccffcc','#333','🌞 Solar → 🏠 Base Load + 🔋 Battery','Self Consumption - Charge Battery'],
  ['#ccffcc','#333','🌞 Solar → 🏠 Base Load + 🚗 EV','Self Consumption - Solar to EV'],
  ['#ccffcc','#333','🌞 Solar → 🏠 Base Load + 🔋 Battery + 🚗 EV','Self Consumption - Solar to Home Load + Battery + EV'],
  [_HAEO_COLOURS.self_consumption.bg,_HAEO_COLOURS.self_consumption.txt,'🌞 Solar → 🏠 Base Load + ⚡ Grid','Profit - Grid Export (Solar)'],
  [_HAEO_COLOURS.self_consumption.bg,_HAEO_COLOURS.self_consumption.txt,'🌞 Solar → 🏠 Base Load + 🔋 Battery + ⚡ Grid','Profit - Grid Export + Charge Battery'],
  [_HAEO_COLOURS.self_consumption.bg,_HAEO_COLOURS.self_consumption.txt,'🌞 Solar → 🏠 Base Load + ⏰ Defer. Loads','Self Consumption - Solar to Deferrable Load'],
  [_HAEO_COLOURS.self_consumption.bg,_HAEO_COLOURS.self_consumption.txt,'🌞 Solar → 🏠 Base Load + ⏰ Defer. Loads + 🔋 Battery','Self Consumption - Solar to Home Load + Deferrable Load + Battery'],
  [_HAEO_COLOURS.battery.bg,_HAEO_COLOURS.battery.txt,'🌞 Solar + 🔋 Battery → 🏠 Base Load','Self Consumption - Solar + Battery'],
  [_HAEO_COLOURS.battery.bg,_HAEO_COLOURS.battery.txt,'🌞 Solar + 🔋 Battery → 🏠 Base Load + 🚗 EV','Self Consumption - Solar + Battery to Home Load + EV'],
  [_HAEO_COLOURS.battery.bg,_HAEO_COLOURS.battery.txt,'🌞 Solar + 🔋 Battery + 🚗 EV → 🏠 Base Load','Self Consumption - Solar + Battery + EV'],
  [_HAEO_COLOURS.forced_export.bg,_HAEO_COLOURS.forced_export.txt,'🌞 Solar + 🔋 Battery → 🏠 Base Load + ⚡ Grid (Force)','Profit - Grid Export (Forced Battery)'],
  [_HAEO_COLOURS.cost.bg,_HAEO_COLOURS.cost.txt,'🌞 Solar + ⚡ Grid → 🏠 Base Load','Cost - Solar + Grid Import'],
  [_HAEO_COLOURS.cost.bg,_HAEO_COLOURS.cost.txt,'🌞 Solar + ⚡ Grid → 🏠 Base Load + 🚗 EV','Cost - Solar + Grid to Home Load + EV'],
  [_HAEO_COLOURS.cost.bg,_HAEO_COLOURS.cost.txt,'🌞 Solar + ⚡ Grid → 🏠 Base Load + 🔋 Battery (Force)','Cost - Solar + Grid Import + Charge Battery'],
];

const _HAEO_LEG_R = [
  [_HAEO_COLOURS.battery.bg,_HAEO_COLOURS.battery.txt,'🔋 Battery → 🏠 Base Load','Self Consumption - Battery'],
  [_HAEO_COLOURS.battery.bg,_HAEO_COLOURS.battery.txt,'🔋 Battery → 🏠 Base Load + 🚗 EV','Self Consumption - Battery to Home Load + EV'],
  [_HAEO_COLOURS.battery.bg,_HAEO_COLOURS.battery.txt,'🔋 Battery + 🚗 EV → 🏠 Base Load','Self Consumption - Battery + EV to Home Load'],
  [_HAEO_COLOURS.battery.bg,_HAEO_COLOURS.battery.txt,'🔋 Battery → 🏠 Base Load + ⏰ Defer. Loads','Self Consumption - Battery to Home Load + Deferrable Load'],
  [_HAEO_COLOURS.profit.bg,_HAEO_COLOURS.profit.txt,'🔋 Battery → 🏠 Base Load + ⚡ Grid (Force)','Profit - Grid Export (Forced)'],
  [_HAEO_COLOURS.cost.bg,_HAEO_COLOURS.cost.txt,'🔋 Battery + ⚡ Grid → 🏠 Base Load','Cost - Battery + Grid Import'],
  [_HAEO_COLOURS.cost.bg,_HAEO_COLOURS.cost.txt,'🔋 Battery + 🚗 EV + ⚡ Grid → 🏠 Base Load','Cost - Battery + EV + Grid to Home Load'],
  [_HAEO_COLOURS.loss.bg,_HAEO_COLOURS.loss.txt,'⚡ Grid → 🏠 Base Load','Cost - Grid Import (Battery Idle | No Solar)'],
  [_HAEO_COLOURS.loss.bg,_HAEO_COLOURS.loss.txt,'⚡ Grid → 🏠 Base Load + 🚗 EV','Cost - Grid Import to Home Load + EV'],
  [_HAEO_COLOURS.loss.bg,_HAEO_COLOURS.loss.txt,'⚡ Grid → 🏠 Base Load + ⏰ Defer. Loads','Cost - Grid Import to Home Load + Deferrable Load'],
  [_HAEO_COLOURS.loss.bg,_HAEO_COLOURS.loss.txt,'🚗 EV → 🏠 Base Load','Cost - EV to Home Load'],
  [_HAEO_COLOURS.battery.bg,_HAEO_COLOURS.battery.txt,'❄️ 🚿 ⏰ Deferrable Loads','Placeholder - HVAC, HWS - Scheduled Loads'],
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

// ── Event Descriptions (for hover tooltips & legend modal) ──────────────────────
const _HAEO_DESCRIPTIONS = {
  // Self Consumption - Solar scenarios
  '🌞 Solar → 🏠 Base Load': 
    'Solar is supplying home load only. Battery idle and no grid activity. Optimal self-consumption with zero import/export.',
  
  '🌞 Solar → 🏠 Base Load + 🔋 Battery': 
    'Solar is supplying home load and charging battery. No grid activity. Battery will be available for discharge during peak demand or low solar periods.',
  
  '🌞 Solar + 🔋 Battery → 🏠 Base Load': 
    'Solar and battery together supplying home load. Battery is discharging to supplement solar. No grid activity.',
  
  '🌞 Solar → 🏠 Base Load + ⚡ Grid': 
    'Solar supplying home load with surplus exported to grid. Battery idle. Export occurs when solar generation exceeds home load.',
  
  '🌞 Solar → 🏠 Base Load + 🔋 Battery + ⚡ Grid': 
    'Solar supplying home load, charging battery, and exporting surplus to grid simultaneously. Optimal three-way allocation.',
  
  '🌞 Solar + 🔋 Battery → 🏠 Base Load + ⚡ Grid': 
    'Solar and battery together supplying home load with remaining power exported to grid. Battery discharging to maximize export.',
  
  '🌞 Solar → 🏠 Base Load + ⚡ Grid + 🔋 Battery (Force)': 
    'Solar supplying home load, charging battery, and exporting surplus to grid. Scheduled battery charge at optimal solar window.',
  
  '🌞 Solar + ⚡ Grid → 🏠 Base Load': 
    'Solar with grid supplement covering home load. Solar alone is insufficient; grid imports additional power.',
  
  '🌞 Solar + 🔋 Battery + ⚡ Grid → 🏠 Base Load': 
    'Solar, battery, and grid together covering home load. Battery discharging but solar and grid both needed due to high home demand.',
  
  '🌞 Solar → 🏠 Base Load + 🚗 EV': 
    'Solar supplying home load and charging EV. Battery idle. Pure solar-to-load and solar-to-EV scenario.',
  
  '🌞 Solar + 🔋 Battery → 🏠 Base Load + 🚗 EV': 
    'Solar and battery supplying home load and charging EV. No grid activity. Battery available for EV charging.',
  
  '🌞 Solar + ⚡ Grid → 🏠 Base Load + 🚗 EV': 
    'Solar and grid together covering home load while charging EV. Solar plus grid import needed for all three loads.',
  
  // Cost scenarios - Grid import (forced charge)
  '⚡ Grid → 🏠 Base Load': 
    'Grid supplying home load only. Battery idle. Occurs during off-peak tariffs or when solar unavailable.',
  
  '⚡ Grid → 🏠 Base Load + 🔋 Battery (Force)': 
    'Grid supplying home load and force-charging battery at low tariff rate during cheap import window. Battery will discharge during peak tariff periods for cost savings.',
  
  '⚡ Grid → 🏠 Base Load + 🚗 EV (Force)': 
    'Grid supplying home load and charging EV at low tariff rate. EV charging optimized for lowest cost periods.',
  
  '⚡ Grid → 🏠 Base Load + 🔋 Battery + 🚗 EV (Force)': 
    'Grid supplying home load, charging battery, and charging EV all at low tariff rate. Multiple loads optimized for cost savings.',
  
  '🌞 Solar + ⚡ Grid → 🏠 Base Load + 🔋 Battery (Force)': 
    'Solar with grid supplement covering home load while force-charging battery at low tariff rate. Battery will be available for peak discharge.',
  
  // Profit scenarios - Grid export (forced discharge)
  '🔋 Battery → 🏠 Base Load + ⚡ Grid (Force)': 
    'Battery discharging to cover home load and force-export to grid at high tariff rate. Scheduled export during peak pricing window for profit.',
  
  '🌞 Solar + 🔋 Battery → 🏠 Base Load + ⚡ Grid (Force)': 
    'Solar and battery together covering home load with forced battery export to grid at peak tariff rate. Maximizes export revenue.',
  
  '🔋 Battery + 🚗 EV → ⚡ Grid (Force)': 
    'Battery and EV both discharging to grid at high tariff rate. EV used as flexible storage asset for export during peak pricing.',
  
  '🌞 Solar + 🔋 Battery + 🚗 EV → ⚡ Grid': 
    'Solar, battery, and EV all exporting to grid simultaneously at peak tariff. Maximum export revenue from all available sources.',
  
  // Battery scenarios - no solar, no grid
  '🔋 Battery → 🏠 Base Load': 
    'Battery powering home load only. No solar generation and no grid activity. Battery will deplete; grid import will follow if battery low.',
  
  '🔋 Battery + ⚡ Grid → 🏠 Base Load': 
    'Battery discharging but grid supplement needed due to high home load exceeding battery capacity. Hybrid support scenario.',
  
  // EV scenarios
  '🚗 EV → 🏠 Base Load': 
    'EV discharging to cover home load (V2H/V2L). Vehicle is supplying power to home. No battery or grid involvement.',
  
  '🚗 EV + ⚡ Grid → 🏠 Base Load': 
    'EV discharging plus grid covering home load. Vehicle and grid both needed for home load demand.',
  
  '🔋 Battery + 🚗 EV → 🏠 Base Load': 
    'Battery and EV both discharging to cover home load. No solar or grid; using stored energy from both sources.',
  
  '🌞 Solar + 🔋 Battery + 🚗 EV → 🏠 Base Load': 
    'Solar, battery, and EV together supplying home load. All available sources optimized for load coverage.',
  
  '🌞 Solar + ⚡ Grid → 🏠 Base Load + 🚗 EV': 
    'Solar and grid together covering home load while charging EV. Solar plus grid import needed for all three loads.',
  
  '🌞 Solar → 🏠 Base Load + 🚗 EV + 🔋 Battery (Force)': 
    'Solar supplying home load and charging both EV and battery at low tariff rate. Battery will discharge during peak periods.',
  
  '🌞 Solar + ⚡ Grid → 🏠 Base Load + 🚗 EV + 🔋 Battery (Force)': 
    'Solar with grid supplement covering home load while force-charging both battery and EV at low tariff rate. Maximizes both storage assets.',
  
  '⚡ Grid → 🏠 Base Load + 🚗 EV + 🔋 Battery (Force)': 
    'Grid covering home load and force-charging both EV and battery at low tariff rate during cheap import window. Both will discharge during peak tariff periods for cost savings.',
  
  '🔋 Battery → 🚗 EV + 🏠 Base Load': 
    'Battery covering both home load and charging EV simultaneously. No solar or grid activity. Battery powering two loads.',
  
  '🔋 Battery → 🚗 EV (Charging)': 
    'Battery charging EV only. No solar, no grid, no home load involvement. Pure battery-to-vehicle charge transfer.',
  
  '🌞 Solar + 🔋 Battery → Loads (No Grid)': 
    'Solar and battery together supplying all loads with no grid involvement. Pure self-consumption with battery discharge. Occurs during high demand periods with sufficient solar generation.',
  
  '🌞 Solar + 🔋 Battery → 🏠 Base Load + 🚗 EV (Charge)': 
    'Solar and battery together covering home load and charging EV simultaneously. No grid activity. Both home and EV drawing from solar and battery discharge.',
  
  '🌞 Solar → 🏠 Base Load + 🚗 EV + 🔋 Battery (Force)': 
    'Solar supplying home load, charging EV, and force-charging battery at low tariff rate simultaneously. Battery will discharge during peak periods for cost optimization.',
};

function _haeo_classifyFuture(solarKw, loadKw, battKw, gridKw, evKw, deferLoadKw = 0, ev2Kw = 0, optionalLoadsKw = [], optionalLoadsConfig = []) {
  const T = 0.05;
  const charging    = battKw < -T;
  const discharging = battKw > T;
  const exporting   = gridKw < -T;  // negative = export
  const importing   = gridKw > T;   // positive = import
  const evCharging  = evKw < -T;
  const evDischarging = evKw > T;
  const ev2Charging = ev2Kw < -T;
  const ev2Discharging = ev2Kw > T;
  const hasDeferLoad = deferLoadKw > T;
  
  // Build optional loads label with custom names
  let optionalLoadsLabel = '';
  if (optionalLoadsConfig && optionalLoadsConfig.length > 0) {
    const activeOptional = [];
    optionalLoadsConfig.forEach((config, idx) => {
      if (config.enabled && optionalLoadsKw[idx] > T) {
        const displayInfo = _haeo_getOptionalLoadDisplay(config);
        activeOptional.push(displayInfo.emoji);
      }
    });
    if (activeOptional.length > 0) {
      optionalLoadsLabel = ' + ' + activeOptional.join(' ');
    }
  }
  
  // Build dynamic labels for active loads
  let activeLoadsStr = '🏠 Base Load';
  if (hasDeferLoad) activeLoadsStr += ' + ⏰ Defer. Loads';
  if (optionalLoadsLabel) activeLoadsStr += optionalLoadsLabel;
  if (evCharging) activeLoadsStr += ' + 🚗 EV';
  if (ev2Charging) activeLoadsStr += ' + 🚙 EV2';

  // ── EV/EV2 Discharging Scenarios (to grid) ──
  if ((evDischarging || ev2Discharging) && exporting && discharging && solarKw > T) {
    const evLabel = evDischarging && ev2Discharging ? '🚗 EV + 🚙 EV2' : evDischarging ? '🚗 EV' : '🚙 EV2';
    return { label: '🌞 Solar + 🔋 Battery + ' + evLabel + ' → ⚡ Grid', note: 'Solar, battery and EV(s) exporting to grid', color: 'pv_battery_ev_to_grid_export' };
  }
  if ((evDischarging || ev2Discharging) && exporting && discharging) {
    const evLabel = evDischarging && ev2Discharging ? '🚗 EV + 🚙 EV2' : evDischarging ? '🚗 EV' : '🚙 EV2';
    return { label: '🔋 Battery + ' + evLabel + ' → ⚡ Grid (Force)', note: 'Battery and EV(s) exporting to grid', color: 'battery_ev_to_grid_force' };
  }
  if ((evDischarging || ev2Discharging) && discharging && solarKw > T) {
    const evLabel = evDischarging && ev2Discharging ? '🚗 EV + 🚙 EV2' : evDischarging ? '🚗 EV' : '🚙 EV2';
    return { label: '🌞 Solar + 🔋 Battery + ' + evLabel + ' → ' + activeLoadsStr, note: 'Solar, battery and EV(s) covering loads', color: 'pv_battery_ev_to_loads' };
  }
  if ((evDischarging || ev2Discharging) && discharging) {
    const evLabel = evDischarging && ev2Discharging ? '🚗 EV + 🚙 EV2' : evDischarging ? '🚗 EV' : '🚙 EV2';
    return { label: '🔋 Battery + ' + evLabel + ' → ' + activeLoadsStr, note: 'Battery and EV(s) covering loads', color: 'battery_ev_to_loads' };
  }
  if ((evDischarging || ev2Discharging) && importing) {
    const evLabel = evDischarging && ev2Discharging ? '🚗 EV + 🚙 EV2' : evDischarging ? '🚗 EV' : '🚙 EV2';
    return { label: evLabel + ' + ⚡ Grid → ' + activeLoadsStr, note: 'EV(s) and grid covering loads', color: 'battery_grid_to_loads' };
  }
  if (evDischarging || ev2Discharging) {
    const evLabel = evDischarging && ev2Discharging ? '🚗 EV + 🚙 EV2' : evDischarging ? '🚗 EV' : '🚙 EV2';
    return { label: evLabel + ' → ' + activeLoadsStr, note: 'EV(s) covering loads', color: 'pv_ev_to_loads' };
  }
  
  // ── EV/EV2 Charging Scenarios ──
  if ((evCharging || ev2Charging) && solarKw > T && discharging) {
    const evLabel = evCharging && ev2Charging ? '🚗 EV + 🚙 EV2' : evCharging ? '🚗 EV' : '🚙 EV2';
    return { label: '🌞 Solar + 🔋 Battery → 🏠 Base Load + ' + evLabel, note: 'Solar and battery covering home and charging EV(s)', color: 'pv_battery_to_baseload_ev_charge' };
  }
  if ((evCharging || ev2Charging) && solarKw > T && importing) {
    const evLabel = evCharging && ev2Charging ? '🚗 EV + 🚙 EV2' : evCharging ? '🚗 EV' : '🚙 EV2';
    return { label: '🌞 Solar + ⚡ Grid → 🏠 Base Load + ' + evLabel, note: 'Solar and grid covering home and charging EV(s)', color: 'pv_grid_to_baseload_ev_charge' };
  }
  if ((evCharging || ev2Charging) && solarKw > T && charging) {
    const evLabel = evCharging && ev2Charging ? '🚗 EV + 🚙 EV2' : evCharging ? '🚗 EV' : '🚙 EV2';
    return { label: '🌞 Solar → 🏠 Base Load + ' + evLabel + ' + 🔋 Battery (Force)', note: 'Solar covering home and charging EV(s) and battery at low tariff', color: 'pv_to_baseload_ev_battery_force' };
  }
  if ((evCharging || ev2Charging) && solarKw > T) {
    const evLabel = evCharging && ev2Charging ? '🚗 EV + 🚙 EV2' : evCharging ? '🚗 EV' : '🚙 EV2';
    return { label: '🌞 Solar → 🏠 Base Load + ' + evLabel, note: 'Solar covering home and charging EV(s)', color: 'pv_to_baseload_ev' };
  }
  if ((evCharging || ev2Charging) && importing && charging && solarKw > T) {
    const evLabel = evCharging && ev2Charging ? '🚗 EV + 🚙 EV2' : evCharging ? '🚗 EV' : '🚙 EV2';
    return { label: '🌞 Solar + ⚡ Grid → 🏠 Base Load + ' + evLabel + ' + 🔋 Battery (Force)', note: 'Solar with grid covering home and charging EV(s) and battery', color: 'pv_grid_to_baseload_ev_battery_force' };
  }
  if ((evCharging || ev2Charging) && importing && charging) {
    const evLabel = evCharging && ev2Charging ? '🚗 EV + 🚙 EV2' : evCharging ? '🚗 EV' : '🚙 EV2';
    return { label: '⚡ Grid → 🏠 Base Load + ' + evLabel + ' + 🔋 Battery (Force)', note: 'Grid covering home and charging EV(s) and battery', color: 'grid_to_baseload_ev_battery_force' };
  }
  if ((evCharging || ev2Charging) && importing) {
    const evLabel = evCharging && ev2Charging ? '🚗 EV + 🚙 EV2' : evCharging ? '🚗 EV' : '🚙 EV2';
    return { label: '⚡ Grid → 🏠 Base Load + ' + evLabel + ' (Force)', note: 'Grid covering home and charging EV(s)', color: 'grid_to_baseload_ev_force' };
  }
  if ((evCharging || ev2Charging) && charging) {
    const evLabel = evCharging && ev2Charging ? '🚗 EV + 🚙 EV2' : evCharging ? '🚗 EV' : '🚙 EV2';
    return { label: '🔋 Battery → ' + evLabel + ' + 🏠 Base Load', note: 'Battery covering home load and charging EV(s)', color: 'battery_ev_to_baseload' };
  }
  if (evCharging || ev2Charging) {
    const evLabel = evCharging && ev2Charging ? '🚗 EV + 🚙 EV2' : evCharging ? '🚗 EV' : '🚙 EV2';
    return { label: '🔋 Battery → ' + evLabel + ' (Charging)', note: 'Battery charging EV(s)', color: 'battery_ev_charge' };
  }

  // ── Force export (battery discharging to grid) ──
  if (exporting && discharging && solarKw > T)
    return { label: '🌞 Solar + 🔋 Battery → 🏠 Base Load + ⚡ Grid (Force)', note: 'Forced export: solar and battery exporting to grid', color: 'pv_battery_to_baseload_grid_force' };
  if (exporting && discharging)
    return { label: '🔋 Battery → 🏠 Base Load + ⚡ Grid (Force)', note: 'Forced discharge: battery exporting to grid', color: 'battery_to_baseload_grid_force' };

  // ── Forced grid charge ──
  if (charging && importing && solarKw > T)
    return { label: '🌞 Solar + ⚡ Grid → 🏠 Base Load + 🔋 Battery (Force)', note: 'Solar + forced grid charging battery', color: 'pv_grid_to_baseload_battery_force' };
  if (charging && importing)
    return { label: '⚡ Grid → 🏠 Base Load + 🔋 Battery (Force)', note: 'Forced grid charging — cheap rate window', color: 'grid_to_baseload_battery_force' };
  if (charging && solarKw > T)
    return { label: '🌞 Solar → 🏠 Base Load + 🔋 Battery', note: 'Solar covering home and charging battery — no grid', color: 'pv_to_baseload_battery' };

  // ── Solar scenarios ──
  if (solarKw > T && exporting && battKw > T)
    return { label: '🌞 Solar + 🔋 Battery → ' + activeLoadsStr + ' + ⚡ Grid (Force)', note: 'Solar and battery covering home and exporting', color: 'pv_battery_to_loads_grid_force' };
  if (solarKw > T && exporting && charging)
    return { label: '🌞 Solar → ' + activeLoadsStr + ' + 🔋 Battery + ⚡ Grid', note: 'Solar covering home, charging battery and exporting', color: 'pv_to_loads_battery_grid' };
  if (solarKw > T && exporting)
    return { label: '🌞 Solar → ' + activeLoadsStr + ' + ⚡ Grid', note: 'Solar covering home and exporting surplus', color: 'pv_to_loads_grid' };
  if (solarKw > T && discharging && importing)
    return { label: '🌞 Solar + 🔋 Battery + ⚡ Grid → ' + activeLoadsStr, note: 'Solar and battery discharging but grid also needed', color: 'pv_battery_grid_to_loads' };
  if (solarKw > T && discharging)
    return { label: '🌞 Solar + 🔋 Battery → ' + activeLoadsStr, note: 'Solar and battery together covering home — no grid', color: 'pv_battery_to_loads_no_grid' };
  if (solarKw > T && importing)
    return { label: '🌞 Solar + ⚡ Grid → ' + activeLoadsStr, note: 'Solar and grid together covering home', color: 'pv_grid_to_loads' };
  if (solarKw > T && charging)
    return { label: '🌞 Solar → ' + activeLoadsStr + ' + 🔋 Battery', note: 'Solar covering home and charging battery — no grid', color: 'pv_to_loads_battery' };
  if (solarKw > T)
    return { label: '🌞 Solar → ' + activeLoadsStr, note: 'Solar covering home — no battery, no grid', color: 'pv_to_loads_only' };

  // ── No solar ──
  if (discharging && exporting)
    return { label: '🔋 Battery → ' + activeLoadsStr + ' + ⚡ Grid (Force)', note: 'Forced discharge: battery exporting to grid', color: 'battery_to_loads_grid_force' };
  if (discharging && importing)
    return { label: '🔋 Battery + ⚡ Grid → ' + activeLoadsStr, note: 'Battery discharging but grid supplement needed', color: 'battery_grid_to_loads' };
  if (discharging)
    return { label: '🔋 Battery → ' + activeLoadsStr, note: 'Battery powering home — no solar, no grid', color: 'battery_to_loads_only' };
  if (importing && charging)
    return { label: '⚡ Grid → ' + activeLoadsStr + ' + 🔋 Battery (Force)', note: 'Forced grid charging — cheap rate window', color: 'grid_to_loads_battery_force' };
  if (importing)
    return { label: '⚡ Grid → ' + activeLoadsStr, note: 'Grid covering home — battery idle', color: 'grid_to_loads_only' };
  // Fallback: load present but source not explicit in forecast
  if (loadKw > T)
    return { label: '🔋 Battery → ' + activeLoadsStr, note: 'Inferred: battery powering home — no explicit source in forecast', color: 'battery_to_loads_inferred' };
  return { label: '—', note: '', color: '' };
}

// ── Classify past ─────────────────────────────────────────────────────────────
function _haeo_classifyPast(solarKw, loadKw, battKw, gridKw, evKw, deferLoadKw = 0, ev2Kw = 0, optionalLoadsKw = [], optionalLoadsConfig = []) {
  const T = 0.10;
  const charging    = battKw < -T;
  const discharging = battKw > T;
  const exporting   = gridKw < -T;  // negative = export
  const importing   = gridKw > T;   // positive = import
  const evCharging  = evKw < -T;
  const evDischarging = evKw > T;

  // ── EV Scenarios ──
  if (evDischarging && exporting && discharging && solarKw > T)
    return { label: '🌞 Solar + 🔋 Battery + 🚗 EV → ⚡ Grid', color: 'pv_battery_ev_to_grid_export' };
  if (evDischarging && exporting && discharging)
    return { label: '🔋 Battery + 🚗 EV → ⚡ Grid (Force)', color: 'battery_ev_to_grid_force' };
  if (evDischarging && discharging && solarKw > T)
    return { label: '🌞 Solar + 🔋 Battery + 🚗 EV → 🏠 Base Load', color: 'pv_battery_ev_to_loads' };
  if (evDischarging && discharging)
    return { label: '🔋 Battery + 🚗 EV → 🏠 Base Load', color: 'battery_ev_to_loads' };
  if (evDischarging && importing)
    return { label: '🚗 EV + ⚡ Grid → 🏠 Base Load', color: 'battery_grid_to_loads' };
  if (evDischarging)
    return { label: '🚗 EV → 🏠 Base Load', color: 'pv_ev_to_loads' };
  if (evCharging && solarKw > T && discharging)
    return { label: '🌞 Solar + 🔋 Battery → 🏠 Base Load + 🚗 EV', color: 'pv_battery_to_baseload_ev_charge' };
  if (evCharging && solarKw > T && importing)
    return { label: '🌞 Solar + ⚡ Grid → 🏠 Base Load + 🚗 EV', color: 'pv_grid_to_baseload_ev_charge' };
  if (evCharging && solarKw > T && charging)
    return { label: '🌞 Solar → 🏠 Base Load + 🚗 EV + 🔋 Battery (Force)', color: 'pv_to_baseload_ev_battery_force' };
  if (evCharging && solarKw > T)
    return { label: '🌞 Solar → 🏠 Base Load + 🚗 EV', color: 'pv_to_baseload_ev' };
  if (evCharging && importing && charging)
    return { label: '⚡ Grid → 🏠 Base Load + 🚗 EV + 🔋 Battery (Force)', color: 'grid_to_baseload_ev_battery_force' };
  if (evCharging && importing)
    return { label: '⚡ Grid → 🏠 Base Load + 🚗 EV (Force)', color: 'grid_to_baseload_ev_force' };
  if (evCharging && charging)
    return { label: '🔋 Battery → 🚗 EV + 🏠 Base Load', color: 'battery_ev_to_baseload' };
  if (evCharging)
    return { label: '🔋 Battery → 🚗 EV (Charging)', color: 'battery_ev_charge' };

  // Force export (battery discharging to grid)
  if (exporting && discharging && solarKw > T)
    return { label: '🌞 Solar + 🔋 Battery → 🏠 Base Load + ⚡ Grid (Force)', color: 'pv_battery_to_baseload_grid_force' };
  if (exporting && discharging)
    return { label: '🔋 Battery → 🏠 Base Load + ⚡ Grid (Force)', color: 'battery_to_baseload_grid_force' };
  // Solar with export
  if (solarKw > T && exporting && charging)
    return { label: '🌞 Solar → 🏠 Base Load + 🔋 Battery + ⚡ Grid', note: 'Solar covering home, charging battery, and exporting to grid', color: 'pv_to_baseload_battery_grid' };
  if (solarKw > T && exporting)
    return { label: '🌞 Solar → 🏠 Base Load + ⚡ Grid', color: 'pv_to_baseload_battery' };
  // Forced grid charge
  if (charging && importing && solarKw > T)
    return { label: '🌞 Solar + ⚡ Grid → 🏠 Base Load + 🔋 Battery (Force)', color: 'pv_grid_to_baseload_battery_force' };
  if (charging && importing)
    return { label: '⚡ Grid → 🏠 Base Load + 🔋 Battery (Force)', color: 'grid_to_baseload_battery_force' };
  if (charging && solarKw > T)
    return { label: '🌞 Solar → 🏠 Base Load + 🔋 Battery', color: 'pv_to_baseload_battery' };
  // Solar self-consumption
  if (solarKw > T && discharging && importing)
    return { label: '🌞 Solar + 🔋 Battery + ⚡ Grid → 🏠 Base Load', color: 'pv_battery_grid_to_loads' };
  if (solarKw > T && discharging)
    return { label: '🌞 Solar + 🔋 Battery → 🏠 Base Load', color: 'pv_battery_to_loads_no_grid' };
  if (solarKw > T && importing)
    return { label: '🌞 Solar + ⚡ Grid → 🏠 Base Load', color: 'pv_grid_to_loads' };
  if (solarKw > T)
    return { label: '🌞 Solar → 🏠 Base Load', color: 'pv_to_loads_only' };
  // No solar
  if (discharging && importing)
    return { label: '🔋 Battery + ⚡ Grid → 🏠 Base Load', color: 'battery_grid_to_loads' };
  if (discharging)
    return { label: '🔋 Battery → 🏠 Base Load', color: 'battery_to_loads_only' };
  if (importing && charging)
    return { label: '⚡ Grid → 🏠 Base Load + 🔋 Battery (Force)', color: 'grid_to_loads_battery_force' };
  if (importing)
    return { label: '⚡ Grid → 🏠 Base Load', color: 'grid_to_loads_only' };
  if (loadKw > T)
    return { label: '⚡ Grid → 🏠 Base Load', color: 'grid_to_loads_only' };
  return { label: '—', color: '' };
}

// ── Formatters ────────────────────────────────────────────────────────────────
function _haeo_fmtP(v) {
  return (v < 0 ? '-' : '') + _HAEO_CUR + Math.abs(v).toFixed(4);
}

// Returns {disp, col} — cost > 0 = money spent (import), cost < 0 = money earned (export)
function _haeo_fmtCost(cost) {
  if (cost > 0.0001)  return { disp: '-' + _HAEO_CUR + cost.toFixed(3),           col: null };
  if (cost < -0.0001) return { disp: _HAEO_CUR  + Math.abs(cost).toFixed(3), col: '#4caf50' };
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

// Get display name and abbreviation for optional load (preset or custom)
function _haeo_getOptionalLoadDisplay(config) {
  if (!config) return { name: '', abbr: '', emoji: '🔌' };
  
  const emoji = config.emoji || '🔌';
  
  // If custom name exists, use it
  if (config.loadName === 'custom' && config.customName) {
    const customName = config.customName.trim();
    // Generate abbreviation from custom name (first 3-6 chars or first words)
    const abbr = customName.length > 10 
      ? customName.split(' ').map(w => w[0]).join('').substring(0, 4).toUpperCase()
      : customName.substring(0, 6);
    return { name: customName, abbr: abbr, emoji: emoji };
  }
  
  // If preset selected, use preset abbreviation map
  if (config.loadName) {
    const presetAbbrMap = {
      'Air Conditioner': { name: 'Air Conditioner', abbr: 'HVAC' },
      'Hot Water System': { name: 'Hot Water System', abbr: 'HWS' },
      'Clothes Dryer': { name: 'Clothes Dryer', abbr: 'C. Dryer' },
      'Washing Machine': { name: 'Washing Machine', abbr: 'W. Machine' },
      'Dishwasher': { name: 'Dishwasher', abbr: 'Dishw.' },
      'IT Hardware': { name: 'IT Hardware', abbr: 'IT H/W' },
      'Pool': { name: 'Pool', abbr: 'Pump' },
      'Generic Load': { name: 'Generic Load', abbr: 'Generic' }
    };
    
    const preset = presetAbbrMap[config.loadName];
    if (preset) {
      return { name: preset.name, abbr: preset.abbr, emoji: emoji };
    }
  }
  
  // Fallback
  return { name: '', abbr: '', emoji: emoji };
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
    '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;">' +
    '<button id="legend-view-btn" title="View legend" style="background:#000099;border:none;cursor:pointer;color:#fff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:12px;">View Legend</button>' +
    '<div style="display:flex;gap:8px;align-items:center;">' +
    '<button id="settings-btn" title="Column settings" style="background:var(--card-background-color);border:1px solid var(--divider-color);cursor:pointer;color:var(--primary-text-color);font-size:11px;font-weight:600;padding:4px 10px;border-radius:12px;">⚙️ Settings</button>' +
    '<span style="color:var(--secondary-text-color);font-size:9px;font-weight:normal;">' + _HAEO_VERSION + '</span>' +
    '</div>' +
    '</div>' +
    '</div>';
}

// ── Shared column definitions ─────────────────────────────────────────────────
// Time(52) | Event(auto flex) | Buy(68) | Sell(68) | Base Load kW(44) kWh(46) | Defer. Loads kW(44) kWh(46) | Solar kW(44) kWh(46) | Grid kW(44) kWh(46) | Batt kW(44) kWh(46) SoC(46) | EV kW(44) kWh(46) SoC(46) | EV2 kW(44) kWh(46) SoC(46) | Cost(72)
// Build COLGROUP dynamically based on column settings and deferrable loads config
function _haeo_buildColgroup(colSettings = {deferLoad: false, ev: false, ev2: false}, deferLoadsConfig = [], enabledOptionalLoads = []) {
  let cols = [
    '<col style="width:52px;">',                    // Time
    '<col style="width:auto; min-width:120px;">',   // Event - flex to fill remaining space
    '<col style="width:68px;">',                    // Buy $
    '<col style="width:68px;">',                    // Sell $
    '<col style="width:44px;">',                    // Base Load kW
    '<col style="width:46px;">',                    // Base Load kWh
  ];
  
  // Add Def. Loads toggle columns and optional load columns (only if deferLoad enabled)
  if (colSettings.deferLoad !== false) {
    cols.push('<col style="width:44px;">');        // Def. Loads kW (toggle)
    cols.push('<col style="width:46px;">');        // Def. Loads kWh
    deferLoadsConfig.forEach(config => {
      cols.push('<col style="width:44px;">');        // Optional Load kW
      cols.push('<col style="width:46px;">');        // Optional Load kWh
    });
  }
  
  // Add enabled optional loads columns (after Def. Loads, before Solar)
  enabledOptionalLoads.forEach(load => {
    cols.push('<col style="width:44px;">');        // Optional Load kW
    cols.push('<col style="width:46px;">');        // Optional Load kWh
  });
  
  cols.push('<col style="width:44px;">');                    // Solar kW
  cols.push('<col style="width:46px;">');                    // Solar kWh
  cols.push('<col style="width:44px;">');                    // Grid kW
  cols.push('<col style="width:46px;">');                    // Grid kWh
  cols.push('<col style="width:44px;">');                    // Batt kW
  cols.push('<col style="width:46px;">');                    // Batt kWh
  cols.push('<col style="width:46px;">');                    // Batt SoC
  
  if (colSettings.ev !== false) {
    cols.push('<col style="width:44px;">');        // EV kW
    cols.push('<col style="width:46px;">');        // EV kWh
    cols.push('<col style="width:46px;">');        // EV SoC
  }
  if (colSettings.ev2 !== false) {
    cols.push('<col style="width:44px;">');        // EV2 kW
    cols.push('<col style="width:46px;">');        // EV2 kWh
    cols.push('<col style="width:46px;">');        // EV2 SoC
  }
  
  cols.push('<col style="width:72px;">');          // Cost/Profit
  
  return '<colgroup>' + cols.join('') + '</colgroup>';
}

// Build THEAD dynamically based on column settings and deferrable loads config
function _haeo_buildThead(colSettings = {deferLoad: false, ev: false, ev2: false}, deferLoadsConfig = [], enabledOptionalLoads = [], tabType = 'future') {
  let eventHeader = tabType === 'past' 
    ? '<span style="font-size:2.0em;">🔎</span> BESS Past Events' 
    : '<span style="font-size:2.0em;">🔮</span> HAEO Forecast Decisions';
  let topHeaders = [
    '<th rowspan="2" style="text-align:left;vertical-align:bottom;background-color:#1a1a1a;">Time</th>',
    '<th rowspan="2" style="text-align:center;vertical-align:bottom;background-color:#1a1a1a;">' + eventHeader + '</th>',
    '<th rowspan="2" style="text-align:center;vertical-align:bottom;box-shadow:inset 2px 0 0 #666;background-color:#1a1a1a;">Buy<br>💲/kWh</th>',
    '<th rowspan="2" style="text-align:center;vertical-align:bottom;box-shadow:inset 1px 0 0 #555;background-color:#1a1a1a;">Sell<br>💲/kWh</th>',
    '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #1a1a1a;background-color:#1a1a1a;">🏠 Base Load</th>',
  ];
  
  // Add Def. Loads header and optional load headers (only if deferLoad enabled)
  if (colSettings.deferLoad !== false) {
    topHeaders.push('<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #1a1a1a;background-color:#1a1a1a;">⏰ Def. Loads</th>');
    deferLoadsConfig.forEach(config => {
      // Find preset to get abbreviation
      const preset = _HAEO_DEFERRABLE_PRESETS.find(p => p.name === config.name);
      const displayLabel = preset ? `${preset.emoji} ${preset.abbr}` : `${config.emoji} ${config.name}`;
      topHeaders.push(`<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #1a1a1a;background-color:#1a1a1a;">${displayLabel}</th>`);
    });
  }
  
  // Add enabled optional loads headers (after Def. Loads, before Solar)
  enabledOptionalLoads.forEach(load => {
    const displayInfo = _haeo_getOptionalLoadDisplay(load);
    const headerLabel = displayInfo.emoji + ' ' + displayInfo.abbr;
    topHeaders.push(`<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #1a1a1a;background-color:#1a1a1a;">${headerLabel}</th>`);
  });
  
  topHeaders.push(
    '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #1a1a1a;background-color:#1a1a1a;">🌞 Solar</th>',
    '<th colspan="2" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #1a1a1a;background-color:#1a1a1a;">⚡ Grid</th>',
    '<th colspan="3" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #1a1a1a;background-color:#1a1a1a;">🔋 Battery</th>'
  );
  
  if (colSettings.ev !== false) {
    topHeaders.push('<th colspan="3" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #1a1a1a;background-color:#1a1a1a;">🚗 EV</th>');
  }
  if (colSettings.ev2 !== false) {
    topHeaders.push('<th colspan="3" style="text-align:center;box-shadow:inset 2px 0 0 #666;border-bottom:1px solid #1a1a1a;background-color:#1a1a1a;">🚙 EV2</th>');
  }
  
  topHeaders.push('<th rowspan="2" style="text-align:center;vertical-align:bottom;box-shadow:inset 2px 0 0 #666;background-color:#1a1a1a;">Cost/<br>Profit</th>');
  
  let botHeaders = [
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;background-color:#1a1a1a;">kW</th>',
    '<th class="bgi" style="text-align:right;background-color:#1a1a1a;">kWh</th>',
  ];
  
  // Add Def. Loads and optional load bottom headers (only if deferLoad enabled)
  if (colSettings.deferLoad !== false) {
    botHeaders.push(
      '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;background-color:#1a1a1a;">kW</th>',
      '<th class="bgi" style="text-align:right;background-color:#1a1a1a;">kWh</th>'
    );
    deferLoadsConfig.forEach(config => {
      botHeaders.push('<th style="box-shadow:inset 2px 0 0 #666;text-align:right;background-color:#1a1a1a;">kW</th>');
      botHeaders.push('<th class="bgi" style="text-align:right;background-color:#1a1a1a;">kWh</th>');
    });
  }
  
  // Add enabled optional loads bottom headers (after Def. Loads, before Solar)
  enabledOptionalLoads.forEach(load => {
    botHeaders.push('<th style="box-shadow:inset 2px 0 0 #666;text-align:right;background-color:#1a1a1a;">kW</th>');
    botHeaders.push('<th class="bgi" style="text-align:right;background-color:#1a1a1a;">kWh</th>');
  });
  
  botHeaders.push(
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;background-color:#1a1a1a;">kW</th>',
    '<th class="bgi" style="text-align:right;background-color:#1a1a1a;">kWh</th>',
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;background-color:#1a1a1a;">kW</th>',
    '<th class="bgi" style="text-align:right;background-color:#1a1a1a;">kWh</th>',
    '<th style="box-shadow:inset 2px 0 0 #666;text-align:right;background-color:#1a1a1a;">kW</th>',
    '<th class="bgi" style="text-align:right;background-color:#1a1a1a;">kWh</th>',
    '<th class="bgi" style="text-align:right;background-color:#1a1a1a;">SoC %</th>'
  );
  
  if (colSettings.ev !== false) {
    botHeaders.push('<th style="box-shadow:inset 2px 0 0 #666;text-align:right;background-color:#1a1a1a;">kW</th>');
    botHeaders.push('<th class="bgi" style="text-align:right;background-color:#1a1a1a;">kWh</th>');
    botHeaders.push('<th class="bgi" style="text-align:right;background-color:#1a1a1a;">SoC %</th>');
  }
  if (colSettings.ev2 !== false) {
    botHeaders.push('<th style="box-shadow:inset 2px 0 0 #666;text-align:right;background-color:#1a1a1a;">kW</th>');
    botHeaders.push('<th class="bgi" style="text-align:right;background-color:#1a1a1a;">kWh</th>');
    botHeaders.push('<th class="bgi" style="text-align:right;background-color:#1a1a1a;">SoC %</th>');
  }
  
  return '<thead><tr>' + topHeaders.join('') + '</tr><tr>' + botHeaders.join('') + '</tr></thead>';
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const _HAEO_STYLE = [
  ':host { display: block; width: 100%; }',
  'ha-card { width: 100%; box-sizing: border-box; }',
  '.card { padding: 8px 12px; font-family: var(--primary-font-family, sans-serif); font-size: 12px; width: 100%; box-sizing: border-box; }',
  '.tabs { display: flex; gap: 0; border-bottom: 2px solid var(--divider-color,#444); margin-bottom: 10px; align-items: stretch; }',
  '.tab { padding: 6px 18px; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--secondary-text-color); border-bottom: 3px solid transparent; margin-bottom: -2px; }',
  '.tab.active { color: #2196F3; border-bottom-color: #2196F3; background: rgba(33,150,243,0.07); }',
  '.sbar { display: flex; gap: 4px; align-items: center; padding: 4px 0 8px 12px; font-size: 12px; flex-wrap: wrap; width: 100%; border-bottom: 3px solid #333; margin-bottom: 0; position: sticky; top: 0; background: var(--card-background-color); z-index: 10; }',
  '.pill { padding: 3px 10px; border-radius: 12px; font-weight: 500; font-size: 11px; color: #fff; }',
  '.stxt { color: var(--secondary-text-color); font-size: 11px; }',
  '.wrap { overflow: auto; width: 100%; }',
  '.pane { display: none; }',
  '.pane.active { display: block; }',
  '.dt-head { position: sticky; top: 0; z-index: 10; }',
  '.dt { border-collapse: collapse; width: 100%; table-layout: fixed; background: var(--card-background-color); }',
  '.dt thead { background-color: #1a1a1a; }',
  '.dt thead tr { line-height: 1; margin: 0; padding: 0; }',
  '.dt thead th { background-color: #1a1a1a; font-weight: bold; color: var(--primary-text-color); border-bottom: 1px solid #666; }',
  '.dt thead tr:last-child th { border-bottom: 2px solid #888; }',
  '.dt th, .dt td { padding: 5px 6px; font-size: 12px; line-height: 1.35; white-space: nowrap; text-align: right; box-sizing: border-box; border-bottom: none; }',
  '.dt th, .dt td { border-right: 1px solid #333; }',
  '.dt th:last-child, .dt td:last-child { border-right: none; }',
  '.dt tbody tr { border-bottom: 1px solid rgba(255,255,255,0.06); }',
  '.dt tbody tr:last-child { border-bottom: none; }',
  '.dr td { border-top: 2px solid var(--divider-color,#555) !important; border-bottom: 2px solid var(--divider-color,#555) !important; background: var(--secondary-background-color); }',
  '.dt td:nth-child(1) { text-align: left !important; }',
  '.dt td:nth-child(2) { text-align: left; white-space: normal; }',
  '.bgl { box-shadow: inset 2px 0 0 #666; }',
  '.bgi { box-shadow: inset 1px 0 0 #555; }',
  'th.bgi { background-color: #1a1a1a; }',
  '.msg { padding: 20px; text-align: center; color: var(--secondary-text-color); }',
  '.err { padding: 10px; color: #f44336; }',
  '.tooltip { position: absolute; background: var(--card-background-color); color: var(--primary-text-color); padding: 8px 12px; border-radius: 4px; font-size: 11px; max-width: 350px; white-space: normal; z-index: 999; box-shadow: 0 2px 8px rgba(0,0,0,0.3); line-height: 1.4; }',
  '.legend-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }',
  '.legend-modal-content { background: var(--card-background-color); color: var(--primary-text-color); border-radius: 8px; max-width: 700px; max-height: 85vh; overflow-y: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.3); }',
  '.legend-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--divider-color); position: sticky; top: 0; background: var(--card-background-color); }',
  '.legend-modal-header h2 { margin: 0; font-size: 18px; }',
  '.legend-modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--primary-text-color); }',
  '.legend-modal-body { padding: 16px; }',
  '.legend-category { margin-bottom: 20px; }',
  '.legend-category-title { font-weight: bold; font-size: 13px; margin-bottom: 10px; color: var(--secondary-text-color); }',
  '.legend-item { display: flex; gap: 12px; margin-bottom: 10px; padding: 8px; border-radius: 4px; background: rgba(0,0,0,0.1); }',
  '.legend-item-color { width: 24px; height: 24px; border-radius: 4px; flex-shrink: 0; }',
  '.legend-item-content { flex: 1; }',
  '.legend-item-label { font-weight: 600; font-size: 12px; margin-bottom: 3px; }',
  '.legend-item-desc { font-size: 11px; color: var(--secondary-text-color); line-height: 1.4; }',
  '.settings-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }',
  '.settings-modal-content { background: var(--card-background-color); color: var(--primary-text-color); border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); max-height: calc(100vh - 90px); display: flex; flex-direction: column; }',
  '.settings-tab { transition: all 0.2s ease; }',
  '.settings-tab.active { color: #2196F3; border-bottom-color: #2196F3 !important; }',
  '.settings-tab-content { display: none !important; }',
  '.settings-tab-content.active { display: block !important; }',
  '.settings-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--divider-color); }',
  '.settings-modal-header h2 { margin: 0; font-size: 18px; }',
  '.settings-modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--primary-text-color); }',
  '.settings-modal-body { padding: 16px; overflow-y: auto; }',
  '.defer-load-config-item { border: 1px solid var(--divider-color); border-radius: 4px; padding: 12px; background: rgba(0,0,0,0.05); }',
  '.defer-load-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }',
  '.defer-load-row-full { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 12px; }',
  '.emoji-picker-btn { background: none; border: 1px solid var(--divider-color); border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 18px; color: var(--primary-text-color); }',
  '.emoji-picker-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; padding: 16px; z-index: 2000; max-height: 60vh; overflow-y: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.3); }',
  '.emoji-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 8px; }',
  '.emoji-grid-item { padding: 8px; text-align: center; cursor: pointer; border-radius: 4px; font-size: 24px; }',
  '.entity-dropdown-list { position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: var(--card-background-color); border: 1px solid var(--divider-color); border-top: none; border-radius: 0 0 4px 4px; z-index: 100; }',
  '.entity-option { padding: 8px; border-bottom: 1px solid var(--divider-color); cursor: pointer; font-size: 12px; }',
  '.entity-option:hover { background: rgba(0,0,0,0.1); }',
].join('\n');

// ── HTML template ─────────────────────────────────────────────────────────────
function _haeo_buildHTML(colSettings = {ev: true, ev2: true}, deferLoadsConfig = [], enabledOptionalLoads = []) {
  const colgroup = _haeo_buildColgroup(colSettings, deferLoadsConfig, enabledOptionalLoads);
  const thead_future = _haeo_buildThead(colSettings, deferLoadsConfig, enabledOptionalLoads, 'future');
  const thead_past = _haeo_buildThead(colSettings, deferLoadsConfig, enabledOptionalLoads, 'past');
  
  const html = '<style>' + _HAEO_STYLE + '</style>' +
    '<ha-card><div class="card">' +
    '<div class="tabs">' +
    '<div class="tab active" id="tab-future">📅 Future Decisions</div>' +
    '<div class="tab" id="tab-past">📋 Past Events</div>' +
    '<span id="haeo-updated-badge" style="display:flex;gap:4px;align-self:center;margin-left:auto;margin-right:12px;"></span>' +
    '<span id="range-past-wrap" style="display:none;align-self:center;padding:0 4px;">' +
    '<select id="range-past" style="font-size:11px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;padding:2px 6px;cursor:pointer;">' +
    '<option value="today">Today</option><option value="yesterday">Yesterday</option><option value="24">Last 24h</option>' +
    '<option value="48">Last 48h</option><option value="72">Last 72h</option><option value="96">Last 96h</option>' +
    '<option value="168">Last 7 days</option></select></span>' +
    '</div>' +
    '<div id="grid-export-alert" style="display:flex;gap:4px;padding:8px 0 8px 12px;background:rgba(0,0,0,0.1);border-bottom:1px solid var(--divider-color);flex-wrap:wrap;align-items:center;min-height:24px;"></div>' +
    '<div class="pane active" id="pane-future">' +
    '<div class="sbar" id="sbar-future">⏳ Loading...</div>' +
    '<div class="wrap">' +
    '<table class="dt dt-head" id="table-future-head" style="margin-bottom:0;">' + colgroup + thead_future + '</table>' +
    '<table class="dt" id="table-future">' + colgroup +
    '<tbody id="tb-future"><tr><td colspan="20" class="msg">⏳ Loading...</td></tr></tbody>' +
    '</table></div></div>' +
    '<div class="pane" id="pane-past">' +
    '<div class="sbar">' +
    '<strong style="color:var(--primary-text-color);">Past Events</strong>' +
    '<span class="stxt" id="st-past">Select a range to load</span>' +
    '<span style="margin:0 auto;font-size:inherit;color:#f44336;font-weight:600;">📝 Note: Shows recorded sensor values for your inverter/battery system, not HAEO decisions.</span>' +
    '</div>' +
    '<div class="wrap">' +
    '<table class="dt dt-head" id="table-past-head" style="margin-bottom:0;">' + colgroup + thead_past + '</table>' +
    '<table class="dt" id="table-past">' + colgroup +
    '<tbody id="tb-past"><tr><td colspan="20" class="msg">⏳ Select range to load...</td></tr></tbody>' +
    '</table></div></div>' +
    _haeo_buildLegend() +
    
    '<div id="settings-modal" class="settings-modal" style="display:none;">' +
    '<div class="settings-modal-content" style="max-width:1280px;width:90vw;max-height:85vh;display:flex;flex-direction:column;">' +
    '<div class="settings-modal-header">' +
    '<h2>HAEO Events Card Settings</h2>' +
    '<button id="settings-modal-close" class="settings-modal-close" title="Close">&times;</button>' +
    '</div>' +
    '<div style="display:flex;border-bottom:1px solid var(--divider-color);overflow-x:auto;">' +
    '<button class="settings-tab active" data-tab="loads" style="flex:1;padding:14px 12px;border:none;background:transparent;color:var(--primary-text-color);cursor:pointer;font-weight:600;font-size:13px;border-bottom:4px solid transparent;">Loads</button>' +
    '<button class="settings-tab" data-tab="optional-loads" style="flex:1;padding:14px 12px;border:none;background:transparent;color:var(--secondary-text-color);cursor:pointer;font-weight:600;font-size:13px;border-bottom:4px solid transparent;">Optional Loads</button>' +
    '<button class="settings-tab" data-tab="colours-self" style="flex:1;padding:14px 12px;border:none;background:transparent;color:var(--secondary-text-color);cursor:pointer;font-weight:600;font-size:13px;border-bottom:4px solid transparent;">Colours - Self Consumption</button>' +
    '<button class="settings-tab" data-tab="colours-profit" style="flex:1;padding:14px 12px;border:none;background:transparent;color:var(--secondary-text-color);cursor:pointer;font-weight:600;font-size:13px;border-bottom:4px solid transparent;">Colours - Profit</button>' +
    '<button class="settings-tab" data-tab="colours-cost" style="flex:1;padding:14px 12px;border:none;background:transparent;color:var(--secondary-text-color);cursor:pointer;font-weight:600;font-size:13px;border-bottom:4px solid transparent;">Colours - Cost</button>' +
    '<button class="settings-tab" data-tab="entities" style="flex:1;padding:14px 12px;border:none;background:transparent;color:var(--secondary-text-color);cursor:pointer;font-weight:600;font-size:13px;border-bottom:4px solid transparent;">Entities</button>' +
    '<button class="settings-tab" data-tab="backup" style="flex:1;padding:14px 12px;border:none;background:transparent;color:var(--secondary-text-color);cursor:pointer;font-weight:600;font-size:13px;border-bottom:4px solid transparent;">Backup</button>' +
    '</div>' +
    '<div class="settings-modal-body" style="flex:1;overflow-y:auto;padding:16px;">' +
    '<div class="settings-tab-content active" data-content="loads">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
    '<div style="font-size:13px;color:var(--secondary-text-color);">Configure load columns, filter thresholds, and entity sources for forecasting and historical analysis:</div>' +
    '<div style="display:flex;align-items:center;gap:12px;">' +
    '<label style="font-weight:bold;">Inverter:</label>' +
    '<select id="inverter-brand" style="padding:8px;font-size:13px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;min-width:200px;">' +
    '<option value="sigenergy">Sigenergy</option>' +
    '<option value="sigenergy_mqtt">Sigenergy (MQTT)</option>' +
    '<option value="deye">Deye</option>' +
    '<option value="fronius">Fronius</option>' +
    '<option value="goodwe">Goodwe</option>' +
    '<option value="huawei">Huawei</option>' +
    '<option value="istore">iStore</option>' +
    '<option value="sungrow">Sungrow</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:50px 120px 90px 280px 280px 280px;gap:8px;align-items:center;font-size:13px;font-weight:bold;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid var(--divider-color);">' +
    '<div style="text-align:center;">Enable</div><div style="text-align:left;">Load Name</div>' +
    '<div style="text-align:center;">Filter (W)</div>' +
    '<div style="text-align:left;">Future Decisions Entities</div>' +
    '<div style="text-align:left;">Past Events Entities (Power)</div>' +
    '<div style="text-align:left;">Past Events Entities (Energy)</div>' +
    '</div>' +

    '<div style="display:grid;gap:8px;">' +
    '<div style="display:grid;grid-template-columns:50px 120px 90px 280px 280px 280px;gap:8px;align-items:center;font-size:12px;">' +
    '<div></div>' +
    '<label>🏠 Base Load</label>' +
    '<div style="display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;">' +
    '<input type="number" id="threshold-load" class="threshold-input" min="0" step="10" value="0" style="padding:4px;font-size:11px;width:50px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="font-size:8px;">Default - 0 W</div>' +
    '</div>' +
    '<input type="text" id="load-forecast" placeholder="number.base_load_forecast" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="load-historical" placeholder="sensor.sigen_plant_total_load_power" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="load-energy" placeholder="sensor.sigen_plant_total_load_consumption" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '</div>' +
    '<div style="border-bottom:1px solid #444;margin:8px 0 8px 0;"></div>' +
    '<div style="display:grid;grid-template-columns:50px 120px 90px 280px 280px 280px;gap:8px;align-items:center;font-size:12px;">' +
    '<div></div>' +
    '<label>🌞 Solar</label>' +
    '<div style="display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;">' +
    '<input type="number" id="threshold-pv" class="threshold-input" min="0" step="10" value="50" style="padding:4px;font-size:11px;width:50px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="font-size:8px;">Default - 50 W</div>' +
    '</div>' +
    '<input type="text" id="pv-forecast" placeholder="number.solar_forecast" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="pv-historical" placeholder="sensor.sigen_plant_pv_power" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="pv-energy" placeholder="sensor.sigen_plant_total_pv_generation" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '</div>' +
    '<div style="border-bottom:1px solid #444;margin:8px 0 8px 0;"></div>' +
    '<div style="display:grid;grid-template-columns:50px 120px 90px 280px 280px 280px;gap:8px;align-items:center;font-size:12px;">' +
    '<div></div>' +
    '<label>⚡ Grid</label>' +
    '<div style="display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;">' +
    '<input type="number" id="threshold-grid" class="threshold-input" min="0" step="10" value="100" style="padding:4px;font-size:11px;width:50px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="font-size:8px;">Default - 100 W</div>' +
    '</div>' +
    '<input type="text" id="grid-forecast" placeholder="sensor.grid_active_power" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="grid-historical" placeholder="sensor.sigen_plant_grid_active_power" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="display:flex;flex-direction:column;gap:4px;">' +
    '<input type="text" id="grid-energy" placeholder="sensor.sigen_plant_total_imported_energy" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="grid-energy-export" placeholder="sensor.sigen_plant_total_exported_energy" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '</div>' +
    '</div>' +
    '<div style="border-bottom:1px solid #444;margin:8px 0 8px 0;"></div>' +
    '<div style="display:grid;grid-template-columns:50px 120px 90px 280px 280px 280px;gap:8px;align-items:center;font-size:12px;">' +
    '<div></div>' +
    '<label>🔋 Battery</label>' +
    '<div style="display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;">' +
    '<input type="number" id="threshold-battery" class="threshold-input" min="0" step="10" value="100" style="padding:4px;font-size:11px;width:50px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="font-size:8px;">Default - 100 W</div>' +
    '</div>' +
    '<input type="text" id="battery-forecast" placeholder="sensor.battery_active_power" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="battery-historical" placeholder="sensor.sigen_plant_battery_power" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="display:flex;flex-direction:column;gap:4px;">' +
    '<input type="text" id="battery-energy" placeholder="sensor.sigen_plant_daily_battery_charge_energy" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="battery-energy-discharge" placeholder="sensor.sigen_plant_daily_battery_discharge_energy" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '</div>' +
    '</div>' +
    '<div style="border-bottom:1px solid #444;margin:8px 0 8px 0;"></div>' +
    '<div style="display:grid;grid-template-columns:50px 120px 90px 280px 280px 280px;gap:8px;align-items:center;font-size:12px;">' +
    '<input type="checkbox" id="col-ev" class="col-toggle" style="cursor:pointer;width:16px;height:16px;justify-self:center;">' +
    '<label>🚗 EV</label>' +
    '<div style="display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;">' +
    '<input type="number" id="threshold-ev" class="threshold-input" min="0" step="10" value="100" style="padding:4px;font-size:11px;width:50px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="font-size:8px;">Default - 100 W</div>' +
    '</div>' +
    '<input type="text" id="ev-forecast" placeholder="sensor.ev_active_power" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="ev-historical" placeholder="sensor.sigen_ac_charger_charging_power" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="display:flex;flex-direction:column;gap:4px;">' +
    '<input type="text" id="ev-energy" placeholder="sensor.ev_charge_energy" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="ev-energy-discharge" placeholder="sensor.ev_discharge_energy" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '</div>' +
    '</div>' +
    '<div style="border-bottom:1px solid #444;margin:8px 0 8px 0;"></div>' +
    '<div style="display:grid;grid-template-columns:50px 120px 90px 280px 280px 280px;gap:8px;align-items:center;font-size:12px;">' +
    '<input type="checkbox" id="col-ev2" class="col-toggle" style="cursor:pointer;width:16px;height:16px;justify-self:center;">' +
    '<label>🚙 EV2</label>' +
    '<div style="display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;">' +
    '<input type="number" id="threshold-ev2" class="threshold-input" min="0" step="10" value="100" style="padding:4px;font-size:11px;width:50px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="font-size:8px;">Default - 100 W</div>' +
    '</div>' +
    '<input type="text" id="ev2-forecast" placeholder="sensor.ev2_active_power" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="ev2-historical" placeholder="sensor.sigen_ac_charger_charging_power_2" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="display:flex;flex-direction:column;gap:4px;">' +
    '<input type="text" id="ev2-energy" placeholder="sensor.ev2_charge_energy" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="ev2-energy-discharge" placeholder="sensor.ev2_discharge_energy" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '</div>' +
    '</div>' +
    '<div style="border-bottom:1px solid #444;margin:8px 0 8px 0;"></div>' +
    '<div style="display:grid;grid-template-columns:50px 120px 90px 280px 280px 280px;gap:8px;align-items:center;font-size:12px;">' +
    '<input type="checkbox" id="col-deferLoad" class="col-toggle" style="cursor:pointer;width:16px;height:16px;justify-self:center;">' +
    '<label>⏰ Deferrable Loads</label>' +
    '<div style="display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;">' +
    '<input type="number" id="threshold-deferLoad" class="threshold-input" min="0" step="10" value="5" style="padding:4px;font-size:11px;width:50px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="font-size:8px;">Default - 5 W</div>' +
    '</div>' +
    '<input type="text" id="deferLoad-forecast" placeholder="sensor.deferrable_loads_power_forecast" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="deferLoad-historical" placeholder="sensor.deferrable_loads_power" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<input type="text" id="deferLoad-energy" placeholder="sensor.deferrable_loads_energy" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="settings-tab-content" data-content="optional-loads">' +
    '<div style="font-size:13px;margin-bottom:16px;color:var(--secondary-text-color);">Configure up to 10 optional loads:</div>' +
    '<div style="display:grid;grid-template-columns:50px 60px 180px 100px 275px 275px 275px;gap:8px;align-items:center;font-size:12px;font-weight:bold;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--divider-color);">' +
    '<div style="text-align:center;">Enable</div><div style="text-align:center;">Symbol</div><div style="text-align:left;">Load Name</div><div style="text-align:center;">Filter (W)</div><div style="text-align:left;">Future Decisions Entities</div><div style="text-align:left;">Past Events Entities (Power)</div><div style="text-align:left;">Past Events Entities (Energy)</div>' +
    '</div>' +
    '<div style="display:grid;gap:8px;">' +
    (() => {
      let html = '';
      for (let i = 0; i < 10; i++) {
        html += '<div style="display:grid;grid-template-columns:50px 60px 180px 100px 275px 275px 275px;gap:8px;align-items:center;font-size:12px;">' +
          '<input type="checkbox" id="optload-enable-' + i + '" class="optload-enable" style="cursor:pointer;width:18px;height:18px;">' +
          '<select id="optload-emoji-' + i + '" style="padding:4px;font-size:16px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;width:100%;">' +
          '<option value="🔌">🔌</option>' +
          '<option value="🌡️">🌡️</option>' +
          '<option value="🚿">🚿</option>' +
          '<option value="👚">👚</option>' +
          '<option value="🧺">🧺</option>' +
          '<option value="🍽️">🍽️</option>' +
          '<option value="💻">💻</option>' +
          '<option value="🏊">🏊</option>' +
          '<option value="⚡">⚡</option>' +
          '<option value="🔥">🔥</option>' +
          '<option value="💧">💧</option>' +
          '<option value="🌬️">🌬️</option>' +
          '<option value="📱">📱</option>' +
          '<option value="☀️">☀️</option>' +
          '<option value="🌙">🌙</option>' +
          '<option value="⏰">⏰</option>' +
          '<option value="💡">💡</option>' +
          '<option value="🚗">🚗</option>' +
          '<option value="🚙">🚙</option>' +
          '<option value="🏠">🏠</option>' +
          '</select>' +
          '<div style="display:flex;flex-direction:column;gap:4px;">' +
          '<select id="optload-preset-' + i + '" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;">' +
          '<option value="">-- None --</option>' +
          '<option value="Air Conditioner">🌡️ Air Conditioner (HVAC)</option>' +
          '<option value="Hot Water System">🚿 Hot Water System (HWS)</option>' +
          '<option value="Clothes Dryer">👚 Clothes Dryer</option>' +
          '<option value="Washing Machine">🗑️ Washing Machine</option>' +
          '<option value="Dishwasher">🍽️ Dishwasher</option>' +
          '<option value="IT Hardware">💻 IT Hardware</option>' +
          '<option value="Pool">🏊 Pool Pump</option>' +
          '<option value="Generic Load">🔌 Generic Load</option>' +
          '<option value="custom">✏️ Custom Name</option>' +
          '</select>' +
          '<input type="text" id="optload-customname-' + i + '" placeholder="Enter custom name..." style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;display:none;">' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;">' +
          '<input type="number" id="optload-threshold-' + i + '" class="optload-threshold-input" min="0" step="10" value="10" style="padding:4px;font-size:11px;width:60px;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
          '<div style="font-size:8px;">Default - 10 W</div>' +
          '</div>' +
          '<input type="text" id="optload-forecast-' + i + '" placeholder="number.xxxx_forecast" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
          '<input type="text" id="optload-historical-' + i + '" placeholder="sensor.xxxx_power" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
          '<input type="text" id="optload-energy-' + i + '" placeholder="sensor.xxxx_energy" style="padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
          '</div>';
      }
      return html;
    })() +
    '</div>' +
    '</div>' +

    '<div class="settings-tab-content" data-content="colours-self">' +
    '<div style="font-size:13px;margin-bottom:12px;color:var(--secondary-text-color);">Self Consumption - Solar/Battery scenarios (no grid):</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-height:500px;overflow-y:auto;padding:12px;border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="display:grid;gap:0;">' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:10px;font-weight:bold;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--divider-color);position:sticky;top:0;background:var(--card-background-color);">' +
    '<div>Event</div><div style="text-align:center;">BKG</div><div style="text-align:center;">Event</div><div style="text-align:center;">Text</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.battery_ev_charge || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-battery_ev_charge-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_ev_charge-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_ev_charge-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.battery_ev_to_baseload || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-battery_ev_to_baseload-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_ev_to_baseload-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_ev_to_baseload-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.battery_ev_to_loads || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-battery_ev_to_loads-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_ev_to_loads-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_ev_to_loads-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.battery_to_loads_only || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-battery_to_loads_only-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_to_loads_only-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_to_loads_only-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.battery_to_loads_inferred || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-battery_to_loads_inferred-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_to_loads_inferred-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_to_loads_inferred-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_battery_ev_to_loads || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_battery_ev_to_loads-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_ev_to_loads-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_ev_to_loads-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_battery_to_loads_no_grid || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_loads_no_grid-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_loads_no_grid-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_loads_no_grid-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '</div>' +
    '<div style="display:grid;gap:0;">' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:10px;font-weight:bold;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--divider-color);position:sticky;top:0;background:var(--card-background-color);">' +
    '<div>Event</div><div style="text-align:center;">BKG</div><div style="text-align:center;">Event</div><div style="text-align:center;">Text</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_ev_to_loads || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_ev_to_loads-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_ev_to_loads-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_ev_to_loads-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_to_baseload_battery || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_battery-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_battery-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_battery-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_to_baseload_ev || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_ev-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_ev-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_ev-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_to_loads_battery || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_battery-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_battery-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_battery-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_to_loads_grid || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_grid-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_grid-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_grid-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_to_loads_only || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_only-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_only-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_only-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="settings-tab-content" data-content="colours-profit">' +
    '<div style="font-size:13px;margin-bottom:12px;color:var(--secondary-text-color);">Profit - Exporting to Grid:</div>' +
    '<div style="display:grid;gap:0;max-height:500px;overflow-y:auto;padding:12px;border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:10px;font-weight:bold;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--divider-color);position:sticky;top:0;background:var(--card-background-color);">' +
    '<div>Event</div><div style="text-align:center;">BKG</div><div style="text-align:center;">Event</div><div style="text-align:center;">Text</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.battery_ev_to_grid_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-battery_ev_to_grid_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_ev_to_grid_force-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_ev_to_grid_force-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.battery_to_grid_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-battery_to_grid_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_to_grid_force-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_to_grid_force-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_battery_ev_to_grid_export || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_battery_ev_to_grid_export-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_ev_to_grid_export-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_ev_to_grid_export-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '</div>' +
    '</div>' +
    '<div class="settings-tab-content" data-content="colours-cost">' +
    '<div style="font-size:13px;margin-bottom:12px;color:var(--secondary-text-color);">Cost - Importing from Grid or Mixed:</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-height:500px;overflow-y:auto;padding:12px;border:1px solid var(--divider-color);border-radius:4px;">' +
    '<div style="display:grid;gap:0;">' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:10px;font-weight:bold;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--divider-color);position:sticky;top:0;background:var(--card-background-color);">' +
    '<div>Event</div><div style="text-align:center;">BKG</div><div style="text-align:center;color:#cc3333;">Event</div><div style="text-align:center;color:#cc3333;">Text</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.battery_grid_to_loads || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-battery_grid_to_loads-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_grid_to_loads-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_grid_to_loads-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.battery_to_baseload_grid_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-battery_to_baseload_grid_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_to_baseload_grid_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_to_baseload_grid_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.battery_to_loads_grid_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-battery_to_loads_grid_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_to_loads_grid_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-battery_to_loads_grid_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.grid_to_baseload_battery_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-grid_to_baseload_battery_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-grid_to_baseload_battery_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-grid_to_baseload_battery_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.grid_to_baseload_ev_battery_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-grid_to_baseload_ev_battery_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-grid_to_baseload_ev_battery_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-grid_to_baseload_ev_battery_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.grid_to_baseload_ev_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-grid_to_baseload_ev_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-grid_to_baseload_ev_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-grid_to_baseload_ev_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.grid_to_loads_battery_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-grid_to_loads_battery_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-grid_to_loads_battery_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-grid_to_loads_battery_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.grid_to_loads_only || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-grid_to_loads_only-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-grid_to_loads_only-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-grid_to_loads_only-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '</div>' +
    '<div style="display:grid;gap:0;">' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:10px;font-weight:bold;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--divider-color);position:sticky;top:0;background:var(--card-background-color);">' +
    '<div>Event</div><div style="text-align:center;">BKG</div><div style="text-align:center;color:#cc3333;">Event</div><div style="text-align:center;color:#cc3333;">Text</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_battery_grid_to_loads || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_battery_grid_to_loads-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_grid_to_loads-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_grid_to_loads-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_battery_to_baseload_grid_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_baseload_grid_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_baseload_grid_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_baseload_grid_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_battery_to_loads_grid_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_loads_grid_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_loads_grid_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_loads_grid_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_grid_to_baseload_battery_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_baseload_battery_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_baseload_battery_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_baseload_battery_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_grid_to_baseload_ev_battery_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_baseload_ev_battery_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_baseload_ev_battery_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_baseload_ev_battery_force-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_grid_to_baseload_ev_charge || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_baseload_ev_charge-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_baseload_ev_charge-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_baseload_ev_charge-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_grid_to_loads || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_loads-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_loads-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_grid_to_loads-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_to_baseload_battery_grid || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_battery_grid-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_battery_grid-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_battery_grid-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_to_loads_battery_grid || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_battery_grid-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_battery_grid-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_loads_battery_grid-cost" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_to_baseload_ev_battery_force || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_ev_battery_force-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_ev_battery_force-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_to_baseload_ev_battery_force-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '<div style="display:grid;grid-template-columns:380px 40px 40px 40px;gap:6px;align-items:center;font-size:12px;padding:6px 0;"><div>' + (_HAEO_EVENT_LABELS.pv_battery_to_baseload_ev_charge || 'SomeText') + '</div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_baseload_ev_charge-bg" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_baseload_ev_charge-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div><div style="text-align:center;"><input type="color" id="color-pv_battery_to_baseload_ev_charge-txt" class="color-picker" style="width:35px;height:25px;cursor:pointer;"></div></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="settings-tab-content" data-content="entities">' +
    '<div style="padding:16px;display:flex;flex-direction:column;gap:16px;max-width:600px;">' +
    '<div style="font-size:13px;margin-bottom:12px;color:var(--secondary-text-color);">Configure miscellaneous entities:</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;">' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
    '<label style="font-weight:bold;min-width:120px;font-size:12px;">🌧️ Weather Entity:</label>' +
    '<input type="text" id="weather-entity-input" placeholder="weather.forecast_home" style="flex:1;padding:8px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<span style="font-size:11px;color:var(--secondary-text-color);min-width:150px;text-align:right;">Default: weather.forecast_home</span>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
    '<label style="font-weight:bold;min-width:120px;font-size:12px;">⚠️ Curtailment Switch:</label>' +
    '<input type="text" id="curtailment-entity-input" placeholder="switch.solar_curtailment" style="flex:1;padding:8px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;">' +
    '<span style="font-size:11px;color:var(--secondary-text-color);min-width:150px;text-align:right;">Default: switch.solar_curtailment</span>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="settings-tab-content" data-content="backup">' +
    '<div style="padding:16px;display:flex;flex-direction:column;gap:16px;">' +
    '<div style="padding:12px;background:rgba(0,0,0,0.1);border-radius:4px;">' +
    '<div style="font-size:12px;font-weight:bold;margin-bottom:8px;">📥 Export Settings</div>' +
    '<div style="font-size:11px;margin-bottom:12px;color:var(--secondary-text-color);">Download all card settings to a JSON file.</div>' +
    '<button id="export-settings-btn" style="padding:10px 16px;background:var(--primary-color);color:var(--text-primary-color);border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;width:100%;">⬇️ Download Backup</button>' +
    '</div>' +
    '<div style="padding:12px;background:rgba(0,0,0,0.1);border-radius:4px;">' +
    '<div style="font-size:12px;font-weight:bold;margin-bottom:8px;">📤 Import Settings</div>' +
    '<div style="font-size:11px;margin-bottom:12px;color:var(--secondary-text-color);">Restore settings from a previously exported JSON file.</div>' +
    '<input type="file" id="import-settings-file" accept=".json" style="display:none;">' +
    '<button id="import-settings-btn" style="padding:10px 16px;background:var(--primary-color);color:var(--text-primary-color);border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;width:100%;">⬆️ Select Backup File</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div style="border-top:1px solid var(--divider-color);padding:16px;display:flex;justify-content:space-between;align-items:center;background:var(--card-background-color);border-radius:0 0 8px 8px;">' +
    '<button id="reset-colors-btn" style="padding:8px 16px;background:var(--primary-color);color:var(--text-primary-color);border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">↻ Reset to Defaults</button>' +
    '<button id="apply-settings-btn" style="padding:10px 20px;background:var(--primary-color);color:var(--text-primary-color);border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">✓ Apply</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    
    '<div id="legend-modal" class="legend-modal" style="display:none;">' +
    '<div class="legend-modal-content">' +
    '<div class="legend-modal-header">' +
    '<h2>Event Legend</h2>' +
    '<button id="legend-modal-close" class="legend-modal-close" title="Close">&times;</button>' +
    '</div>' +
    '<div class="legend-modal-body">' +
    '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">' +
    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">' +
    '<input type="checkbox" id="filter-solar" class="legend-filter" checked style="cursor:pointer;"> ☀️ Solar' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">' +
    '<input type="checkbox" id="filter-battery" class="legend-filter" checked style="cursor:pointer;"> 🔋 Battery' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">' +
    '<input type="checkbox" id="filter-grid" class="legend-filter" checked style="cursor:pointer;"> ⚡ Grid' +
    '</label>' +
    '<div id="legend-ev-filters" style="display:flex;gap:12px;flex-wrap:wrap;"></div>' +
    '<div id="legend-optload-filters" style="display:flex;gap:12px;flex-wrap:wrap;"></div>' +
    '<div id="legend-defer-filters" style="display:flex;gap:12px;flex-wrap:wrap;"></div>' +
    '</div>' +
    '<div id="legend-categories-wrap"></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    
    '</div></ha-card>';
  return html;
}

// ── Custom Element ────────────────────────────────────────────────────────────
class HaeoEventsCard extends HTMLElement {
  // Inverter brand sensor mappings for Past Events Entities
  _INVERTER_BRAND_SENSORS = {
    sigenergy: {
      base_power: 'sensor.sigen_plant_total_load_power',
      base_energy: 'sensor.sigen_plant_total_load_consumption',
      pv_power: 'sensor.sigen_plant_pv_power',
      pv_energy: 'sensor.sigen_plant_total_pv_generation',
      grid_power: 'sensor.sigen_plant_grid_active_power',
      grid_energy_import: 'sensor.sigen_plant_total_imported_energy',
      grid_energy_export: 'sensor.sigen_plant_total_exported_energy',
      battery_power: 'sensor.sigen_plant_battery_power',
      battery_energy_charge: 'sensor.sigen_plant_daily_battery_charge_energy',
      battery_energy_discharge: 'sensor.sigen_plant_daily_battery_discharge_energy'
    },
    sigenergy_mqtt: {
      base_power: 'sensor.sigenergy_load_power',
      base_energy: 'sensor.sigenergy_load_consumption',
      pv_power: 'sensor.sigenergy_pv_power',
      pv_energy: 'sensor.sigenergy_pv_generation',
      grid_power: 'sensor.sigenergy_grid_power',
      grid_energy_import: 'sensor.sigenergy_grid_import_energy',
      grid_energy_export: 'sensor.sigenergy_grid_export_energy',
      battery_power: 'sensor.sigenergy_battery_power',
      battery_energy_charge: 'sensor.sigenergy_battery_charge_energy',
      battery_energy_discharge: 'sensor.sigenergy_battery_discharge_energy'
    },
    deye: {
      base_power: 'sensor.deye_load_power',
      base_energy: 'sensor.deye_load_consumption',
      pv_power: 'sensor.deye_pv_power',
      pv_energy: 'sensor.deye_pv_generation',
      grid_power: 'sensor.deye_grid_power',
      grid_energy_import: 'sensor.deye_grid_import_energy',
      grid_energy_export: 'sensor.deye_grid_export_energy',
      battery_power: 'sensor.deye_battery_power',
      battery_energy_charge: 'sensor.deye_battery_charge_energy',
      battery_energy_discharge: 'sensor.deye_battery_discharge_energy'
    },
    fronius: {
      base_power: 'sensor.fronius_load_power',
      base_energy: 'sensor.fronius_load_consumption',
      pv_power: 'sensor.fronius_pv_power',
      pv_energy: 'sensor.fronius_pv_generation',
      grid_power: 'sensor.fronius_grid_power',
      grid_energy_import: 'sensor.fronius_grid_import_energy',
      grid_energy_export: 'sensor.fronius_grid_export_energy',
      battery_power: 'sensor.fronius_battery_power',
      battery_energy_charge: 'sensor.fronius_battery_charge_energy',
      battery_energy_discharge: 'sensor.fronius_battery_discharge_energy'
    },
    goodwe: {
      base_power: 'sensor.goodwe_load_power',
      base_energy: 'sensor.goodwe_load_consumption',
      pv_power: 'sensor.goodwe_pv_power',
      pv_energy: 'sensor.goodwe_pv_generation',
      grid_power: 'sensor.goodwe_grid_power',
      grid_energy_import: 'sensor.goodwe_grid_import_energy',
      grid_energy_export: 'sensor.goodwe_grid_export_energy',
      battery_power: 'sensor.goodwe_battery_power',
      battery_energy_charge: 'sensor.goodwe_battery_charge_energy',
      battery_energy_discharge: 'sensor.goodwe_battery_discharge_energy'
    },
    huawei: {
      base_power: 'sensor.huawei_load_power',
      base_energy: 'sensor.huawei_load_consumption',
      pv_power: 'sensor.huawei_pv_power',
      pv_energy: 'sensor.huawei_pv_generation',
      grid_power: 'sensor.huawei_grid_power',
      grid_energy_import: 'sensor.huawei_grid_import_energy',
      grid_energy_export: 'sensor.huawei_grid_export_energy',
      battery_power: 'sensor.huawei_battery_power',
      battery_energy_charge: 'sensor.huawei_battery_charge_energy',
      battery_energy_discharge: 'sensor.huawei_battery_discharge_energy'
    },
    istore: {
      base_power: 'sensor.istore_load_power',
      base_energy: 'sensor.istore_load_consumption',
      pv_power: 'sensor.istore_pv_power',
      pv_energy: 'sensor.istore_pv_generation',
      grid_power: 'sensor.istore_grid_power',
      grid_energy_import: 'sensor.istore_grid_import_energy',
      grid_energy_export: 'sensor.istore_grid_export_energy',
      battery_power: 'sensor.istore_battery_power',
      battery_energy_charge: 'sensor.istore_battery_charge_energy',
      battery_energy_discharge: 'sensor.istore_battery_discharge_energy'
    },
    sungrow: {
      base_power: 'sensor.sungrow_load_power',
      base_energy: 'sensor.sungrow_load_consumption',
      pv_power: 'sensor.sungrow_pv_power',
      pv_energy: 'sensor.sungrow_pv_generation',
      grid_power: 'sensor.sungrow_grid_power',
      grid_energy_import: 'sensor.sungrow_grid_import_energy',
      grid_energy_export: 'sensor.sungrow_grid_export_energy',
      battery_power: 'sensor.sungrow_battery_power',
      battery_energy_charge: 'sensor.sungrow_battery_charge_energy',
      battery_energy_discharge: 'sensor.sungrow_battery_discharge_energy'
    }
  };

  // Generate forecast entity ID from name
  _generateForecastEntityId(name) {
    if (!name) return '';
    return 'number.' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_load_forecast';
  }

  // Populate Past Events Entities based on inverter brand selection
  _populatePastEntitiesByInverter(brand) {
    const sensors = this._INVERTER_BRAND_SENSORS[brand];
    if (!sensors) {
      return;
    }
    
    
    // Populate Base Load
    const loadHistorical = this.shadowRoot.getElementById('load-historical');
    const loadEnergy = this.shadowRoot.getElementById('load-energy');
    if (loadHistorical) loadHistorical.value = sensors.base_power || '';
    if (loadEnergy) loadEnergy.value = sensors.base_energy || '';
    
    // Populate Solar
    const pvHistorical = this.shadowRoot.getElementById('pv-historical');
    const pvEnergy = this.shadowRoot.getElementById('pv-energy');
    if (pvHistorical) pvHistorical.value = sensors.pv_power || '';
    if (pvEnergy) pvEnergy.value = sensors.pv_energy || '';
    
    // Populate Grid (import + export)
    const gridHistorical = this.shadowRoot.getElementById('grid-historical');
    const gridEnergy = this.shadowRoot.getElementById('grid-energy');
    const gridEnergyExport = this.shadowRoot.getElementById('grid-energy-export');
    if (gridHistorical) gridHistorical.value = sensors.grid_power || '';
    if (gridEnergy) gridEnergy.value = sensors.grid_energy_import || '';
    if (gridEnergyExport) gridEnergyExport.value = sensors.grid_energy_export || '';
    
    // Populate Battery (charge + discharge)
    const batteryHistorical = this.shadowRoot.getElementById('battery-historical');
    const batteryEnergy = this.shadowRoot.getElementById('battery-energy');
    const batteryEnergyDischarge = this.shadowRoot.getElementById('battery-energy-discharge');
    if (batteryHistorical) batteryHistorical.value = sensors.battery_power || '';
    if (batteryEnergy) batteryEnergy.value = sensors.battery_energy_charge || '';
    if (batteryEnergyDischarge) batteryEnergyDischarge.value = sensors.battery_energy_discharge || '';
    
    // Note: EV and EV2 are not auto-populated as they may vary by installation
  }

  // Get available forecast load entities from HA
  _getAvailableForecastEntities() {
    if (!this._hass || !this._hass.states) return [];
    const entities = [];
    for (const entityId of Object.keys(this._hass.states)) {
      if (entityId.startsWith('number.') && entityId.includes('_load_forecast')) {
        entities.push(entityId);
      }
    }
    return entities.sort();
  }

  // Get available power sensors from HA
  _getAvailablePowerSensors() {
    if (!this._hass || !this._hass.states) return [];
    const sensors = [];
    const powerUnits = ['W', 'kW', 'MW'];
    for (const [entityId, state] of Object.entries(this._hass.states)) {
      if (!entityId.startsWith('sensor.')) continue;
      if (state.attributes && powerUnits.includes(state.attributes.unit_of_measurement)) {
        sensors.push(entityId);
      }
    }
    return sensors.sort();
  }

  // Get available forecast entities
  _getAvailableForecastOptions() {
    if (!this._hass || !this._hass.states) return [];
    const entities = [];
    for (const entityId of Object.keys(this._hass.states)) {
      if (entityId.startsWith('number.') && entityId.includes('_load_forecast')) {
        entities.push(entityId);
      }
    }
    return entities.sort();
  }

  // Get available historical power entities
  _getAvailableHistoricalOptions() {
    if (!this._hass || !this._hass.states) return [];
    const entities = [];
    for (const [entityId, state] of Object.entries(this._hass.states)) {
      if (!entityId.startsWith('sensor.')) continue;
      const unit = state.attributes?.unit_of_measurement || '';
      const name = state.attributes?.friendly_name || entityId;
      // Match *_power, *_active_power, *_load_power, etc.
      if (entityId.includes('_power') || entityId.includes('_load') || ['W', 'kW', 'MW'].includes(unit)) {
        entities.push(entityId);
      }
    }
    return entities.sort();
  }

  // Get available energy entities
  _getAvailableEnergyOptions() {
    if (!this._hass || !this._hass.states) return [];
    const entities = [];
    for (const [entityId, state] of Object.entries(this._hass.states)) {
      if (!entityId.startsWith('sensor.') && !entityId.startsWith('number.')) continue;
      const unit = state.attributes?.unit_of_measurement || '';
      // Match energy sensors: *_energy, *_consumption, *_generation, etc. with Wh/kWh/MWh units
      if (entityId.includes('_energy') || entityId.includes('_consumption') || entityId.includes('_generation') || entityId.includes('_charge') || entityId.includes('_discharge') || ['Wh', 'kWh', 'MWh'].includes(unit)) {
        entities.push(entityId);
      }
    }
    return entities.sort();
  }

  // Open emoji picker for optional load
  _openEmojiPicker(idx) {
    const emojis = [
      '🌡️', '🚿', '👚', '🧺', '🍽️', '🖧', '🏊', '🔌',
      '⚡', '🔥', '💧', '🌬️', '🧽', '🧹', '📺', '🎮',
      '☀️', '🌙', '⏰', '🔔', '📱', '💻', '🖥️', '🎵',
      '🚗', '🚙', '🏠', '🏡', '🏘️', '💡', '🔆'
    ];
    
    const emojiInput = this.shadowRoot.getElementById(`optload-emoji-${idx}`);
    const emojiBtn = this.shadowRoot.getElementById(`optload-emoji-btn-${idx}`);
    if (!emojiInput || !emojiBtn) return;
    
    // Check if picker already exists
    let existingPicker = this.shadowRoot.getElementById(`emoji-picker-${idx}`);
    if (existingPicker) {
      existingPicker.remove();
      return;
    }
    
    // Create picker container
    const picker = document.createElement('div');
    picker.id = `emoji-picker-${idx}`;
    picker.style.cssText = `
      position: absolute;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 12px;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 8px;
      width: 280px;
    `;
    
    // Add emojis to picker
    emojis.forEach(emoji => {
      const item = document.createElement('div');
      item.textContent = emoji;
      item.style.cssText = `
        font-size: 24px;
        cursor: pointer;
        text-align: center;
        padding: 8px;
        border-radius: 4px;
        transition: background 0.2s;
      `;
      item.addEventListener('mouseover', () => {
        item.style.background = 'rgba(255,255,255,0.1)';
      });
      item.addEventListener('mouseout', () => {
        item.style.background = 'transparent';
      });
      item.addEventListener('click', () => {
        emojiInput.value = emoji;
        picker.remove();
      });
      picker.appendChild(item);
    });
    
    // Position picker below button
    this.shadowRoot.appendChild(picker);
    const btnRect = emojiBtn.getBoundingClientRect();
    picker.style.top = (btnRect.bottom + 5) + 'px';
    picker.style.left = btnRect.left + 'px';
    
    // Close picker when clicking outside
    const closeHandler = (e) => {
      if (!picker.contains(e.target) && e.target !== emojiBtn) {
        picker.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
  }

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
    this._previousLastRun = null;  // Track previous HAEO last_run to detect updates
    this._columnSettings = {
      deferLoad: false,
      ev: false,
      ev2: false
    };
    
    // Initialize deferrable loads config (empty, will load from localStorage)
    this._deferableLoadsConfig = [];

    // Initialize default threshold settings (in watts)
    this._thresholdSettings = {
      load: 0,
      deferLoad: 0,
      pv: 50,
      grid: 100,
      battery: 100,
      ev: 100,
      ev2: 100
    };
    
    // Initialize thresholds for each configured deferrable load
    this._deferableLoadsConfig.forEach((config, idx) => {
      this._thresholdSettings[`deferLoad${idx}`] = config.threshold || 50;
    });

    // Initialize default color settings
    this._colorSettings = JSON.parse(JSON.stringify(_HAEO_COLOURS));  // Deep copy to avoid reference issues
    // Each entry: { name, entityId, emoji, color, threshold }
    this._deferableLoadsConfig = [];
  }

  // Detect if HA is in light mode and return appropriate text color for light backgrounds
  _getTextColorForLightBg() {
    // Check if in light mode by looking at computed background color brightness
    const htmlStyle = getComputedStyle(document.documentElement);
    const bgColor = htmlStyle.getPropertyValue('--card-background-color') || 
                    htmlStyle.getPropertyValue('--ha-card-background') || '#fff';
    
    // Simple brightness check: if background is light, use black text
    const rgb = bgColor.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
      return brightness > 128 ? '#000' : 'var(--primary-text-color)';
    }
    
    // Fallback: check if bgColor looks light (contains 'f' for white-ish)
    return (bgColor.toLowerCase().includes('fff') || bgColor.toLowerCase().includes('ffe')) 
      ? '#000' 
      : 'var(--primary-text-color)';
  }

  // Resolve a sensor entity ID: config override → default → fallback (for EV1)
  _eid(key) {
    let eid = this._config['entity_' + key] || _HAEO_DEFAULTS[key];
    // EV1 fallback: try haeo_ev_power first, fall back to haeo_ev1_power if needed
    if (key === 'haeo_ev_power') {
      const primary = this._config['entity_haeo_ev_power'] || _HAEO_DEFAULTS['haeo_ev_power'];
      const fallback = this._config['entity_haeo_ev1_power'] || _HAEO_DEFAULTS['haeo_ev1_power'];
      return (this._hass?.states[primary]) ? primary : fallback;
    }
    // EV1 SoC fallback
    if (key === 'haeo_ev_soc') {
      const primary = this._config['entity_haeo_ev_soc'] || _HAEO_DEFAULTS['haeo_ev_soc'];
      const fallback = this._config['entity_haeo_ev1_soc'] || _HAEO_DEFAULTS['haeo_ev1_soc'];
      return (this._hass?.states[primary]) ? primary : fallback;
    }
    return eid;
  }

  // Check if an EV sensor entity exists in hass
  _evSensorExists(key) {
    const eid = this._eid(key);
    return eid && this._hass?.states[eid] !== undefined;
  }

  setConfig(config) {
    this._config = config || {};
    _HAEO_CUR = this._config.currency_symbol || '$';
    
    // Load column settings from localStorage if available
    try {
      const saved = localStorage.getItem('haeo-events-card-columns');
      if (saved) {
        const loaded = JSON.parse(saved);
        // Merge with defaults to ensure all keys exist
        this._columnSettings = { ...this._columnSettings, ...loaded };
      }
    } catch (e) {
      // localStorage unavailable or corrupted, use defaults
    }

    // Load color settings from localStorage if available
    try {
      const savedColors = localStorage.getItem('haeo-events-card-colors');
      if (savedColors) {
        const loaded = JSON.parse(savedColors);
        
        // Validate structure: has all required color categories with correct structure
        let isValid = true;
        for (const [key, colorObj] of Object.entries(_HAEO_COLOURS)) {
          if (!loaded[key] || 
              typeof loaded[key] !== 'object' ||
              !('bg' in loaded[key]) ||
              !('txt' in loaded[key]) ||
              !('cost' in loaded[key])) {
            isValid = false;
            break;
          }
        }
        
        // Use saved colors if structure is valid (values can differ from defaults)
        if (isValid) {
          this._colorSettings = loaded;
        }
        // Otherwise keep _colorSettings as initialized from _HAEO_COLOURS
      }
    } catch (e) {
      // localStorage unavailable or corrupted, use defaults
    }

    // Load threshold settings from localStorage if available
    try {
      const savedThresholds = localStorage.getItem('haeo-events-card-thresholds');
      if (savedThresholds) {
        this._thresholdSettings = JSON.parse(savedThresholds);
      }
    } catch (e) {
      // localStorage unavailable or corrupted, use defaults
    }

    // Load deferrable loads configuration from localStorage if available
    // NOTE: We now use entity-based config only (_loadDeferrableLoadsConfig)
    // Keep _deferableLoadsConfig as empty array to avoid rendering old presets
    this._deferableLoadsConfig = [];
    
    // OLD: Load deferrable loads configuration (now deprecated - using entities instead)
    // try {
    //   const savedDeferLoads = localStorage.getItem('haeo-events-card-deferrable-loads');
    //   if (savedDeferLoads) {
    //     this._deferableLoadsConfig = JSON.parse(savedDeferLoads);
    //   }
    // } catch (e) {
    //   // localStorage unavailable or corrupted, use defaults
    // }
    
    // Initialize thresholds for each configured deferrable load (deprecated - now using entities)
    // this._deferableLoadsConfig.forEach((config, idx) => {
    //   if (this._thresholdSettings[`deferLoad${idx}`] === undefined) {
    //     this._thresholdSettings[`deferLoad${idx}`] = config.threshold || 50;
    //   }
    // });
    if (!this.shadowRoot.getElementById('tb-future')) {
      const enabledOptionalLoads = this._getEnabledOptionalLoads();
      try {
        const html = _haeo_buildHTML(this._columnSettings, this._deferableLoadsConfig, enabledOptionalLoads);
        this.shadowRoot.innerHTML = html;
      } catch (e) {
      }
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
      if (!this._visHandler) {
        this._visHandler = () => {
          if (document.visibilityState === 'visible' && this._hass) {
            const staleMins = (Date.now() - this._lastRenderTs) / 60000;
            if (staleMins > 1) {
              this._lastCostTs = null;
              this._renderFuture();
              if (this._activeTab === 'past' && this._pastState === 'ready') {
                this._pastState = 'loading';
                this._loadPast();
              }
              this._lastRenderTs = Date.now();
            }
          }
        };
        document.addEventListener('visibilitychange', this._visHandler);
      }
    }
  }

  _setWrapHeight() {
    const wraps = this.shadowRoot.querySelectorAll('.wrap');
    wraps.forEach(w => {
      const top = w.getBoundingClientRect().top;
      if (top < 10) return;
      const legH = this.shadowRoot.querySelector('.leg')?.getBoundingClientRect().height || 0;
      w.style.height = Math.max(150, window.innerHeight - top - legH - 20) + 'px';
    });
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.getElementById('tb-future')) {
      try {
        const html = _haeo_buildHTML(this._columnSettings, this._deferableLoadsConfig);
        this.shadowRoot.innerHTML = html;
      } catch (e) {
      }
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
    const alertEl = sr.getElementById('grid-export-alert');
    if (alertEl) alertEl.style.display = tab === 'future' ? 'inline' : 'none';
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
    
    // Legend modal handlers
    const legendViewBtn = this.shadowRoot.getElementById('legend-view-btn');
    const legendModal = this.shadowRoot.getElementById('legend-modal');
    const legendClose = this.shadowRoot.getElementById('legend-modal-close');
    
    if (legendViewBtn && !legendViewBtn._wired) {
      legendViewBtn._wired = true;
      legendViewBtn.addEventListener('click', () => this._openLegendModal());
    }
    
    if (legendClose && !legendClose._wired) {
      legendClose._wired = true;
      legendClose.addEventListener('click', () => {
        if (legendModal) legendModal.style.display = 'none';
      });
    }
    
    if (legendModal && !legendModal._wired) {
      legendModal._wired = true;
      legendModal.addEventListener('click', (e) => {
        if (e.target === legendModal) legendModal.style.display = 'none';
      });
    }
    
    // Filter checkbox handlers
    const filterCheckboxes = this.shadowRoot.querySelectorAll('.legend-filter');
    filterCheckboxes.forEach(cb => {
      if (!cb._wired) {
        cb._wired = true;
        cb.addEventListener('change', () => this._applyLegendFilters());
      }
    });
    
    // Settings button and modal handlers
    const settingsBtn = this.shadowRoot.getElementById('settings-btn');
    const settingsModal = this.shadowRoot.getElementById('settings-modal');
    const settingsClose = this.shadowRoot.getElementById('settings-modal-close');
    
    if (settingsBtn && !settingsBtn._wired) {
      settingsBtn._wired = true;
      settingsBtn.addEventListener('click', () => this._openSettingsModal());
    }
    
    if (settingsClose && !settingsClose._wired) {
      settingsClose._wired = true;
      settingsClose.addEventListener('click', () => this._closeSettingsModal());
    }
    
    if (settingsModal && !settingsModal._wired) {
      settingsModal._wired = true;
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) this._closeSettingsModal();
      });
    }

    // Settings tab switching
    const settingsTabs = this.shadowRoot.querySelectorAll('.settings-tab');
    const tabContents = this.shadowRoot.querySelectorAll('.settings-tab-content');
    settingsTabs.forEach(tab => {
      if (!tab._wired) {
        tab._wired = true;
        tab.addEventListener('click', () => {
          const tabName = tab.dataset.tab;
          // Remove active from all tabs and contents
          settingsTabs.forEach(t => t.classList.remove('active'));
          tabContents.forEach(c => c.classList.remove('active'));
          // Add active to clicked tab and corresponding content
          tab.classList.add('active');
          const content = this.shadowRoot.querySelector(`.settings-tab-content[data-content="${tabName}"]`);
          if (content) {
            content.classList.add('active');
          } else {
          }
        });
      }
    });

    // Threshold input handlers
    const thresholdInputs = this.shadowRoot.querySelectorAll('.threshold-input');
    thresholdInputs.forEach(input => {
      if (!input._wired) {
        input._wired = true;
        const key = input.id.replace('threshold-', '');
        input.value = this._thresholdSettings[key] || 0;
        input.addEventListener('change', () => {
          this._thresholdSettings[key] = parseInt(input.value) || 0;
          // Don't apply immediately - wait for Apply button
        });
      }
    });

    // Column toggle checkboxes
    const colToggles = this.shadowRoot.querySelectorAll('.col-toggle');
    colToggles.forEach(cb => {
      if (!cb._wired) {
        cb._wired = true;
        const col = cb.id.replace('col-', '');
        cb.checked = this._columnSettings[col] !== false;
        cb.addEventListener('change', () => {
          this._columnSettings[col] = cb.checked;
          // Rebuild the active tab immediately
          if (this._activeTab === 'future') {
            this._renderFuture();
          } else if (this._activeTab === 'past') {
            this._loadPast();
          }
        });
      }
    });

    // Deferrable Loads Configuration
    const deferLoadCount = this.shadowRoot.getElementById('defer-load-count');
    if (deferLoadCount && !deferLoadCount._wired) {
      deferLoadCount._wired = true;
      deferLoadCount.value = this._deferableLoadsConfig.length;
      deferLoadCount.addEventListener('change', () => {
        const newCount = parseInt(deferLoadCount.value) || 0;
        // Adjust config array to new count
        if (newCount < this._deferableLoadsConfig.length) {
          this._deferableLoadsConfig = this._deferableLoadsConfig.slice(0, newCount);
        } else {
          while (this._deferableLoadsConfig.length < newCount) {
            this._deferableLoadsConfig.push({
              name: '',
              forecastEntityId: '',
              historicalEntityId: '',
              emoji: '🔌',
              color: { bg: '#d4c5f9', txt: '#4527a0', cost: '#4527a0' },
              threshold: 50
            });
          }
        }
        this._renderDeferableLoadsConfig();
      });
    }

    // Render deferrable loads config UI
    this._renderDeferableLoadsConfig();

    // Reset deferrable loads button
    const resetDeferLoadsBtn = this.shadowRoot.getElementById('reset-defer-loads-btn');
    if (resetDeferLoadsBtn && !resetDeferLoadsBtn._wired) {
      resetDeferLoadsBtn._wired = true;
      resetDeferLoadsBtn.addEventListener('click', () => {
        this._deferableLoadsConfig = [];
        deferLoadCount.value = 0;
        this._renderDeferableLoadsConfig();
      });
    }

    // Optional Loads handlers
    for (let i = 0; i < 10; i++) {
      // Emoji select dropdown
      const emojiSelect = this.shadowRoot.getElementById(`optload-emoji-${i}`);
      if (emojiSelect && !emojiSelect._wired) {
        emojiSelect._wired = true;
        // No extra handler needed - select works natively
      }

      // Preset dropdown (Load Name)
      const presetSelect = this.shadowRoot.getElementById(`optload-preset-${i}`);
      if (presetSelect && !presetSelect._wired) {
        presetSelect._wired = true;
        presetSelect.addEventListener('change', () => {
          const preset = presetSelect.value;
          const emojiInput = this.shadowRoot.getElementById(`optload-emoji-${i}`);
          const customNameInput = this.shadowRoot.getElementById(`optload-customname-${i}`);
          const forecastInput = this.shadowRoot.getElementById(`optload-forecast-${i}`);
          const historicalInput = this.shadowRoot.getElementById(`optload-historical-${i}`);
          
          if (preset === 'custom') {
            // Show custom name input field
            customNameInput.style.display = 'block';
            customNameInput.focus();
            // Clear other fields until user enters custom name
            forecastInput.value = '';
            historicalInput.value = '';
            emojiInput.value = '🔌';
          } else if (preset) {
            // Hide custom name input
            customNameInput.style.display = 'none';
            customNameInput.value = '';
            
            // Preset selected - auto-fill fields
            const presetMap = {
              'Air Conditioner': { emoji: '🌡️', abbr: 'HVAC', defaultSensor: 'sensor.hvac_power' },
              'Hot Water System': { emoji: '🚿', abbr: 'HWS', defaultSensor: 'sensor.hot_water_power' },
              'Clothes Dryer': { emoji: '👚', abbr: 'C. Dryer', defaultSensor: 'sensor.dryer_power' },
              'Washing Machine': { emoji: '🗑️', abbr: 'W. Machine', defaultSensor: 'sensor.washing_machine_power' },
              'Dishwasher': { emoji: '🍽️', abbr: 'Dishw.', defaultSensor: 'sensor.dishwasher_power' },
              'IT Hardware': { emoji: '💻', abbr: 'IT H/W', defaultSensor: 'sensor.it_hardware_power' },
              'Pool': { emoji: '🏊', abbr: 'Pump', defaultSensor: 'sensor.pool_power' },
              'Generic Load': { emoji: '🔌', abbr: 'Generic', defaultSensor: 'sensor.generic_load_power' }
            };
            
            const info = presetMap[preset];
            if (info) {
              emojiInput.value = info.emoji;
              forecastInput.value = this._generateForecastEntityId(preset);
              historicalInput.value = info.defaultSensor;
            }
          } else {
            // None selected - hide custom name input and clear fields
            customNameInput.style.display = 'none';
            customNameInput.value = '';
            emojiInput.value = '🔌';
            forecastInput.value = '';
            historicalInput.value = '';
          }
        });
      }
      
      // Custom name input handler
      const customNameInput = this.shadowRoot.getElementById(`optload-customname-${i}`);
      if (customNameInput && !customNameInput._wired) {
        customNameInput._wired = true;
        customNameInput.addEventListener('blur', () => {
          const customName = customNameInput.value.trim();
          const forecastInput = this.shadowRoot.getElementById(`optload-forecast-${i}`);
          const historicalInput = this.shadowRoot.getElementById(`optload-historical-${i}`);
          
          // Auto-generate forecast entity ID if custom name is entered
          if (customName) {
            forecastInput.value = this._generateForecastEntityId(customName);
            historicalInput.value = '';
          }
        });
      }

      // Forecast entity autocomplete
      const forecastInput = this.shadowRoot.getElementById(`optload-forecast-${i}`);
      if (forecastInput && !forecastInput._wired) {
        forecastInput._wired = true;
        forecastInput.addEventListener('input', () => {
          const query = forecastInput.value.toLowerCase();
          const options = this._getAvailableForecastOptions();
          const matches = options.filter(opt => opt.toLowerCase().includes(query)).slice(0, 5);
          
          // Remove existing datalist
          const existingList = this.shadowRoot.getElementById(`optload-forecast-list-${i}`);
          if (existingList) existingList.remove();
          
          // Create and populate datalist
          if (matches.length > 0) {
            const datalist = document.createElement('datalist');
            datalist.id = `optload-forecast-list-${i}`;
            matches.forEach(match => {
              const option = document.createElement('option');
              option.value = match;
              datalist.appendChild(option);
            });
            this.shadowRoot.appendChild(datalist);
            forecastInput.setAttribute('list', `optload-forecast-list-${i}`);
          }
        });
      }

      // Historical entity autocomplete
      const historicalInput = this.shadowRoot.getElementById(`optload-historical-${i}`);
      if (historicalInput && !historicalInput._wired) {
        historicalInput._wired = true;
        historicalInput.addEventListener('input', () => {
          const query = historicalInput.value.toLowerCase();
          const options = this._getAvailableHistoricalOptions();
          const matches = options.filter(opt => opt.toLowerCase().includes(query)).slice(0, 5);
          
          // Remove existing datalist
          const existingList = this.shadowRoot.getElementById(`optload-historical-list-${i}`);
          if (existingList) existingList.remove();
          
          // Create and populate datalist
          if (matches.length > 0) {
            const datalist = document.createElement('datalist');
            datalist.id = `optload-historical-list-${i}`;
            matches.forEach(match => {
              const option = document.createElement('option');
              option.value = match;
              datalist.appendChild(option);
            });
            this.shadowRoot.appendChild(datalist);
            historicalInput.setAttribute('list', `optload-historical-list-${i}`);
          }
        });
      }
    }

    // Inverter brand dropdown handler
    const inverterSelect = this.shadowRoot.getElementById('inverter-brand');
    if (inverterSelect && !inverterSelect._wired) {
      inverterSelect._wired = true;
      // Load saved inverter brand
      const savedBrand = localStorage.getItem('haeo-events-card-inverter-brand') || 'sigenergy';
      inverterSelect.value = savedBrand;
      
      inverterSelect.addEventListener('change', () => {
        const brand = inverterSelect.value;
        localStorage.setItem('haeo-events-card-inverter-brand', brand);
        
        // Populate Past Events Entities based on selected inverter
        this._populatePastEntitiesByInverter(brand);
      });
    }

    // Load entity autocomplete handlers for all loads
    const loadTypes = ['load', 'pv', 'grid', 'battery', 'ev', 'ev2'];
    loadTypes.forEach(loadType => {
      const forecastInput = this.shadowRoot.getElementById(`${loadType}-forecast`);
      const historicalInput = this.shadowRoot.getElementById(`${loadType}-historical`);
      const energyInput = this.shadowRoot.getElementById(`${loadType}-energy`);
      
      // Forecast entity autocomplete
      if (forecastInput && !forecastInput._wired) {
        forecastInput._wired = true;
        forecastInput.addEventListener('input', () => {
          const query = forecastInput.value.toLowerCase();
          const options = this._getAvailableForecastOptions();
          const matches = options.filter(opt => opt.toLowerCase().includes(query)).slice(0, 5);
          
          const existingList = this.shadowRoot.getElementById(`${loadType}-forecast-list`);
          if (existingList) existingList.remove();
          
          if (matches.length > 0) {
            const datalist = document.createElement('datalist');
            datalist.id = `${loadType}-forecast-list`;
            matches.forEach(match => {
              const option = document.createElement('option');
              option.value = match;
              datalist.appendChild(option);
            });
            this.shadowRoot.appendChild(datalist);
            forecastInput.setAttribute('list', `${loadType}-forecast-list`);
          }
        });
      }
      
      // Historical entity autocomplete
      if (historicalInput && !historicalInput._wired) {
        historicalInput._wired = true;
        historicalInput.addEventListener('input', () => {
          const query = historicalInput.value.toLowerCase();
          const options = this._getAvailableHistoricalOptions();
          const matches = options.filter(opt => opt.toLowerCase().includes(query)).slice(0, 5);
          
          const existingList = this.shadowRoot.getElementById(`${loadType}-historical-list`);
          if (existingList) existingList.remove();
          
          if (matches.length > 0) {
            const datalist = document.createElement('datalist');
            datalist.id = `${loadType}-historical-list`;
            matches.forEach(match => {
              const option = document.createElement('option');
              option.value = match;
              datalist.appendChild(option);
            });
            this.shadowRoot.appendChild(datalist);
            historicalInput.setAttribute('list', `${loadType}-historical-list`);
          }
        });
      }
      
      // Energy entity autocomplete
      if (energyInput && !energyInput._wired) {
        energyInput._wired = true;
        energyInput.addEventListener('input', () => {
          const query = energyInput.value.toLowerCase();
          const options = this._getAvailableEnergyOptions();
          const matches = options.filter(opt => opt.toLowerCase().includes(query)).slice(0, 5);
          
          const existingList = this.shadowRoot.getElementById(`${loadType}-energy-list`);
          if (existingList) existingList.remove();
          
          if (matches.length > 0) {
            const datalist = document.createElement('datalist');
            datalist.id = `${loadType}-energy-list`;
            matches.forEach(match => {
              const option = document.createElement('option');
              option.value = match;
              datalist.appendChild(option);
            });
            this.shadowRoot.appendChild(datalist);
            energyInput.setAttribute('list', `${loadType}-energy-list`);
          }
        });
      }
    });
    
    // Special export/discharge energy field autocomplete
    const specialEnergyFields = [
      { id: 'grid-energy-export', listId: 'grid-energy-export-list' },
      { id: 'battery-energy-discharge', listId: 'battery-energy-discharge-list' },
      { id: 'ev-energy-discharge', listId: 'ev-energy-discharge-list' },
      { id: 'ev2-energy-discharge', listId: 'ev2-energy-discharge-list' }
    ];
    
    specialEnergyFields.forEach(field => {
      const input = this.shadowRoot.getElementById(field.id);
      if (input && !input._wired) {
        input._wired = true;
        input.addEventListener('input', () => {
          const query = input.value.toLowerCase();
          const options = this._getAvailableEnergyOptions();
          const matches = options.filter(opt => opt.toLowerCase().includes(query)).slice(0, 5);
          
          const existingList = this.shadowRoot.getElementById(field.listId);
          if (existingList) existingList.remove();
          
          if (matches.length > 0) {
            const datalist = document.createElement('datalist');
            datalist.id = field.listId;
            matches.forEach(match => {
              const option = document.createElement('option');
              option.value = match;
              datalist.appendChild(option);
            });
            this.shadowRoot.appendChild(datalist);
            input.setAttribute('list', field.listId);
          }
        });
      }
    });

    // Deferrable loads entity autocomplete handlers
    const deferLoadForecastInput = this.shadowRoot.getElementById('deferLoad-forecast');
    if (deferLoadForecastInput && !deferLoadForecastInput._wired) {
      deferLoadForecastInput._wired = true;
      deferLoadForecastInput.addEventListener('input', () => {
        const query = deferLoadForecastInput.value.toLowerCase();
        const options = this._getAvailableForecastOptions();
        const matches = options.filter(opt => opt.toLowerCase().includes(query)).slice(0, 5);
        
        // Remove existing datalist
        const existingList = this.shadowRoot.getElementById('deferLoad-forecast-list');
        if (existingList) existingList.remove();
        
        // Create and populate datalist
        if (matches.length > 0) {
          const datalist = document.createElement('datalist');
          datalist.id = 'deferLoad-forecast-list';
          matches.forEach(match => {
            const option = document.createElement('option');
            option.value = match;
            datalist.appendChild(option);
          });
          this.shadowRoot.appendChild(datalist);
          deferLoadForecastInput.setAttribute('list', 'deferLoad-forecast-list');
        }
      });
    }

    const deferLoadHistoricalInput = this.shadowRoot.getElementById('deferLoad-historical');
    if (deferLoadHistoricalInput && !deferLoadHistoricalInput._wired) {
      deferLoadHistoricalInput._wired = true;
      deferLoadHistoricalInput.addEventListener('input', () => {
        const query = deferLoadHistoricalInput.value.toLowerCase();
        const options = this._getAvailableHistoricalOptions();
        const matches = options.filter(opt => opt.toLowerCase().includes(query)).slice(0, 5);
        
        // Remove existing datalist
        const existingList = this.shadowRoot.getElementById('deferLoad-historical-list');
        if (existingList) existingList.remove();
        
        // Create and populate datalist
        if (matches.length > 0) {
          const datalist = document.createElement('datalist');
          datalist.id = 'deferLoad-historical-list';
          matches.forEach(match => {
            const option = document.createElement('option');
            option.value = match;
            datalist.appendChild(option);
          });
          this.shadowRoot.appendChild(datalist);
          deferLoadHistoricalInput.setAttribute('list', 'deferLoad-historical-list');
        }
      });
    }

    // Export Settings button
    const exportBtn = this.shadowRoot.getElementById('export-settings-btn');
    if (exportBtn && !exportBtn._wired) {
      exportBtn._wired = true;
      exportBtn.addEventListener('click', () => this._exportSettings());
    }

    // Import Settings button
    const importBtn = this.shadowRoot.getElementById('import-settings-btn');
    const importFile = this.shadowRoot.getElementById('import-settings-file');
    if (importBtn && !importBtn._wired) {
      importBtn._wired = true;
      importBtn.addEventListener('click', () => {
        if (importFile) importFile.click();
      });
    }
    if (importFile && !importFile._wired) {
      importFile._wired = true;
      importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this._importSettings(file);
      });
    }

    // Apply Settings button
    const applyBtn = this.shadowRoot.getElementById('apply-settings-btn');
    if (applyBtn && !applyBtn._wired) {
      applyBtn._wired = true;
      applyBtn.addEventListener('click', () => {
        // Save color settings to localStorage
        try {
          const colorInputs = this.shadowRoot.querySelectorAll('.color-picker');
          const colors = {};
          colorInputs.forEach(input => {
            colors[input.id] = input.value;
          });
          localStorage.setItem('haeo-events-card-colors', JSON.stringify(colors));
        } catch (e) {
        }
        // Save column settings to localStorage
        try {
          localStorage.setItem('haeo-events-card-columns', JSON.stringify(this._columnSettings));
        } catch (e) {
          // localStorage might be unavailable
        }
        // Save threshold settings to localStorage
        try {
          localStorage.setItem('haeo-events-card-thresholds', JSON.stringify(this._thresholdSettings));
        } catch (e) {
          // localStorage might be unavailable
        }
        // Save deferrable loads configuration to localStorage
        try {
          localStorage.setItem('haeo-events-card-deferrable-loads', JSON.stringify(this._deferableLoadsConfig));
        } catch (e) {
          // localStorage might be unavailable
        }
        // Save entity settings to localStorage
        try {
          const weatherInput = this.shadowRoot.getElementById('weather-entity-input');
          const curtailmentInput = this.shadowRoot.getElementById('curtailment-entity-input');
          const entities = {
            weatherEntity: weatherInput ? weatherInput.value || 'weather.forecast_home' : 'weather.forecast_home',
            curtailmentEntity: curtailmentInput ? curtailmentInput.value || 'switch.solar_curtailment' : 'switch.solar_curtailment'
          };
          localStorage.setItem('haeo-events-card-entities', JSON.stringify(entities));
        } catch (e) {
          // localStorage might be unavailable
        }
        // Save load entities configuration to localStorage
        try {
          this._saveLoadEntitiesConfig();
        } catch (e) {
        }
        // Save optional loads configuration to localStorage
        try {
          this._saveOptionalLoadsConfig();
        } catch (e) {
        }
        // Save deferrable loads entity configuration to localStorage
        try {
          this._saveDeferrableLoadsConfig();
        } catch (e) {
        }
        // Close modal and refresh
        if (settingsModal) settingsModal.style.display = 'none';
        // Force reload/rebuild
        window.location.reload();
      });
    }
  }

  // ── Future tab render ───────────────────────────────────────────────────────
  _renderFuture() {
    this._lastRenderTs = Date.now();
    
    // Monitor HAEO last_run and trigger refresh if it changed
    const optimizerStatusEntity = this._hass?.states['sensor.optimizer_status'];
    if (optimizerStatusEntity?.attributes?.last_run) {
      const currentLastRun = optimizerStatusEntity.attributes.last_run;
      
      // If last_run has changed, HAEO has run an optimization - refresh the data
      if (this._previousLastRun !== null && this._previousLastRun !== currentLastRun) {
        // Clear cached data to force re-fetch
        this._lastCostTs = null;
        // Refresh PAST data if it's loaded
        if (this._activeTab === 'past' && this._pastState === 'ready') {
          this._pastState = 'loading';
          this._loadPast();
        }
      }
      
      // Store the current last_run for next comparison
      this._previousLastRun = currentLastRun;
    }
    
    const sbar  = this.shadowRoot.getElementById('sbar-future');
    const tbody = this.shadowRoot.getElementById('tb-future');
    if (!sbar || !tbody) return;
    try {
      this._renderFutureInner(sbar, tbody);
    } catch (e) {
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
      if (!Array.isArray(fc)) {
        return new Map();
      }
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
    // Load saved entity configuration (with defaults as fallback)
    const loadEntityConfig = this._loadLoadEntitiesConfig();
    const enabledOptionalLoads = this._getEnabledOptionalLoads();
    
    // Build forecast maps using saved or default entities
    const battMap  = buildMap(loadEntityConfig.battery.forecast || this._eid('haeo_battery'),        1);
    const gridMap  = buildMap(loadEntityConfig.grid.forecast || this._eid('haeo_grid'),           1); // positive=import, negative=export — matches display
    const loadMap  = buildMap(loadEntityConfig.base.forecast || this._eid('haeo_load'),           1);
    const deferLoadMap = buildMap(loadEntityConfig.deferrable?.forecast || this._eid('haeo_deferrable_load'), 1);
    const solarMap = buildMap(loadEntityConfig.pv.forecast || this._eid('haeo_solar'),          1);
    const socMap   = buildMap(this._eid('haeo_soc'),            1);
    const evPowerMap = buildMap(loadEntityConfig.ev.forecast || this._eid('haeo_ev_power'),     1);
    const evSocMap   = buildMap(this._eid('haeo_ev_soc'),       1);
    const ev2PowerMap = buildMap(loadEntityConfig.ev2.forecast || this._eid('haeo_ev2_power'),    1);
    const ev2SocMap   = buildMap(this._eid('haeo_ev2_soc'),      1);
    const buyMap   = buildMap(this._eid('haeo_buy_price'),      1);
    const sellMap  = buildMap(this._eid('haeo_sell_price'),     1);
    
    // Build forecast maps for each configured deferrable load
    // Build deferrable loads map using entity-based config
    const deferLoadMaps = [];
    const deferLoadForecastEntity = loadEntityConfig.deferrable?.forecast || this._eid('haeo_deferrable_load');
    if (deferLoadForecastEntity) {
      deferLoadMaps[0] = buildMap(deferLoadForecastEntity, 1);
    } else {
      deferLoadMaps[0] = new Map();
    }
    
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

    // Check if EV sensors exist
    const evSensorsExist = this._evSensorExists('haeo_ev_power') && this._evSensorExists('haeo_ev_soc');
    const ev2SensorsExist = this._evSensorExists('haeo_ev2_power') && this._evSensorExists('haeo_ev2_soc');
    const deferLoadSensorExists = this._evSensorExists('haeo_deferrable_load');

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
    const nowClassification = _haeo_classifyFuture(solarMap.get(nowTs) || 0, loadMap.get(nowTs) || 0, currentBattKw, currentGridKw, evPowerMap.get(nowTs) || 0, deferLoadMap.get(nowTs) || 0, ev2PowerMap.get(nowTs) || 0, [], enabledOptionalLoads);
    const { mode, focus, modeColor, focusColor } = _haeo_getModeAndFocus(nowClassification.label);

    // Morning SoC / Peak SoC — show next day's minimum SoC during morning (00:00-12:00) or current peak
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
    
    // Get HAEO forecast last update time
    const optimizerStatusEntity = this._hass?.states['sensor.optimizer_status'];
    let haeoUpdatedStr = null;
    if (optimizerStatusEntity?.attributes?.last_run) {
      const lastRunUtc = new Date(optimizerStatusEntity.attributes.last_run);
      const now = new Date();
      const diffMs = now - lastRunUtc;
      
      // Handle future timestamps (negative diff) - show "just now"
      if (diffMs < 0) {
        const localTime = lastRunUtc.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
        haeoUpdatedStr = 'just now (' + localTime + ')';
      } else {
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        
        let timeStr = '';
        if (diffSecs < 60) {
          timeStr = diffSecs + 's ago';
        } else if (diffMins < 60) {
          timeStr = diffMins + 'm ago';
        } else {
          const remainingMins = diffMins % 60;
          timeStr = diffHours + 'h ' + remainingMins + 'm ago';
        }
        
        const localTime = lastRunUtc.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
        haeoUpdatedStr = timeStr + ' (' + localTime + ')';
      }
    }
    
    // Get battery capacity if available
    const batteryCapacityStr = this._hass?.states['number.battery_capacity']?.state;
    const batteryCapacity = batteryCapacityStr ? parseFloat(batteryCapacityStr) : null;
    
    // Helper to format SoC badge with optional kWh
    const formatSocBadge = (soc, time, label) => {
      if (soc === null) return null;
      
      let display = `${label}: ${soc.toFixed(1)}%`;
      
      // Add kWh if capacity available
      if (batteryCapacity && batteryCapacity > 0) {
        const kWh = (soc / 100) * batteryCapacity;
        display += ` | ${kWh.toFixed(1)} kWh`;
      }
      
      display += ` (${time})`;
      return display;
    };
    
    if (chargingNow) {
      // Currently charging with solar: find peak SoC during this charge period
      let pkSoc = 0, pkTime = '';
      for (const row of primaryFc) {
        const ts = new Date(row.time).getTime();
        if (isNaN(ts) || ts < nowTs) continue;
        const soc = socMap.get(ts) || 0;
        if ((solarMap.get(ts) || 0) > 0.5 && (battMap.get(ts) || 0) < -0.01 && soc > pkSoc) {
          pkSoc  = soc;
          pkTime = new Date(ts).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
      }
      if (pkSoc > 0) { dawnSoc = formatSocBadge(pkSoc, pkTime, 'Peak SoC'); }
    } else {
      // Not currently charging: find tomorrow's minimum SoC during morning period (00:00-12:00)
      const today = new Date(nowTs);
      const todayDate = today.toLocaleDateString('en-CA'); // YYYY-MM-DD
      
      let minSoc = 100, minTime = '';
      
      // Scan all forecast entries for next day's morning period
      for (const row of primaryFc) {
        const ts = new Date(row.time).getTime();
        if (isNaN(ts) || ts <= nowTs) continue;
        
        const forecastDate = new Date(ts).toLocaleDateString('en-CA');
        const forecastHour = new Date(ts).getHours();
        
        // Found an entry on next day
        if (forecastDate !== todayDate) {
          const soc = socMap.get(ts) || 0;
          
          // Only look at morning hours (00:00 to 12:00)
          if (forecastHour >= 12) break;
          
          // Track minimum SoC
          if (soc < minSoc) {
            minSoc = soc;
            minTime = new Date(ts).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
          }
        }
      }
      
      // Report the minimum we found
      if (minSoc < 100) {
        dawnSoc = formatSocBadge(minSoc, minTime, 'Morning SoC');
      }
    }

    // Smart alert pills: next grid import/export & force charge/discharge windows (FUTURE TAB ONLY)
    let gridImportTime = '', gridExportTime = '', forceChargeTime = '', forceDischargeTime = '';
    const fmtSbarTime = (ts) => new Date(ts).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    const fmtAlertTime = (ts) => {
      const d = new Date(ts);
      const todayStr = new Date().toLocaleDateString('en-CA');
      const eventDayStr = d.toLocaleDateString('en-CA');
      const timeStr = fmtSbarTime(ts);
      if (eventDayStr !== todayStr) {
        const dayName = d.toLocaleDateString('en-AU', { weekday: 'short' });
        return dayName + ' ' + timeStr;
      }
      return timeStr;
    };
    for (const row of primaryFc) {
      const ts = new Date(row.time).getTime();
      if (isNaN(ts) || ts < nowTs) continue;
      const gridKw = gridMap.get(ts) || 0;
      const battKw = battMap.get(ts) || 0;
      const solarKw = solarMap.get(ts) || 0;
      const loadKw = loadMap.get(ts) || 0;
      
      // Grid Import (grid > 0.1 kW)
      if (!gridImportTime && gridKw > 0.1)
        gridImportTime = fmtAlertTime(ts);
      
      // Grid Export (grid < -0.1 kW)
      if (!gridExportTime && gridKw < -0.1)
        gridExportTime = fmtAlertTime(ts);
      
      // Force Charge: battery charging from grid (battKw < -0.1 and gridKw > 0.1 and solarKw < 0.05)
      if (!forceChargeTime && battKw < -0.1 && gridKw > 0.1 && solarKw < 0.05)
        forceChargeTime = fmtAlertTime(ts);
      
      // Force Discharge: battery discharging to grid (battKw > 0.1 and gridKw < -0.1)
      if (!forceDischargeTime && battKw > 0.1 && gridKw < -0.1)
        forceDischargeTime = fmtAlertTime(ts);
    }

    // Get numeric SoC for color calculation (extract from dawnSoc string if it exists)
    let dawnSocNumeric = null;
    if (dawnSoc && typeof dawnSoc === 'string') {
      const match = dawnSoc.match(/(\d+\.?\d*?)%/);
      dawnSocNumeric = match ? parseFloat(match[1]) : null;
    }
    
    const socColor  = nowSoc  != null ? (nowSoc  <= 20 ? '#f44336' : nowSoc  >= 75 ? '#4caf50' : 'var(--primary-text-color)') : '';
    const dawnColor = dawnSocNumeric != null ? (dawnSocNumeric <= 20 ? '#f44336' : dawnSocNumeric <= 35 ? '#ff9800' : '#4caf50') : '';

    // Update HAEO Updated badge in tab bar (centered between tabs)
    const haeoUpdatedBadge = this.shadowRoot.getElementById('haeo-updated-badge');
    if (haeoUpdatedBadge && haeoUpdatedStr) {
      haeoUpdatedBadge.innerHTML = '🔄 HAEO Updated: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + haeoUpdatedStr + '</span>';
    }

    sbar.innerHTML =
      '<span style="color:#2196f3;font-weight:bold;margin-right:12px;">STATUS:</span>' +
      (mode ? '📌 Mode: <span class="pill" style="background-color:' + (modeColor || '#555') + ' !important;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + mode + '</span>' : '') +
      (focus ? '🎯 Focus: <span class="pill" style="background-color:' + (focusColor || '#555') + ' !important;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + focus + '</span>' : '') +
      (nowSoc   != null ? '🔋 SoC now: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + nowSoc.toFixed(1)  + '%</span>' : '') +
      (dawnSoc  != null ? '☀️ <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + dawnSoc + '</span>' : '') +
      (nowBuy   != null ? '💲 Buy: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">$' + nowBuy.toFixed(4)  + '</span>' : '') +
      (nowSell  != null ? '💲 Sell: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">$' + nowSell.toFixed(4) + '</span>' : '') +
      (exportLimit != null ? '📤 Export Limit: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + exportLimit.toFixed(2) + ' kW</span>' : '') +
      (isGridImporting && importLimit != null ? '⚡ Import Limit: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + importLimit.toFixed(2) + ' kW</span>' : '') +
      (isBattCharging && battChargeLimit != null ? '🔋 ESS Charge Limit: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + battChargeLimit.toFixed(2) + ' kW</span>' : '') +
      (isBattExporting && battDischargeLimit != null ? '🔋 ESS Disch. Limit: <span class="pill" style="background:#555;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">' + battDischargeLimit.toFixed(2) + ' kW</span>' : '');

    // Load settings for weather and curtailment entities
    let weatherEntity = 'weather.forecast_home';
    let curtailmentEntity = 'switch.solar_curtailment';
    const savedEntities = localStorage.getItem('haeo-events-card-entities');
    if (savedEntities) {
      try {
        const ents = JSON.parse(savedEntities);
        if (ents.weatherEntity) weatherEntity = ents.weatherEntity;
        if (ents.curtailmentEntity) curtailmentEntity = ents.curtailmentEntity;
      } catch(e) {}
    }

    // Get weather and curtailment states
    const weatherState = this._hass && this._hass.states ? this._hass.states[weatherEntity] : null;
    const curtailmentState = this._hass && this._hass.states ? this._hass.states[curtailmentEntity] : null;
    const isWeatherAffected = weatherState && ['rainy', 'pouring', 'cloudy', 'fog', 'partly_cloudy'].includes(weatherState.state);
    const isCurtailed = curtailmentState && curtailmentState.state === 'on';

    // Set grid export alert in tab bar (FUTURE TAB ONLY - hide when on Past tab)
    const alertEl = this.shadowRoot.getElementById('grid-export-alert');
    if (alertEl) {
      let alertHtml = '';
      
      // Alert order: 1. Weather, 2. Curtailment, 3. Grid Import, 4. Grid Export, 5. Force Charge, 6. Force Discharge
      if (isWeatherAffected) alertHtml += '<span class="pill" style="background:#4a90e2;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;margin-right:4px;">🌧️ Weather Affected</span>';
      if (isCurtailed) alertHtml += '<span class="pill" style="background:#ff9800;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;margin-right:4px;">⚠️ Curtail On</span>';
      if (gridImportTime) alertHtml += '<span class="pill" style="background:#e65100;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;margin-right:4px;">⚡ Grid import from ' + gridImportTime + '</span>';
      if (gridExportTime) alertHtml += '<span class="pill" style="background:#28a745;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;margin-right:4px;">💲 Grid export from ' + gridExportTime + '</span>';
      if (forceChargeTime) alertHtml += '<span class="pill" style="background:' + (gridImportTime ? '#28a745' : '#f44336') + ';color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;margin-right:4px;">🔋 Force charge from ' + forceChargeTime + '</span>';
      if (forceDischargeTime) alertHtml += '<span class="pill" style="background:' + (gridExportTime ? '#28a745' : '#ff9800') + ';color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;display:inline-block;">🔋 Force discharge from ' + forceDischargeTime + '</span>';
      
      // Prepend ALERTS: label in red if there are alerts
      if (alertHtml) {
        alertHtml = '<span style="color:#f44336;font-weight:bold;margin-right:8px;">ALERTS:</span>' + alertHtml;
      }
      
      alertEl.innerHTML = alertHtml;
      alertEl.style.display = this._activeTab === 'future' && alertHtml ? 'flex' : 'none';
      if (alertEl.style.display === 'flex') alertEl.style.gap = '4px';
    }

    // ── Single-pass day totals: accumulate while iterating ──
    // Build optional loads forecast maps FIRST (needed for day header builder)
    const optionalLoadMaps = [];
    enabledOptionalLoads.forEach(load => {
      if (load.forecastEntity) {
        const map = buildMap(load.forecastEntity, 1);
        optionalLoadMaps.push({
          config: load,
          map: map
        });
      }
    });
    
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
      
      // Retrieve values for dynamic deferrable loads (use nearestGet for timestamp matching)
      const deferLoadValues = [];
      deferLoadMaps.forEach((map, idx) => {
        deferLoadValues[idx] = nearestGet(map, ts) || 0;
      });
      
      // Retrieve values for optional loads
      const optionalLoadsKwValues = [];
      optionalLoadMaps.forEach((item, idx) => {
        optionalLoadsKwValues[idx] = item.map.get(ts) || 0;
      });

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
        dailyKwh[dayStr] = { load: 0, deferLoad: 0, pv: 0, grid: 0, batt: 0, ev: 0, ev2: 0 };
        // Initialize keys for dynamic deferrable loads
        this._deferableLoadsConfig.forEach((config, idx) => {
          dailyKwh[dayStr][`deferLoad${idx}`] = 0;
        });
        // Initialize keys for optional loads
        optionalLoadMaps.forEach((config, idx) => {
          dailyKwh[dayStr][`optload${idx}`] = 0;
        });
      }

      dailyCosts[dayStr] += cost;
      const dk = dailyKwh[dayStr];
      dk.load += loadKw  * stepH;
      dk.deferLoad += (deferLoadMap.get(ts) || 0) * stepH;
      
      // Accumulate optional loads kWh
      optionalLoadMaps.forEach((config, idx) => {
        dk[`optload${idx}`] += (optionalLoadsKwValues[idx] || 0) * stepH;
      });
      
      dk.pv   += solarKw * stepH;
      dk.grid += gridKw  * stepH;
      dk.batt += battKw  * stepH;
      dk.ev   += (evPowerMap.get(ts) || 0) * stepH;
      dk.ev2  += (ev2PowerMap.get(ts) || 0) * stepH;
      
      // Accumulate dynamic deferrable loads
      deferLoadValues.forEach((val, idx) => {
        dk[`deferLoad${idx}`] += val * stepH;
      });
    }

    // ── Build day header row ──
    const _buildDayHeaderRow = (day) => {
      const dayTotal = dailyCosts[day] || 0;
      let defaultDk = { load:0, deferLoad:0, pv:0, grid:0, batt:0, ev:0, ev2:0 };
      // Add optional load fields to default
      optionalLoadMaps.forEach((config, idx) => {
        defaultDk[`optload${idx}`] = 0;
      });
      const dk       = dailyKwh[day]  || defaultDk;
      const dayColor = dayTotal <= 0 ? '#4caf50' : '#f44336';
      const dayLabel = day === todayStr ? '📅 Today' : '📅 ' + new Date(day + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
      const dayCostLabel = dayTotal <= 0 ? _HAEO_CUR + Math.abs(dayTotal).toFixed(2) : '-' + _HAEO_CUR + dayTotal.toFixed(2);
      const fmtKd = (v) => Math.abs(v) > 0.001 ? (v < 0 ? '-' : '') + Math.abs(v).toFixed(3) : '—';
      const fmtGrid = (v) => Math.abs(v) <= 0.001 ? '—' : '<span style="color:' + (v < 0 ? '#4caf50' : '#f44336') + ';">' + (v < 0 ? '-' : '') + Math.abs(v).toFixed(3) + '</span>';
      const fmtBatt = (v) => Math.abs(v) <= 0.001 ? '—' : '<span style="color:' + (v < 0 ? '#f44336' : '#4caf50') + ';">' + (v < 0 ? '-' : '') + Math.abs(v).toFixed(3) + '</span>';
      let html = '<tr class="dr">' +
        '<td colspan="2">' + dayLabel + '</td>' +
        '<td class="bgl" colspan="2"></td>' +
        '<td class="bgl"></td>' +
        '<td class="bgi" style="text-align:right;">' + fmtKd(dk.load) + '</td>';
      
      // Add Def. Loads toggle column (single entity, not multiple presets)
      if (columnSettings.deferLoad !== false) {
        const deferLoadThreshold = this._thresholdSettings['deferLoad'] || 50;
        const thresholdKwh = deferLoadThreshold / 1000 * 24; // threshold per day
        html += '<td class="bgl"></td><td class="bgi" style="text-align:right;">' + (dk.deferLoad > 0 ? fmtKd(dk.deferLoad) : '—') + '</td>';
      }
      
      // Add optional loads columns
      optionalLoadMaps.forEach((config, idx) => {
        html += '<td class="bgl"></td><td class="bgi" style="text-align:right;">' + (dk[`optload${idx}`] > 0 ? fmtKd(dk[`optload${idx}`]) : '—') + '</td>';
      });
      
      html += '<td class="bgl"></td>' +
        '<td class="bgi" style="text-align:right;">' + fmtKd(dk.pv) + '</td>' +
        '<td class="bgl"></td>' +
        '<td class="bgi" style="text-align:right;">' + fmtGrid(dk.grid) + '</td>' +
        '<td class="bgl"></td>' +
        '<td class="bgi" style="text-align:right;">' + fmtBatt(-dk.batt) + '</td>' +
        '<td class="bgi" style="text-align:right;"></td>';
      if (columnSettings.ev !== false) {
        html += '<td class="bgl"></td><td class="bgi" style="text-align:right;">' + fmtKd(dk.ev) + '</td><td class="bgi" style="text-align:right;"></td>';
      }
      if (columnSettings.ev2 !== false) {
        html += '<td class="bgl"></td><td class="bgi" style="text-align:right;">' + fmtKd(dk.ev2) + '</td><td class="bgi" style="text-align:right;"></td>';
      }
      html += '<td class="bgl" style="text-align:right;color:' + dayColor + ';">' + dayCostLabel + '</td></tr>';
      return html;
    };

    // ── Table rows: single pass with day header injection ──
    const rows = [];
    let lastDay = '';
    
    // Capture this context for use in row building
    const columnSettings = this._columnSettings;

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
      const deferLoadKw = deferLoadMap.get(ts) || 0;
      
      // Retrieve values for dynamic deferrable loads (use nearestGet for timestamp matching)
      const deferLoadValues = [];
      deferLoadMaps.forEach((map, idx) => {
        const val = nearestGet(map, ts) || 0;
        deferLoadValues[idx] = val;
      });
      
      const evKw    = evPowerMap.get(ts)    || 0;
      const evSoc   = evSocMap.get(ts)      || 0;
      const ev2Kw   = ev2PowerMap.get(ts)   || 0;
      const ev2Soc  = ev2SocMap.get(ts)     || 0;
      
      // Build optional loads values for this timestamp
      const optionalLoadsKwValues = [];
      optionalLoadMaps.forEach((item, idx) => {
        const val = item.map.get(ts) || 0;
        optionalLoadsKwValues[idx] = val;
        if (idx === 0) {
        }
      });
      if (optionalLoadsKwValues.length > 0 && optionalLoadsKwValues[0] > 0) {
      }
      
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

      const cls = _haeo_classifyFuture(solarKw, loadKw, battKw, gridKw, evKw, deferLoadKw, ev2Kw, optionalLoadsKwValues, enabledOptionalLoads);
      const c   = this._colorSettings[cls.color] || _HAEO_COLOURS[cls.color] || { bg: 'transparent', txt: 'var(--primary-text-color)', cost: 'var(--primary-text-color)' };

      // For light backgrounds, use black text for better contrast
      const isLightBg = c.bg.includes('fff') || c.bg.includes('ffe') || c.bg.includes('ccf');
      const textColor = isLightBg ? '#000' : c.txt;
      const costColor = isLightBg ? '#000' : c.cost;

      // Grid: positive=import (red=costing), negative=export (green=earning)
      const gridCol  = gridKw > 0.1 ? '#f44336' : gridKw < -0.1 ? '#4caf50' : c.txt;
      // Battery display: negate for display (positive kW = charging now shows as positive, negative = discharging)
      // Color: positive=charging, negative=discharging
      // Charging from grid=red, charging from solar=green, discharging=red
      const battDisplay = -battKw;  // Negate for display
      const battCol  = battDisplay > 0.1 ? (gridKw > 0.1 ? '#f44336' : '#4caf50')  // charging: red if from grid, green if from solar
                     : battDisplay < -0.1 ? '#f44336'  // discharging: red
                     : c.txt;
      
      // EV display: negate for display (positive kW = charging now shows as positive, negative = discharging)
      // Color: discharging to house=amber, discharging to grid=red, charging from solar=green, charging from grid=red
      const evDisplay = -evKw;  // Negate for display
      const evCol = evDisplay > 0.1 ? (gridKw < -0.1 ? '#f44336' : '#ff9800')  // discharging: red if to grid, amber if to home
                  : evDisplay < -0.1 ? (gridKw > 0.1 ? '#f44336' : '#4caf50')  // charging: red if from grid, green if from solar
                  : c.txt;
      
      // EV2 same as EV
      const ev2Display = -ev2Kw;
      const ev2Col = ev2Display > 0.1 ? (gridKw < -0.1 ? '#f44336' : '#ff9800')  // discharging: red if to grid, amber if to home
                   : ev2Display < -0.1 ? (gridKw > 0.1 ? '#f44336' : '#4caf50')  // charging: red if from grid, green if from solar
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
      
      // Build deferrable load label (single entity now, not multiple presets)
      let deferLoadLabel = '';
      const totalDeferLoad = deferLoadValues.reduce((sum, val) => sum + val, 0);
      if (totalDeferLoad >= 0.05) {
        deferLoadLabel = ' ⏰';
      }
      
      const eventLabel = cls.label + deferLoadLabel;
      
      // Get detailed description from _HAEO_DESCRIPTIONS
      const detailedDesc = _HAEO_DESCRIPTIONS[eventLabel] || _HAEO_DESCRIPTIONS[cls.label] || cls.note || 'Energy flow event';
      
      // Collect event labels for dynamic legend (FUTURE tab)
      if (!this._futureEvents) this._futureEvents = {};
      if (!this._futureEvents[eventLabel]) {
        this._futureEvents[eventLabel] = true;
      }

      rows.push('<tr style="background-color:' + c.bg + ';color:' + textColor + ';">' +
        '<td>' + timeStr + '</td>' +
        '<td><span title="' + detailedDesc.replace(/"/g, '&quot;') + '">' + eventLabel + '</span></td>' +
        '<td class="bgl">' + _haeo_fmtP(buyP)   + '</td>' +
        '<td class="bgi">' + _haeo_fmtP(sellP)  + '</td>' +
        '<td class="bgl">' + loadKw.toFixed(3)  + '</td>' +
        '<td class="bgi">' + fmtKwh(loadKw)     + '</td>' +
        // Def. Loads toggle column (single entity, not multiple presets)
        (columnSettings.deferLoad !== false ? (
          '<td class="bgl">' + (deferLoadKw >= 0.05 ? deferLoadKw.toFixed(3) : '—') + '</td>' +
          '<td class="bgi">' + (deferLoadKw >= 0.05 ? fmtKwh(deferLoadKw) : '—') + '</td>'
        ) : '') +
        // Optional loads columns
        optionalLoadMaps.map((item, idx) => {
          const optKw = optionalLoadsKwValues[idx] || 0;
          const optThreshold = (this._thresholdSettings['optload'] || 10) / 1000; // Convert W to kW
          return '<td class="bgl">' + (optKw > optThreshold ? optKw.toFixed(3) : '—') + '</td>' +
                 '<td class="bgi">' + (optKw > optThreshold ? fmtKwh(optKw) : '—') + '</td>';
        }).join('') +
        '<td class="bgl">' + (solarKw >= 0.05 ? solarKw.toFixed(3) : '—') + '</td>' +
        '<td class="bgi">' + (solarKw >= 0.05 ? fmtKwh(solarKw) : '—') + '</td>' +
        '<td class="bgl">' + (Math.abs(gridKw) >= 0.1 ? '<span style="color:' + gridCol + ';">' + gridKw.toFixed(3) + '</span>' : '—') + '</td>' +
        '<td class="bgi">' + (Math.abs(gridKw) >= 0.1 ? fmtKwhC(gridKw, gridCol) : '—') + '</td>' +
        '<td class="bgl">' + (Math.abs(battDisplay) >= 0.1 ? '<span style="color:' + battCol + ';">' + battDisplay.toFixed(3) + '</span>' : '—') + '</td>' +
        '<td class="bgi">' + (Math.abs(battDisplay) >= 0.1 ? '<span style="color:' + battCol + ';">' + fmtKwh(battDisplay) + '</span>' : '—') + '</td>' +
        '<td class="bgi"><span style="color:' + socCol + ';">' + soc.toFixed(1) + '</span></td>' +
        (columnSettings.ev !== false ? 
          '<td class="bgl">' + (evSensorsExist ? (Math.abs(evDisplay) >= 0.1 ? '<span style="color:' + evCol + ';">' + evDisplay.toFixed(3) + '</span>' : '—') : 'x') + '</td>' +
          '<td class="bgi">' + (evSensorsExist ? (Math.abs(evDisplay) >= 0.1 ? '<span style="color:' + evCol + ';">' + fmtKwh(evDisplay) + '</span>' : '—') : 'x') + '</td>' +
          '<td class="bgi"><span style="color:' + (evSoc <= 20 ? '#f44336' : evSoc >= 80 ? '#4caf50' : textColor) + ';">' + (evSensorsExist ? (evSoc > 0 ? evSoc.toFixed(1) : '—') : 'x') + '</span></td>'
          : '') +
        (columnSettings.ev2 !== false ?
          '<td class="bgl">' + (ev2SensorsExist ? (Math.abs(ev2Display) >= 0.1 ? '<span style="color:' + ev2Col + ';">' + ev2Display.toFixed(3) + '</span>' : '—') : 'x') + '</td>' +
          '<td class="bgi">' + (ev2SensorsExist ? (Math.abs(ev2Display) >= 0.1 ? '<span style="color:' + ev2Col + ';">' + fmtKwh(ev2Display) + '</span>' : '—') : 'x') + '</td>' +
          '<td class="bgi"><span style="color:' + (ev2Soc <= 20 ? '#f44336' : ev2Soc >= 80 ? '#4caf50' : textColor) + ';">' + (ev2SensorsExist ? (ev2Soc > 0 ? ev2Soc.toFixed(1) : '—') : 'x') + '</span></td>'
          : '') +
        '<td class="bgl"><span style="color:' + costColor + ';font-weight:bold;">' + costFmt.disp + '</span></td>' +
        '</tr>');
    }

    tbody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="' + (16 + (this._deferableLoadsConfig.length * 2) + (columnSettings.ev !== false ? 3 : 0) + (columnSettings.ev2 !== false ? 3 : 0)) + '" class="msg">No future forecast rows available.</td></tr>';
    
    // Add tooltip handlers to event cells
    if (rows.length) {
      const eventCells = tbody.querySelectorAll('td:nth-child(2)');
      eventCells.forEach(cell => {
        const label = cell.textContent.trim();
        if (label && label !== '—') {
          this._addTooltipHandler(cell, label);
        }
      });
    }
    
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

      // Load saved entity configuration (with defaults as fallback)
      const loadEntityConfig = this._loadLoadEntitiesConfig();
      const enabledOptionalLoads = this._getEnabledOptionalLoads();

      // Past power sensors — actual inverter measurements (with saved entity overrides)
      const powerSensors = [
        loadEntityConfig.battery.historical || this._eid('past_battery_power'),
        loadEntityConfig.base.historical || this._eid('past_load_power'),
        loadEntityConfig.pv.historical || this._eid('past_solar_power'),
        loadEntityConfig.grid.historical || this._eid('past_grid_power'),
        this._eid('haeo_soc'),
        this._eid('haeo_buy_price'),
        this._eid('haeo_sell_price'),
        loadEntityConfig.deferrable?.historical || this._eid('past_deferrable_load'),
        loadEntityConfig.ev.historical || this._eid('haeo_ev_power'),
        this._eid('haeo_ev_soc'),
        loadEntityConfig.ev2.historical || this._eid('haeo_ev2_power'),
        this._eid('haeo_ev2_soc'),
        // Add EV1 fallback sensors to lookup (in case primary doesn't exist)
        this._config['entity_haeo_ev1_power'] || _HAEO_DEFAULTS['haeo_ev1_power'],
        this._config['entity_haeo_ev1_soc'] || _HAEO_DEFAULTS['haeo_ev1_soc'],
        // Add optional load historical entities
        ...enabledOptionalLoads.map(load => load.historicalEntity).filter(e => e)
      ];
      
      // Deferrable load historical entity is already included above from loadEntityConfig
      
      // Energy sensors for kWh delta columns
      const energySensors = [
        this._eid('past_load_energy'),
        this._eid('past_solar_energy'),
        this._eid('past_grid_import_energy'),
        this._eid('past_grid_export_energy'),
        this._eid('past_battery_charge_energy'),
        this._eid('past_battery_discharge_energy'),
      ];
      
      // Add configured deferrable load historical entities (for energy totals if available)
      this._deferableLoadsConfig.forEach((config) => {
        if (config.historicalEntityId) {
          energySensors.push(config.historicalEntityId);
        }
      });
      
      // Add configured optional load energy entities
      enabledOptionalLoads.forEach((config) => {
        if (config.energyEntity) {
          energySensors.push(config.energyEntity);
        }
      });

      // Check if EV sensors exist
      const evSensorsExist = this._evSensorExists('haeo_ev_power') && this._evSensorExists('haeo_ev_soc');
      const ev2SensorsExist = this._evSensorExists('haeo_ev2_power') && this._evSensorExists('haeo_ev2_soc');
      const deferLoadSensorExists = this._evSensorExists('past_deferrable_load');

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
        deferLoad: _haeo_powerMult(this._hass, this._eid('past_deferrable_load')),
        ev:      _haeo_powerMult(this._hass, this._eid('haeo_ev_power')),
        ev2:     _haeo_powerMult(this._hass, this._eid('haeo_ev2_power')),
      };
      
      // Add multipliers for each configured deferrable load
      this._deferableLoadsConfig.forEach((config, idx) => {
        if (config.historicalEntityId) {
          this._pwrMult[`deferLoad${idx}`] = _haeo_powerMult(this._hass, config.historicalEntityId);
        }
      });
      
      this._engMult = {
        past_load_energy:              _haeo_energyMult(this._hass, this._eid('past_load_energy')),
        past_solar_energy:             _haeo_energyMult(this._hass, this._eid('past_solar_energy')),
        past_grid_import_energy:       _haeo_energyMult(this._hass, this._eid('past_grid_import_energy')),
        past_grid_export_energy:       _haeo_energyMult(this._hass, this._eid('past_grid_export_energy')),
        past_battery_charge_energy:    _haeo_energyMult(this._hass, this._eid('past_battery_charge_energy')),
        past_battery_discharge_energy: _haeo_energyMult(this._hass, this._eid('past_battery_discharge_energy')),
        past_deferrable_load:          _haeo_energyMult(this._hass, this._eid('past_deferrable_load')),
        haeo_ev_energy:                _haeo_energyMult(this._hass, this._eid('haeo_ev_energy')),
        haeo_ev2_energy:               _haeo_energyMult(this._hass, this._eid('haeo_ev2_energy')),
      };
      
      // Add multipliers for each configured deferrable load energy
      this._deferableLoadsConfig.forEach((config, idx) => {
        if (config.historicalEntityId) {
          this._engMult[`deferLoad${idx}_energy`] = _haeo_energyMult(this._hass, config.historicalEntityId);
        }
      });

      // Convert threshold from watts to kW for comparisons
      const _thresholdKw = (colName) => {
        const threshW = this._thresholdSettings[colName] || 0;
        return threshW / 1000;  // Convert watts to kW
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
        const deferLoadKw = (parseFloat(_haeo_getAt(lookup[this._eid('past_deferrable_load')], ts)) || 0) * this._pwrMult.deferLoad;
        const evKw   = (parseFloat(_haeo_getAt(lookup[this._eid('haeo_ev_power')],      ts)) || 0) * this._pwrMult.ev;
        const ev2Kw  = (parseFloat(_haeo_getAt(lookup[this._eid('haeo_ev2_power')],     ts)) || 0) * this._pwrMult.ev2;
        
        // Retrieve values for dynamic deferrable loads
        const deferLoadValues = [];
        this._deferableLoadsConfig.forEach((config, idx) => {
          if (config.historicalEntityId && lookup[config.historicalEntityId]) {
            deferLoadValues[idx] = (parseFloat(_haeo_getAt(lookup[config.historicalEntityId], ts)) || 0) * this._pwrMult[`deferLoad${idx}`];
          } else {
            deferLoadValues[idx] = 0;
          }
        });
        
        const buyP   = parseFloat(_haeo_getAt(lookup[this._eid('haeo_buy_price')],     ts)) || 0;
        const sellP  = parseFloat(_haeo_getAt(lookup[this._eid('haeo_sell_price')],    ts)) || 0;
        const stepH  = 5 / 60;

        const importing = gridKw > 0.1;
        const exporting = gridKw < -0.1;
        const cost = importing ? Math.abs(gridKw) * buyP * stepH : exporting ? gridKw * sellP * stepH : 0;

        if (!pastDailyCosts.hasOwnProperty(dayStr)) {
          pastDailyOrder.push(dayStr);
          pastDailyCosts[dayStr] = 0;
          const dailyKwhObj = { 
            load: 0, deferLoad: 0, pv: 0, 
            gridImp: 0, gridExp: 0, 
            battChg: 0, battDis: 0, 
            evChg: 0, evDis: 0, 
            ev2Chg: 0, ev2Dis: 0
          };
          // Add dynamic deferrable load tracking
          this._deferableLoadsConfig.forEach((config, idx) => {
            dailyKwhObj[`deferLoad${idx}`] = 0;
          });
          // Add optional loads tracking
          enabledOptionalLoads.forEach((config, idx) => {
            dailyKwhObj[`optload${idx}`] = 0;
          });
          pastDailyKwh[dayStr] = dailyKwhObj;
        }

        pastDailyCosts[dayStr] += cost;
        const dk = pastDailyKwh[dayStr];
        dk.load += loadKw  * stepH;
        dk.deferLoad += deferLoadKw * stepH;
        
        // Accumulate dynamic deferrable loads
        deferLoadValues.forEach((val, idx) => {
          dk[`deferLoad${idx}`] += val * stepH;
        });
        
        // Accumulate optional loads energy deltas
        const prevTs = ts - (5 * 60 * 1000);  // 5-minute interval in milliseconds
        enabledOptionalLoads.forEach((config, idx) => {
          if (config.energyEntity && lookup[config.energyEntity]) {
            const energyMult = _haeo_energyMult(this._hass, config.energyEntity);
            const energyDelta = _haeo_getDelta(lookup[config.energyEntity], ts, prevTs, energyMult);
            dk[`optload${idx}`] += energyDelta;
          }
        });
        
        dk.pv   += solarKw * stepH;
        
        // Grid: import (positive) vs export (negative)
        if (gridKw > 0.1) dk.gridImp += gridKw * stepH;
        if (gridKw < -0.1) dk.gridExp += (-gridKw) * stepH;
        
        // Battery: charge (negative kw) vs discharge (positive kw)
        if (battKw > 0.1) dk.battDis += battKw * stepH;
        if (battKw < -0.1) dk.battChg += (-battKw) * stepH;
        
        // EV: charge (negative kw) vs discharge (positive kw)
        if (evKw > 0.1) dk.evDis += evKw * stepH;
        if (evKw < -0.1) dk.evChg += (-evKw) * stepH;
        
        // EV2: charge (negative kw) vs discharge (positive kw)
        if (ev2Kw > 0.1) dk.ev2Dis += ev2Kw * stepH;
        if (ev2Kw < -0.1) dk.ev2Chg += (-ev2Kw) * stepH;
      }

      // ── Build 2-row day header (Row 1: Import/Charge totals; Row 2: Export/Discharge totals) ──
      const _buildDayHeaderRowPast = (day) => {
        const dayTotal = pastDailyCosts[day] || 0;
        let defaultDk = { load:0, deferLoad:0, pv:0, gridImp:0, gridExp:0, battChg:0, battDis:0, evChg:0, evDis:0, ev2Chg:0, ev2Dis:0 };
        // Add optional load fields to default
        enabledOptionalLoads.forEach((config, idx) => {
          defaultDk[`optload${idx}`] = 0;
        });
        const dk = pastDailyKwh[day] || defaultDk;
        const dayColor = dayTotal <= 0 ? '#4caf50' : '#f44336';
        const dayCostLbl = dayTotal <= 0 ? _HAEO_CUR + Math.abs(dayTotal).toFixed(2) : '-' + _HAEO_CUR + dayTotal.toFixed(2);
        const fmtKd = (v) => Math.abs(v) > 0.001 ? v.toFixed(3) : '—';
        const fmtImp = (v) => Math.abs(v) > 0.001 ? '<span style="color:#f44336;">' + v.toFixed(3) + '</span>' : '—';
        const fmtExp = (v) => Math.abs(v) > 0.001 ? '<span style="color:#4caf50;">' + v.toFixed(3) + '</span>' : '—';
        const fmtBattChg = (v) => Math.abs(v) > 0.001 ? '<span style="color:#4caf50;">' + v.toFixed(3) + '</span>' : '—';
        const fmtBattDis = (v) => Math.abs(v) > 0.001 ? '<span style="color:#f44336;">' + v.toFixed(3) + '</span>' : '—';
        const fmtEV = (v) => Math.abs(v) > 0.001 ? '<span style="color:#4caf50;">' + v.toFixed(2) + '</span>' : '—';
        
        let row1 = '<tr class="dr" style="border-bottom:1px solid var(--divider-color,#444);">' +
          '<td colspan="2">📅 ' + day + '</td>' +
          '<td class="bgl" colspan="2"></td>' +
          '<td class="bgl"></td>' +
          '<td class="bgi" style="text-align:right;">' + fmtKd(dk.load) + '</td>';
        
        // Def. Loads toggle column and optional load cells - Row 1 (only if enabled)
        if (columnSettings.deferLoad !== false) {
          row1 += '<td class="bgl"></td><td class="bgi" style="text-align:right;">—</td>';
          this._deferableLoadsConfig.forEach((config, idx) => {
            row1 += '<td class="bgl"></td><td class="bgi" style="text-align:right;">' + fmtKd(dk[`deferLoad${idx}`]) + '</td>';
          });
        }
        
        // Optional loads columns - display accumulated daily energy
        enabledOptionalLoads.forEach((config, idx) => {
          const optEnergy = dk[`optload${idx}`] || 0;
          row1 += '<td class="bgl"></td>' +
                  '<td class="bgi" style="text-align:right;">' + fmtKd(optEnergy) + '</td>';
        });
        
        row1 += '<td class="bgl"></td>' +
          '<td class="bgi" style="text-align:right;">' + fmtKd(dk.pv) + '</td>' +
          '<td class="bgl" style="font-weight:bold;font-size:9px;color:#666;">Import:</td>' +
          '<td class="bgi" style="text-align:right;">' + fmtImp(dk.gridImp) + '</td>' +
          '<td class="bgl" style="font-weight:bold;font-size:9px;color:#666;">Charge:</td>' +
          '<td class="bgi" style="text-align:right;">' + fmtBattChg(dk.battChg) + '</td>' +
          '<td class="bgi"></td>';
        if (columnSettings.ev !== false) {
          row1 += '<td class="bgl" style="font-weight:bold;font-size:9px;color:#666;">Charge:</td><td class="bgi" style="text-align:right;">' + fmtEV(dk.evChg) + '</td><td class="bgi"></td>';
        }
        if (columnSettings.ev2 !== false) {
          row1 += '<td class="bgl" style="font-weight:bold;font-size:9px;color:#666;">Charge:</td><td class="bgi" style="text-align:right;">' + fmtEV(dk.ev2Chg) + '</td><td class="bgi"></td>';
        }
        row1 += '<td class="bgl" style="text-align:right;color:' + dayColor + ';">' + dayCostLbl + '</td></tr>';
        
        // Row 2 - Export / Discharge totals
        let row2 = '<tr class="dr" style="border-top:1px solid var(--divider-color,#444);">' +
          '<td colspan="2"></td>' +
          '<td class="bgl" colspan="2"></td>' +
          '<td class="bgl"></td>' +
          '<td></td>';
        
        // Def. Loads toggle column - Row 2 (empty cells to maintain alignment, only if enabled)
        if (columnSettings.deferLoad !== false) {
          row2 += '<td></td><td></td>';
        }
        
        // Optional loads columns - Row 2 (empty cells to maintain alignment)
        enabledOptionalLoads.forEach((config, idx) => {
          row2 += '<td></td><td></td>';
        });
        
        row2 += '<td></td>' +
          '<td></td>' +
          '<td class="bgl" style="font-weight:bold;font-size:9px;color:#666;">Export:</td>' +
          '<td class="bgi" style="text-align:right;">' + fmtExp(dk.gridExp) + '</td>' +
          '<td class="bgl" style="font-weight:bold;font-size:9px;color:#666;">Disch:</td>' +
          '<td class="bgi" style="text-align:right;">' + fmtBattDis(dk.battDis) + '</td>' +
          '<td class="bgi"></td>';
        if (columnSettings.ev !== false) {
          row2 += '<td class="bgl" style="font-weight:bold;font-size:9px;color:#666;">Disch:</td><td class="bgi" style="text-align:right;">' + fmtEV(dk.evDis) + '</td><td></td>';
        }
        if (columnSettings.ev2 !== false) {
          row2 += '<td class="bgl" style="font-weight:bold;font-size:9px;color:#666;">Disch:</td><td class="bgi" style="text-align:right;">' + fmtEV(dk.ev2Dis) + '</td><td></td>';
        }
        row2 += '<td></td></tr>';
        return row1 + row2;
      };

      // ── Pass 2: render rows with day header injection ──
      const rows = [];
      let lastDay = '';
      
      // Capture this context for use in row building
      const columnSettings = this._columnSettings;

      for (const ts of entries) {
        const dt      = new Date(ts);
        const dayStr  = dt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = dt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        // Calculate prevTs early so we can compute energy deltas before day header
        const prevTs  = ts - step;

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
        const deferLoadKw = (parseFloat(_haeo_getAt(lookup[this._eid('past_deferrable_load')], ts)) || 0) * this._pwrMult.deferLoad;
        const soc     = parseFloat(_haeo_getAt(lookup[this._eid('haeo_soc')],           ts)) || 0;
        const buyP    = parseFloat(_haeo_getAt(lookup[this._eid('haeo_buy_price')],     ts)) || 0;
        const sellP   = parseFloat(_haeo_getAt(lookup[this._eid('haeo_sell_price')],    ts)) || 0;
        const evKw    = parseFloat(_haeo_getAt(lookup[this._eid('haeo_ev_power')],      ts)) || 0;
        const evSoc   = parseFloat(_haeo_getAt(lookup[this._eid('haeo_ev_soc')],        ts)) || 0;
        const ev2Kw   = parseFloat(_haeo_getAt(lookup[this._eid('haeo_ev2_power')],     ts)) || 0;
        const ev2Soc  = parseFloat(_haeo_getAt(lookup[this._eid('haeo_ev2_soc')],       ts)) || 0;
        
        // Retrieve values for dynamic deferrable loads
        const deferLoadValues = [];
        this._deferableLoadsConfig.forEach((config, idx) => {
          if (config.historicalEntityId && lookup[config.historicalEntityId]) {
            deferLoadValues[idx] = (parseFloat(_haeo_getAt(lookup[config.historicalEntityId], ts)) || 0) * this._pwrMult[`deferLoad${idx}`];
          } else {
            deferLoadValues[idx] = 0;
          }
        });
        
        // Power values already calculated in pre-pass loop (if pre-pass ran)
        
        // Build optional loads kW values for this timestamp (needed for classification & display)
        const optionalLoadsKwValues = [];
        const optionalLoadsEnergyValues = [];
        enabledOptionalLoads.forEach((config, idx) => {
          // Get power value with unit conversion
          if (config.historicalEntity && lookup[config.historicalEntity]) {
            const rawVal = (parseFloat(_haeo_getAt(lookup[config.historicalEntity], ts)) || 0);
            // Apply power multiplier to convert to kW
            const pwrMult = this._pwrMult[`optload${idx}`] || _haeo_powerMult(this._hass, config.historicalEntity);
            optionalLoadsKwValues[idx] = rawVal * pwrMult;
          } else {
            optionalLoadsKwValues[idx] = 0;
          }
          // Energy will be calculated later after prevTs is defined
          optionalLoadsEnergyValues[idx] = 0;
        });

        // Accumulate optional loads energy for daily totals (done in pre-pass above)
        if (!pastDailyKwh[dayStr]) {
          pastDailyKwh[dayStr] = { load:0, deferLoad:0, pv:0, gridImp:0, gridExp:0, battChg:0, battDis:0, evChg:0, evDis:0, ev2Chg:0, ev2Dis:0 };
          enabledOptionalLoads.forEach((config, idx) => {
            pastDailyKwh[dayStr][`optload${idx}`] = 0;
          });
        }
        // Note: optional loads accumulation now happens in pre-pass, so no need to accumulate here

        if (soc === 0 && Math.abs(battKw) < 0.01 && Math.abs(gridKw) < 0.01 && loadKw < 0.01 && solarKw < 0.01) continue;

        const cls = _haeo_classifyPast(solarKw, loadKw, battKw, gridKw, evKw, deferLoadKw, ev2Kw, optionalLoadsKwValues, enabledOptionalLoads);
        const c   = this._colorSettings[cls.color] || _HAEO_COLOURS[cls.color] || { bg: '#ffffcc', txt: '#888888', cost: '#888888' };

        // Grid: positive=import (red=costing), negative=export (green=earning)
        const gridCol = gridKw > 0.1 ? '#f44336' : gridKw < -0.1 ? '#4caf50' : c.txt;
        // Battery display: negate for display (positive kW = charging now shows as positive, negative = discharging)
        // Color: positive=charging, negative=discharging
        // Charging from grid=red, charging from solar=green, discharging=red
        const battDisplay = -battKw;
        const battCol = battDisplay > 0.05 ? (gridKw > 0.05 ? '#f44336' : '#4caf50')  // charging: red if from grid, green if from solar
                      : battDisplay < -0.05 ? '#f44336'  // discharging: red
                      : c.txt;
        
        // EV display: negate for display (positive kW = charging now shows as positive, negative = discharging)
        // Color: discharging to house=amber, discharging to grid=red, charging from solar=green, charging from grid=red
        const evDisplay = -evKw;
        const evCol = evDisplay > 0.05 ? (gridKw < -0.1 ? '#f44336' : '#ff9800')  // discharging: red if to grid, amber if to home
                    : evDisplay < -0.05 ? (gridKw > 0.05 ? '#f44336' : '#4caf50')  // charging: red if from grid, green if from solar
                    : c.txt;
        
        // EV2 same as EV
        const ev2Display = -ev2Kw;
        const ev2Col = ev2Display > 0.05 ? (gridKw < -0.1 ? '#f44336' : '#ff9800')  // discharging: red if to grid, amber if to home
                     : ev2Display < -0.05 ? (gridKw > 0.05 ? '#f44336' : '#4caf50')  // charging: red if from grid, green if from solar
                     : c.txt;
        
        const socCol  = soc <= 20 ? '#f44336' : soc >= 75 ? '#4caf50' : c.txt;

        // Cost for this slot
        const stepH    = 5 / 60;
        const importing = gridKw > 0.1;
        const exporting = gridKw < -0.1;
        const slotCost  = importing ? Math.abs(gridKw) * buyP * stepH : exporting ? gridKw * sellP * stepH : 0;
        const costFmt   = _haeo_fmtCost(slotCost);
        const costCol   = costFmt.col || (slotCost > 0.0001 ? c.cost : c.txt);

        // For light backgrounds, use black text for better contrast
        const isLightBg = c.bg.includes('fff') || c.bg.includes('ffe') || c.bg.includes('ccf');
        const textColor = isLightBg ? '#000' : c.txt;
        const costColorAdapt = isLightBg ? '#000' : costCol;

        // Energy kWh deltas from total_increasing sensors (prevTs already defined above)
        const eLoad   = _haeo_getDelta(lookup[this._eid('past_load_energy')],              ts, prevTs, this._engMult.past_load_energy);
        const eSolar  = _haeo_getDelta(lookup[this._eid('past_solar_energy')],             ts, prevTs, this._engMult.past_solar_energy);
        const eDeferLoad = deferLoadKw * (5 / 60);  // Assume 5-minute intervals for Past Events
        
        // Energy deltas for dynamic deferrable loads
        const eDeferLoadValues = [];
        deferLoadValues.forEach((val, idx) => {
          if (this._engMult[`deferLoad${idx}_energy`]) {
            eDeferLoadValues[idx] = _haeo_getDelta(lookup[this._deferableLoadsConfig[idx].historicalEntityId], ts, prevTs, this._engMult[`deferLoad${idx}_energy`]);
          } else {
            eDeferLoadValues[idx] = val * (5 / 60);  // Fallback: assume 5-minute intervals
          }
        });
        
        // Energy deltas for optional loads
        enabledOptionalLoads.forEach((config, idx) => {
          if (config.energyEntity && lookup[config.energyEntity]) {
            const energyMult = _haeo_energyMult(this._hass, config.energyEntity);
            optionalLoadsEnergyValues[idx] = _haeo_getDelta(lookup[config.energyEntity], ts, prevTs, energyMult);
          } else {
            optionalLoadsEnergyValues[idx] = 0;
          }
        });
        
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
        
        // Build deferrable load emoji label (top 2 or generic if 3+)
        let deferLoadLabel = '';
        const totalDeferLoad = deferLoadValues.reduce((sum, val) => sum + val, 0);
        if (totalDeferLoad >= 0.1) {
          deferLoadLabel = ' ⏰';
        }
        
        const eventLabel = cls.label + deferLoadLabel;
        
        // Collect event labels for dynamic legend (PAST tab)
        if (!this._pastEvents) this._pastEvents = {};
        if (!this._pastEvents[eventLabel]) {
          this._pastEvents[eventLabel] = true;
        }
        
        // Get detailed description from _HAEO_DESCRIPTIONS
        const pastDetailedDesc = _HAEO_DESCRIPTIONS[eventLabel] || _HAEO_DESCRIPTIONS[cls.label] || cls.note || 'Recorded sensor values';

        rows.push('<tr style="background-color:' + c.bg + ';color:' + textColor + ';">' +
          '<td>' + timeStr + '</td>' +
          '<td><span title="' + pastDetailedDesc.replace(/"/g, '&quot;') + '">' + eventLabel + '</span></td>' +
          '<td class="bgl">' + _haeo_fmtP(buyP)   + '</td>' +
          '<td class="bgi">' + _haeo_fmtP(sellP)  + '</td>' +
          '<td class="bgl">' + (loadKw >= _thresholdKw('load') ? loadKw.toFixed(3) : '—')  + '</td>' +
          '<td class="bgi">' + (loadKw >= _thresholdKw('load') ? fmtE(eLoad) : '—')  + '</td>' +
          // Def. Loads toggle column (single entity, not multiple presets)
          (columnSettings.deferLoad !== false ? (
            '<td class="bgl">' + (deferLoadKw >= _thresholdKw('deferLoad') ? deferLoadKw.toFixed(3) : '—') + '</td>' +
            '<td class="bgi">' + (deferLoadKw >= _thresholdKw('deferLoad') ? fmtE(eDeferLoad) : '—') + '</td>'
          ) : '') +
          // Optional loads columns
          enabledOptionalLoads.map((config, idx) => {
            const optKw = optionalLoadsKwValues[idx] || 0;
            const optEnergy = optionalLoadsEnergyValues[idx] || 0;
            const optThreshold = (this._thresholdSettings['optload'] || 10) / 1000; // Convert W to kW
            return '<td class="bgl">' + (optKw > optThreshold ? optKw.toFixed(3) : '—') + '</td>' +
                   '<td class="bgi">' + (optEnergy > 0.001 ? optEnergy.toFixed(3) : '—') + '</td>';
          }).join('') +
          '<td class="bgl">' + (solarKw >= _thresholdKw('pv') ? solarKw.toFixed(3) : '—') + '</td>' +
          '<td class="bgi">' + (solarKw >= _thresholdKw('pv') ? fmtE(eSolar) : '—') + '</td>' +
          '<td class="bgl">' + (Math.abs(gridKw) >= _thresholdKw('grid') ? '<span style="color:' + gridCol + ';">' + gridKw.toFixed(3) + '</span>' : '—') + '</td>' +
          '<td class="bgi">' + (Math.abs(gridKw) >= _thresholdKw('grid') && eGrid !== null && Math.abs(eGrid) > 0.005 ? '<span style="color:' + gridCol + ';">' + eGrid.toFixed(3) + '</span>' : '—') + '</td>' +
          '<td class="bgl">' + (Math.abs(battDisplay) >= _thresholdKw('battery') ? '<span style="color:' + battCol + ';">' + battDisplay.toFixed(3) + '</span>' : '—') + '</td>' +
          '<td class="bgi">' + (Math.abs(battDisplay) >= _thresholdKw('battery') && eBatt !== null && Math.abs(eBatt) > 0.005 ? '<span style="color:' + battCol + ';">' + eBatt.toFixed(3) + '</span>' : '—') + '</td>' +
          '<td class="bgi"><span style="color:' + socCol + ';">' + soc.toFixed(1) + '</span></td>' +
          (columnSettings.ev !== false ?
            '<td class="bgl">' + (evSensorsExist ? (Math.abs(evDisplay) >= _thresholdKw('ev') ? '<span style="color:' + evCol + ';">' + evDisplay.toFixed(3) + '</span>' : '—') : 'x') + '</td>' +
            '<td class="bgi">' + (evSensorsExist ? (Math.abs(evDisplay) >= _thresholdKw('ev') ? '<span style="color:' + evCol + ';">' + fmtE(evDisplay * stepH) + '</span>' : '—') : 'x') + '</td>' +
            '<td class="bgi"><span style="color:' + (evSoc <= 20 ? '#f44336' : evSoc >= 80 ? '#4caf50' : textColor) + ';">' + (evSensorsExist ? (evSoc > 0 ? evSoc.toFixed(1) : '—') : 'x') + '</span></td>'
            : '') +
          (columnSettings.ev2 !== false ?
            '<td class="bgl">' + (ev2SensorsExist ? (Math.abs(ev2Display) >= _thresholdKw('ev2') ? '<span style="color:' + ev2Col + ';">' + ev2Display.toFixed(3) + '</span>' : '—') : 'x') + '</td>' +
            '<td class="bgi">' + (ev2SensorsExist ? (Math.abs(ev2Display) >= _thresholdKw('ev2') ? '<span style="color:' + ev2Col + ';">' + fmtE(ev2Display * stepH) + '</span>' : '—') : 'x') + '</td>' +
            '<td class="bgi"><span style="color:' + (ev2Soc <= 20 ? '#f44336' : ev2Soc >= 80 ? '#4caf50' : textColor) + ';">' + (ev2SensorsExist ? (ev2Soc > 0 ? ev2Soc.toFixed(1) : '—') : 'x') + '</span></td>'
            : '') +
          '<td class="bgl"><span style="color:' + costColorAdapt + ';font-weight:bold;">' + costFmt.disp + '</span></td>' +
          '</tr>');
      }

      tb.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="' + (16 + (columnSettings.deferLoad !== false ? 2 : 0) + (enabledOptionalLoads.length * 2) + (columnSettings.ev !== false ? 3 : 0) + (columnSettings.ev2 !== false ? 3 : 0)) + '" class="msg">⚠️ No readings for this period.</td></tr>';
      
      // Add tooltip handlers to event cells
      if (rows.length) {
        const eventCells = tb.querySelectorAll('td:nth-child(2)');
        eventCells.forEach(cell => {
          const label = cell.textContent.trim();
          if (label && label !== '—') {
            this._addTooltipHandler(cell, label);
          }
        });
      }
      
      requestAnimationFrame(() => this._setWrapHeight());
      const sel2 = this.shadowRoot.getElementById('range-past');
      st.textContent = entries.length + ' readings — ' + (sel2 ? sel2.options[sel2.selectedIndex].text : '');
      this._pastState = 'ready';

    } catch (e) {
      const tb2 = this.shadowRoot.getElementById('tb-past');
      if (tb2) tb2.innerHTML = '<tr><td colspan="20" class="err">⚠️ ' + e.message + '</td></tr>';
      const st2 = this.shadowRoot.getElementById('st-past');
      if (st2) st2.textContent = 'Error — ' + e.message.slice(0, 60);
      this._pastState = 'ready';
    }
  }

  _openSettingsModal() {
    const modal = this.shadowRoot.getElementById('settings-modal');
    if (!modal) return;
    
    // Populate forms from saved config
    this._populateLoadEntitiesForm();
    this._populateOptionalLoadsForm();
    this._populateDeferrableLoadsForm();
    this._populateEntitiesForm();
    
    // CRITICAL FIX: Delay color picker setup to ensure DOM elements exist
    requestAnimationFrame(() => {
      this._populateColorPickers();
    });
    
    modal.style.display = 'flex';
  }

  _closeSettingsModal() {
    const modal = this.shadowRoot.getElementById('settings-modal');
    if (modal) modal.style.display = 'none';
    
    // After closing modal, refresh the visible table with updated colors
    requestAnimationFrame(() => {
      if (this._activeTab === 'future') {
        this._renderFuture();
      } else {
        this._loadPast();
      }
    });
  }

  _updateTableLayout() {
    // Close settings modal
    const modal = this.shadowRoot.getElementById('settings-modal');
    if (modal) modal.style.display = 'none';
    
    const enabledOptionalLoads = this._getEnabledOptionalLoads();
    // Rebuild colgroup and theads for both tabs
    const colgroup = _haeo_buildColgroup(this._columnSettings, this._deferableLoadsConfig, enabledOptionalLoads);
    const thead_future = _haeo_buildThead(this._columnSettings, this._deferableLoadsConfig, enabledOptionalLoads, 'future');
    const thead_past = _haeo_buildThead(this._columnSettings, this._deferableLoadsConfig, enabledOptionalLoads, 'past');
    
    // Update FUTURE header table
    const futureHeaderTable = this.shadowRoot.getElementById('table-future-head');
    if (futureHeaderTable) {
      futureHeaderTable.innerHTML = colgroup + thead_future;
    }
    
    // Update PAST header table
    const pastHeaderTable = this.shadowRoot.getElementById('table-past-head');
    if (pastHeaderTable) {
      pastHeaderTable.innerHTML = colgroup + thead_past;
    }
    
    // Update body table colgroups only (preserve tbody with current data)
    const bodyTables = this.shadowRoot.querySelectorAll('table.dt:not(.dt-head)');
    bodyTables.forEach(table => {
      const oldColgroup = table.querySelector('colgroup');
      const newColgroupEl = document.createElement('colgroup');
      newColgroupEl.innerHTML = colgroup.replace('<colgroup>', '').replace('</colgroup>', '');
      if (oldColgroup) {
        oldColgroup.replaceWith(newColgroupEl);
      } else {
        table.insertBefore(newColgroupEl, table.firstChild);
      }
    });
    
    // Clear _wired flags on old elements so _wireEvents re-attaches
    const allElements = this.shadowRoot.querySelectorAll('[id]');
    allElements.forEach(el => {
      delete el._wired;
    });
    
    // Rebuild data tables with same new column settings
    if (this._activeTab === 'future') {
      this._renderFuture();
    } else {
      this._loadPast();
    }
    
    // Re-wire event handlers for new DOM elements
    requestAnimationFrame(() => {
      this._wireEvents();
      this._setWrapHeight();
    });
  }

  _openLegendModal() {
    const modal = this.shadowRoot.getElementById('legend-modal');
    if (!modal) return;
    
    // Populate dynamic EV/EV2, optional load, and deferrable load filters
    this._populateEVFilters();
    this._populateOptionalLoadFilters();
    this._populateDeferLoadFilters();
    
    this._populateLegendModal();
    modal.style.display = 'flex';
  }
  
  _populateEVFilters() {
    const filterContainer = this.shadowRoot.getElementById('legend-ev-filters');
    if (!filterContainer) return;
    
    filterContainer.innerHTML = '';
    
    const colSettings = this._columnSettings;
    
    // Only add EV filter if enabled
    if (colSettings.ev !== false) {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '6px';
      label.style.cursor = 'pointer';
      label.style.fontSize = '12px';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'filter-ev';
      checkbox.className = 'legend-filter';
      checkbox.checked = true;
      checkbox.style.cursor = 'pointer';
      checkbox.addEventListener('change', () => this._applyLegendFilters());
      
      const text = document.createElement('span');
      text.textContent = '🚗 EV';
      
      label.appendChild(checkbox);
      label.appendChild(text);
      filterContainer.appendChild(label);
    }
    
    // Only add EV2 filter if enabled
    if (colSettings.ev2 !== false) {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '6px';
      label.style.cursor = 'pointer';
      label.style.fontSize = '12px';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'filter-ev2';
      checkbox.className = 'legend-filter';
      checkbox.checked = true;
      checkbox.style.cursor = 'pointer';
      checkbox.addEventListener('change', () => this._applyLegendFilters());
      
      const text = document.createElement('span');
      text.textContent = '🚙 EV2';
      
      label.appendChild(checkbox);
      label.appendChild(text);
      filterContainer.appendChild(label);
    }
  }

  _populateOptionalLoadFilters() {
    const filterContainer = this.shadowRoot.getElementById('legend-optload-filters');
    if (!filterContainer) return;
    
    filterContainer.innerHTML = '';
    
    // Only show filters for enabled optional loads
    const enabledOptionalLoads = this._getEnabledOptionalLoads();
    
    enabledOptionalLoads.forEach((config, idx) => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '6px';
      label.style.cursor = 'pointer';
      label.style.fontSize = '12px';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `filter-optload${idx}`;
      checkbox.className = 'legend-filter';
      checkbox.checked = true;
      checkbox.style.cursor = 'pointer';
      checkbox.addEventListener('change', () => this._applyLegendFilters());
      
      const displayInfo = _haeo_getOptionalLoadDisplay(config);
      const text = document.createElement('span');
      text.textContent = displayInfo.emoji + ' ' + displayInfo.abbr;
      
      label.appendChild(checkbox);
      label.appendChild(text);
      filterContainer.appendChild(label);
    });
  }

  _populateDeferLoadFilters() {
    const filterContainer = this.shadowRoot.getElementById('legend-defer-filters');
    if (!filterContainer) return;
    
    filterContainer.innerHTML = '';
    
    this._deferableLoadsConfig.forEach((config, idx) => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '6px';
      label.style.cursor = 'pointer';
      label.style.fontSize = '12px';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `filter-deferLoad${idx}`;
      checkbox.className = 'legend-filter';
      checkbox.checked = true;
      checkbox.style.cursor = 'pointer';
      checkbox.addEventListener('change', () => this._applyLegendFilters());
      
      const text = document.createElement('span');
      text.textContent = config.emoji + ' ' + config.name;
      
      label.appendChild(checkbox);
      label.appendChild(text);
      filterContainer.appendChild(label);
    });
  }

  _populateLegendModal() {
    const wrap = this.shadowRoot.getElementById('legend-categories-wrap');
    if (!wrap) return;
    
    const categories = {
      'Self Consumption': [],
      'Cost': [],
      'Profit': [],
      'Optional Loads': [],
      'Deferrable Loads': []
    };
    
    // Get enabled column and load settings
    const colSettings = this._columnSettings;
    const evEnabled = colSettings.ev !== false;
    const ev2Enabled = colSettings.ev2 !== false;
    const deferLoadEnabled = colSettings.deferLoad !== false;
    const enabledOptionalLoads = this._getEnabledOptionalLoads();
    
    // Merge FUTURE and PAST events for complete legend
    // Build a map with both event labels and their descriptions
    const eventsMap = {};
    const descMap = {};
    
    if (this._futureEvents) {
      for (const label of Object.keys(this._futureEvents)) {
        eventsMap[label] = true;
        if (this._futureEventDescs && this._futureEventDescs[label]) {
          descMap[label] = this._futureEventDescs[label];
        }
      }
    }
    if (this._pastEvents) {
      for (const label of Object.keys(this._pastEvents)) {
        eventsMap[label] = true;
        if (this._pastEventDescs && this._pastEventDescs[label]) {
          descMap[label] = this._pastEventDescs[label];
        }
      }
    }
    
    // Use merged events if available, otherwise use static descriptions
    const allEventsMap = Object.keys(eventsMap).length > 0 ? 
      eventsMap : 
      _HAEO_DESCRIPTIONS;
    
    // Categorize events
    for (const [label, val] of Object.entries(allEventsMap)) {
      // Get description from collected descriptions or static definitions
      const desc = descMap[label] || _HAEO_DESCRIPTIONS[label] || 'Energy flow event';
      
      // Filter out disabled optional columns from legend
      if (!evEnabled && label.includes('🚗 ')) continue;
      if (!ev2Enabled && label.includes('🚙')) continue;
      if (!deferLoadEnabled && label.includes('⏰')) continue;
      
      // Generate dynamic description if needed
      let finalDesc = desc;
      
      // Check if this is a deferrable load event (contains ⏰)
      if (label.includes('⏰')) {
        finalDesc = 'Deferrable load is active and consuming power';
        // If it's in static descriptions, use that instead
        if (_HAEO_DESCRIPTIONS[label]) {
          finalDesc = _HAEO_DESCRIPTIONS[label];
        }
      }
      
      // Check if this is an optional load event
      for (const config of enabledOptionalLoads) {
        if (label.includes(config.emoji)) {
          const displayInfo = _haeo_getOptionalLoadDisplay(config);
          finalDesc = `${displayInfo.name} is active and consuming power`;
          break;
        }
      }
      
      // Ensure finalDesc is a string
      if (typeof finalDesc !== 'string') {
        finalDesc = 'Energy flow event';
      }
      
      let cat = 'Self Consumption';
      if (finalDesc.includes('low tariff') || finalDesc.includes('cheap') || finalDesc.includes('Cost') || label.includes('Grid Import') || label.includes('Grid →')) {
        cat = 'Cost';
      } else if (finalDesc.includes('peak') || finalDesc.includes('export') || finalDesc.includes('Profit') || label.includes('Grid Export') || label.includes('→ Grid')) {
        cat = 'Profit';
      } else if (label.includes('⏰')) {
        cat = 'Deferrable Loads';
      }
      
      // Detect optional loads in the event label (not EV/EV2/Battery/Solar/Grid/Base Load)
      let isOptionalLoadEvent = false;
      for (const config of enabledOptionalLoads) {
        if (label.includes(config.emoji) && !label.includes('🌞') && !label.includes('🔋') && !label.includes('⚡') && !label.includes('🏠') && !label.includes('🚗') && !label.includes('🚙')) {
          isOptionalLoadEvent = true;
          cat = 'Optional Loads';
          break;
        }
      }
      
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({ label, desc: finalDesc });
    }
    
    // Add deferrable load standalone entries (only if enabled and not already in collected events)
    if (deferLoadEnabled && this._deferableLoadsConfig && this._deferableLoadsConfig.length > 0) {
      this._deferableLoadsConfig.forEach((config, idx) => {
        const labelKey = config.emoji + ' ' + config.name;
        // Only add if not already added from collected events
        if (!eventsMap || !eventsMap[labelKey]) {
          categories['Deferrable Loads'].push({
            label: labelKey,
            desc: 'Deferrable load power usage'
          });
        }
      });
    }
    
    // Add optional load standalone entries (only if any are enabled)
    if (enabledOptionalLoads.length > 0) {
      enabledOptionalLoads.forEach((config, idx) => {
        const displayInfo = _haeo_getOptionalLoadDisplay(config);
        const labelKey = displayInfo.emoji + ' ' + displayInfo.name;
        // Only add if not already added from collected events
        if (!eventsMap || !eventsMap[labelKey]) {
          categories['Optional Loads'].push({
            label: labelKey,
            desc: 'Optional load power usage'
          });
        }
      });
    }
    
    // Sort items alphabetically within each category
    for (const cat in categories) {
      if (categories[cat].length > 0) {
        categories[cat].sort((a, b) => a.label.localeCompare(b.label));
      }
    }
    
    let html = '';
    for (const [cat, events] of Object.entries(categories)) {
      if (events.length === 0) continue;
      html += '<div class="legend-category">' +
        '<div class="legend-category-title">' + cat + ' (' + events.length + ')</div>';
      
      for (const { label, desc } of events) {
        const color = this._getColorForLabel(label);
        // Generate detailed tooltip from label
        const tooltip = this._generateDescriptionFromLabel(label) || desc;
        html += '<div class="legend-item" title="' + tooltip.replace(/"/g, '&quot;') + '">' +
          '<div class="legend-item-color" style="background:' + color + ';"></div>' +
          '<div class="legend-item-content">' +
          '<div class="legend-item-label">' + label + '</div>' +
          '<div class="legend-item-desc">' + desc + '</div>' +
          '</div>' +
          '</div>';
      }
      html += '</div>';
    }
    wrap.innerHTML = html;
  }

  _applyLegendFilters() {
    const colSettings = this._columnSettings;
    const evEnabled = colSettings.ev !== false;
    const ev2Enabled = colSettings.ev2 !== false;
    const deferLoadEnabled = colSettings.deferLoad !== false;
    
    const solarChecked = this.shadowRoot.getElementById('filter-solar')?.checked ?? true;
    const batteryChecked = this.shadowRoot.getElementById('filter-battery')?.checked ?? true;
    const gridChecked = this.shadowRoot.getElementById('filter-grid')?.checked ?? true;
    const evChecked = evEnabled && (this.shadowRoot.getElementById('filter-ev')?.checked ?? true);
    const ev2Checked = ev2Enabled && (this.shadowRoot.getElementById('filter-ev2')?.checked ?? true);

    // Get optional load filter states (only for enabled loads)
    const optionalLoadChecked = {};
    const enabledOptionalLoads = this._getEnabledOptionalLoads();
    enabledOptionalLoads.forEach((config, idx) => {
      optionalLoadChecked[idx] = this.shadowRoot.getElementById(`filter-optload${idx}`)?.checked ?? true;
    });

    // Get deferrable load filter states (only if enabled)
    const deferLoadChecked = {};
    if (deferLoadEnabled) {
      this._deferableLoadsConfig.forEach((config, idx) => {
        deferLoadChecked[idx] = this.shadowRoot.getElementById(`filter-deferLoad${idx}`)?.checked ?? true;
      });
    }

    const items = this.shadowRoot.querySelectorAll('.legend-item');
    items.forEach(item => {
      const label = item.querySelector('.legend-item-label')?.textContent || '';
      
      // Check which power sources are in this label
      const hasSolar = label.includes('🌞');
      const hasBattery = label.includes('🔋');
      const hasGrid = label.includes('⚡');
      const hasEV = label.includes('🚗');
      const hasEV2 = label.includes('🚙');
      
      // Check for optional load emojis
      let hasOptionalLoad = false;
      let optionalLoadIdx = -1;
      enabledOptionalLoads.forEach((config, idx) => {
        if (label.includes(config.emoji)) {
          hasOptionalLoad = true;
          optionalLoadIdx = idx;
        }
      });
      
      // Check for deferrable load emojis
      let hasDeferLoad = false;
      let deferLoadIdx = -1;
      if (deferLoadEnabled) {
        this._deferableLoadsConfig.forEach((config, idx) => {
          if (label.includes(config.emoji)) {
            hasDeferLoad = true;
            deferLoadIdx = idx;
          }
        });
      }

      // Auto-hide if column is not enabled
      if (hasEV && !evEnabled) {
        item.style.display = 'none';
        return;
      }
      if (hasEV2 && !ev2Enabled) {
        item.style.display = 'none';
        return;
      }
      if (hasDeferLoad && !deferLoadEnabled) {
        item.style.display = 'none';
        return;
      }

      // Show if ANY selected source is in this label
      let shouldShow = (hasSolar && solarChecked) || 
                       (hasBattery && batteryChecked) || 
                       (hasGrid && gridChecked) || 
                       (hasEV && evChecked) ||
                       (hasEV2 && ev2Checked);
      
      // Also check optional loads
      if (hasOptionalLoad && optionalLoadIdx >= 0) {
        shouldShow = shouldShow || optionalLoadChecked[optionalLoadIdx];
      }
      
      // Also check deferrable loads
      if (hasDeferLoad && deferLoadIdx >= 0) {
        shouldShow = shouldShow || deferLoadChecked[deferLoadIdx];
      }
      
      item.style.display = shouldShow ? 'flex' : 'none';
    });
  }

  _getColorForLabel(label) {
    // Map event labels to their display colors based on event type
    // Prioritize user customizations (_colorSettings) over defaults (_HAEO_COLOURS)
    
    if (label.includes('⏰')) return '#e1bee7'; // purple for generic deferrable loads
    
    // Check if it's an optional load emoji
    const enabledOptionalLoads = this._getEnabledOptionalLoads();
    for (const config of enabledOptionalLoads) {
      if (label.includes(config.emoji)) {
        return '#fff9c4'; // light yellow for optional loads
      }
    }
    
    // Check if it's a deferrable load emoji
    for (const config of this._deferableLoadsConfig) {
      if (label.includes(config.emoji)) {
        return config.color?.bg || '#e1bee7'; // Use configured color or purple default
      }
    }
    
    // Helper to get color from _colorSettings first, then fall back to _HAEO_COLOURS
    const getEventColor = (colorKey) => {
      return this._colorSettings?.[colorKey]?.bg || _HAEO_COLOURS[colorKey]?.bg || '#ffffff';
    };
    
    if (label.includes('🌞') && !label.includes('Grid') && !label.includes('⚡')) return getEventColor('self_consumption');
    if (label.includes('→ ⚡ Grid') && label.includes('🌞')) return getEventColor('forced_export');
    if (label.includes('→ ⚡ Grid')) return getEventColor('cost');
    if (label.includes('⚡ Grid →') && label.includes('Force')) return getEventColor('loss');
    if (label.includes('⚡ Grid →')) return getEventColor('loss');
    if (label.includes('🔋')) return getEventColor('battery');
    return getEventColor('profit');
  }

  _addTooltipHandler(eventCell, label) {
    // Always generate description from the label itself, which includes all components
    // (Solar, Battery, Grid, loads, optional loads, deferrable loads, etc.)
    let desc = this._generateDescriptionFromLabel(label);
    
    if (!desc) return;
    
    eventCell.addEventListener('mouseenter', (e) => {
      const tooltip = this.shadowRoot.querySelector('.tooltip');
      if (tooltip) tooltip.remove();
      
      const newTooltip = document.createElement('div');
      newTooltip.className = 'tooltip';
      newTooltip.textContent = desc;
      
      const rect = eventCell.getBoundingClientRect();
      const cardRect = this.shadowRoot.host.getBoundingClientRect();
      
      newTooltip.style.position = 'fixed';
      newTooltip.style.left = (rect.left) + 'px';
      newTooltip.style.top = (rect.bottom + 4) + 'px';
      
      this.shadowRoot.appendChild(newTooltip);
      
      setTimeout(() => {
        if (this.shadowRoot.contains(newTooltip)) {
          newTooltip.remove();
        }
      }, 5000);
    });
    
    eventCell.addEventListener('mouseleave', () => {
      const tooltip = this.shadowRoot.querySelector('.tooltip');
      if (tooltip) tooltip.remove();
    });
  }

  _generateDescriptionFromLabel(label) {
    // Build a detailed description from the event label, properly parsing sources vs loads
    let desc = '';
    const enabledOptionalLoads = this._getEnabledOptionalLoads();
    
    // Split by arrow to get sources and loads/destinations
    const arrowIndex = label.indexOf('→');
    if (arrowIndex === -1) {
      return 'Energy flow event'; // No arrow, can't parse
    }
    
    const sourcePart = label.substring(0, arrowIndex).trim();
    const loadPart = label.substring(arrowIndex + 1).trim();
    
    // Extract sources (before arrow)
    const sources = [];
    if (sourcePart.includes('🌞')) sources.push('Solar');
    if (sourcePart.includes('⚡')) sources.push('Grid (import)');
    if (sourcePart.includes('🔋')) sources.push('Battery');
    
    // Extract loads/destinations (after arrow)
    const loads = [];
    if (loadPart.includes('🏠')) loads.push('Base Load');
    if (loadPart.includes('🚗')) loads.push('EV');
    if (loadPart.includes('🚙')) loads.push('EV2');
    if (loadPart.includes('⏰')) loads.push('Deferrable Loads');
    if (loadPart.includes('🔋')) loads.push('Battery');
    if (loadPart.includes('⚡')) loads.push('Grid (export)');
    
    // Check for optional loads in load part only
    for (const config of enabledOptionalLoads) {
      if (loadPart.includes(config.emoji)) {
        const displayInfo = _haeo_getOptionalLoadDisplay(config);
        loads.push(displayInfo.name);
      }
    }
    
    // Build description
    if (sources.length > 0 && loads.length > 0) {
      desc = sources.join(' + ') + ' → ' + loads.join(' + ');
    } else if (sources.length > 0) {
      desc = sources.join(' + ') + ' (no destination)';
    } else if (loads.length > 0) {
      desc = 'Unknown source → ' + loads.join(' + ');
    }
    
    return desc || 'Energy flow event';
  }

  // Render deferrable loads configuration UI
  _renderDeferableLoadsConfig() {
    const container = this.shadowRoot.getElementById('defer-loads-config');
    if (!container) return;
    
    container.innerHTML = '';
    
    this._deferableLoadsConfig.forEach((config, idx) => {
      const item = document.createElement('div');
      item.className = 'defer-load-config-item';
      item.id = `defer-config-${idx}`;
      
      let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--divider-color);">
          <div style="font-size:12px;font-weight:bold;">Deferrable Load ${idx + 1}</div>
          <button data-idx="${idx}" class="defer-config-remove" style="background:none;border:none;color:#ff6b6b;cursor:pointer;font-size:16px;" title="Remove">✕</button>
        </div>
        
        <!-- Main grid: Name/Emoji/Threshold on left, Colours on right -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:12px;">
          <!-- Left side: Name, Emoji, Threshold -->
          <div>
            <div style="display:grid;grid-template-columns:2fr 80px 120px;gap:12px;margin-bottom:12px;">
              <div>
                <label style="font-size:11px;margin-bottom:4px;display:block;">Name</label>
                <select id="defer-name-${idx}" class="defer-name-select" data-idx="${idx}" style="width:100%;padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;">
                  <option value="">Select...</option>
        `;
        
        // Add presets
        _HAEO_DEFERRABLE_PRESETS.forEach(preset => {
          const selected = config.name === preset.name ? 'selected' : '';
          html += `<option value="${preset.name}" ${selected}>${preset.emoji} ${preset.displayName}</option>`;
        });
        
        html += `
                  <option value="custom">✏️ Custom</option>
                </select>
                <input type="text" id="defer-name-custom-${idx}" class="defer-name-custom" data-idx="${idx}" placeholder="Custom name" value="${config.name}" style="width:100%;padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;margin-top:4px;display:none;" />
              </div>
              <div>
                <label style="font-size:11px;margin-bottom:4px;display:block;">Emoji</label>
                <button id="defer-emoji-${idx}" class="emoji-picker-btn defer-emoji-btn" data-idx="${idx}" style="width:100%;padding:6px;font-size:18px;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;">${config.emoji}</button>
              </div>
              <div>
                <label style="font-size:11px;margin-bottom:4px;display:block;">Threshold (W)</label>
                <input type="number" id="defer-threshold-${idx}" class="defer-threshold-input" data-idx="${idx}" min="0" step="10" value="${config.threshold !== undefined ? config.threshold : 50}" style="width:100%;padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;" />
              </div>
            </div>
            
            <!-- Forecast Entity -->
            <div style="margin-bottom:12px;">
              <label style="font-size:11px;margin-bottom:4px;display:block;">Forecast Entity (FUTURE tab)</label>
              <div style="position:relative;">
                <input type="text" id="defer-entity-forecast-${idx}" class="defer-entity-forecast" data-idx="${idx}" placeholder="Search..." value="${config.forecastEntityId || ''}" style="width:100%;padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;" autocomplete="off" />
                <div id="defer-entity-forecast-list-${idx}" class="entity-dropdown-list" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:200px;overflow-y:auto;background:var(--card-background-color);border:1px solid var(--divider-color);border-top:none;border-radius:0 0 4px 4px;z-index:100;"></div>
              </div>
            </div>
            
            <!-- Historical Entity -->
            <div>
              <label style="font-size:11px;margin-bottom:4px;display:block;">Historical Entity (PAST tab)</label>
              <div style="position:relative;">
                <input type="text" id="defer-entity-historical-${idx}" class="defer-entity-historical" data-idx="${idx}" placeholder="Search..." value="${config.historicalEntityId || ''}" style="width:100%;padding:6px;font-size:12px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;" autocomplete="off" />
                <div id="defer-entity-historical-list-${idx}" class="entity-dropdown-list" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:200px;overflow-y:auto;background:var(--card-background-color);border:1px solid var(--divider-color);border-top:none;border-radius:0 0 4px 4px;z-index:100;"></div>
              </div>
            </div>
          </div>
          
          <!-- Right side: Colours -->
          <div>
            <label style="font-size:11px;margin-bottom:8px;display:block;font-weight:bold;">Colours</label>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <label style="font-size:11px;min-width:50px;">Background:</label>
                <input type="color" id="defer-color-bg-${idx}" class="defer-color-bg" data-idx="${idx}" value="${config.color?.bg || '#d4c5f9'}" style="width:50px;height:35px;cursor:pointer;border-radius:4px;border:1px solid var(--divider-color);" />
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <label style="font-size:11px;min-width:50px;">Text:</label>
                <input type="color" id="defer-color-txt-${idx}" class="defer-color-txt" data-idx="${idx}" value="${config.color?.txt || '#4527a0'}" style="width:50px;height:35px;cursor:pointer;border-radius:4px;border:1px solid var(--divider-color);" />
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <label style="font-size:11px;min-width:50px;">Cost:</label>
                <input type="color" id="defer-color-cost-${idx}" class="defer-color-cost" data-idx="${idx}" value="${config.color?.cost || '#4527a0'}" style="width:50px;height:35px;cursor:pointer;border-radius:4px;border:1px solid var(--divider-color);" />
              </div>
            </div>
          </div>
        </div>
      `;
      
      item.innerHTML = html;
      container.appendChild(item);
    });
    
    // Wire up deferrable loads event handlers
    this._wireDeferableLoadsHandlers();
  }

  // Wire deferrable loads handlers
  _wireDeferableLoadsHandlers() {
    // Name select handlers
    this.shadowRoot.querySelectorAll('.defer-name-select').forEach(sel => {
      if (!sel._wired) {
        sel._wired = true;
        const idx = parseInt(sel.dataset.idx);
        sel.addEventListener('change', () => {
          const customInput = this.shadowRoot.getElementById(`defer-name-custom-${idx}`);
          const forecastInput = this.shadowRoot.getElementById(`defer-entity-forecast-${idx}`);
          if (sel.value === 'custom') {
            customInput.style.display = 'block';
            customInput.value = '';
            this._deferableLoadsConfig[idx].name = '';
          } else if (sel.value) {
            const preset = _HAEO_DEFERRABLE_PRESETS.find(p => p.name === sel.value);
            if (preset) {
              this._deferableLoadsConfig[idx].name = preset.name;
              this._deferableLoadsConfig[idx].emoji = preset.emoji;
              // Auto-generate forecast entity ID
              const autoGenerated = this._generateForecastEntityId(preset.name);
              this._deferableLoadsConfig[idx].forecastEntityId = autoGenerated;
              if (forecastInput) forecastInput.value = autoGenerated;
              customInput.style.display = 'none';
            }
          }
        });
      }
    });
    
    // Custom name handlers
    this.shadowRoot.querySelectorAll('.defer-name-custom').forEach(input => {
      if (!input._wired) {
        input._wired = true;
        const idx = parseInt(input.dataset.idx);
        input.addEventListener('change', () => {
          this._deferableLoadsConfig[idx].name = input.value;
          // Auto-generate forecast entity ID
          const autoGenerated = this._generateForecastEntityId(input.value);
          this._deferableLoadsConfig[idx].forecastEntityId = autoGenerated;
          const forecastInput = this.shadowRoot.getElementById(`defer-entity-forecast-${idx}`);
          if (forecastInput) forecastInput.value = autoGenerated;
        });
      }
    });
    
    // Forecast entity autocomplete handlers
    this.shadowRoot.querySelectorAll('.defer-entity-forecast').forEach(input => {
      if (!input._wired) {
        input._wired = true;
        const idx = parseInt(input.dataset.idx);
        
        // Set initial value to auto-generated if empty
        if (!input.value && this._deferableLoadsConfig[idx].name) {
          const autoGenerated = this._generateForecastEntityId(this._deferableLoadsConfig[idx].name);
          input.value = autoGenerated;
          this._deferableLoadsConfig[idx].forecastEntityId = autoGenerated;
        }
        
        input.addEventListener('input', (e) => {
          const query = e.target.value.toLowerCase();
          const listDiv = this.shadowRoot.getElementById(`defer-entity-forecast-list-${idx}`);
          
          if (query.length < 1) {
            listDiv.style.display = 'none';
            return;
          }
          
          // Get forecast load entities from HA
          const forecastEntities = this._getAvailableForecastEntities();
          const filtered = forecastEntities.filter(s => s.toLowerCase().includes(query)).slice(0, 10);
          
          if (filtered.length === 0) {
            listDiv.style.display = 'none';
            return;
          }
          
          listDiv.innerHTML = filtered.map(entity => 
            `<div class="entity-option" data-entity="${entity}" style="padding:8px;border-bottom:1px solid var(--divider-color);cursor:pointer;font-size:12px;" title="${entity}">${entity}</div>`
          ).join('');
          
          listDiv.style.display = 'block';
          
          // Wire option clicks
          listDiv.querySelectorAll('.entity-option').forEach(opt => {
            opt.addEventListener('click', () => {
              input.value = opt.dataset.entity;
              this._deferableLoadsConfig[idx].forecastEntityId = opt.dataset.entity;
              listDiv.style.display = 'none';
            });
          });
        });
        
        input.addEventListener('blur', () => {
          setTimeout(() => {
            const listDiv = this.shadowRoot.getElementById(`defer-entity-forecast-list-${idx}`);
            if (listDiv) listDiv.style.display = 'none';
          }, 200);
        });
        
        input.addEventListener('change', () => {
          this._deferableLoadsConfig[idx].forecastEntityId = input.value;
        });
      }
    });
    
    // Historical entity autocomplete handlers
    this.shadowRoot.querySelectorAll('.defer-entity-historical').forEach(input => {
      if (!input._wired) {
        input._wired = true;
        const idx = parseInt(input.dataset.idx);
        input.addEventListener('input', (e) => {
          const query = e.target.value.toLowerCase();
          const listDiv = this.shadowRoot.getElementById(`defer-entity-historical-list-${idx}`);
          
          if (query.length < 1) {
            listDiv.style.display = 'none';
            return;
          }
          
          // Get power sensors from HA
          const sensors = this._getAvailablePowerSensors();
          const filtered = sensors.filter(s => s.toLowerCase().includes(query)).slice(0, 10);
          
          if (filtered.length === 0) {
            listDiv.style.display = 'none';
            return;
          }
          
          listDiv.innerHTML = filtered.map(sensor => 
            `<div class="entity-option" data-entity="${sensor}" style="padding:8px;border-bottom:1px solid var(--divider-color);cursor:pointer;font-size:12px;" title="${sensor}">${sensor}</div>`
          ).join('');
          
          listDiv.style.display = 'block';
          
          // Wire option clicks
          listDiv.querySelectorAll('.entity-option').forEach(opt => {
            opt.addEventListener('click', () => {
              input.value = opt.dataset.entity;
              this._deferableLoadsConfig[idx].historicalEntityId = opt.dataset.entity;
              listDiv.style.display = 'none';
            });
          });
        });
        
        input.addEventListener('blur', () => {
          setTimeout(() => {
            const listDiv = this.shadowRoot.getElementById(`defer-entity-historical-list-${idx}`);
            if (listDiv) listDiv.style.display = 'none';
          }, 200);
        });
        
        input.addEventListener('change', () => {
          this._deferableLoadsConfig[idx].historicalEntityId = input.value;
        });
      }
    });
    
    // Emoji button handlers
    this.shadowRoot.querySelectorAll('.defer-emoji-btn').forEach(btn => {
      if (!btn._wired) {
        btn._wired = true;
        const idx = parseInt(btn.dataset.idx);
        btn.addEventListener('click', () => {
          this._openEmojiPicker(idx);
        });
      }
    });
    
    // Threshold input handlers
    this.shadowRoot.querySelectorAll('.defer-threshold-input').forEach(input => {
      if (!input._wired) {
        input._wired = true;
        const idx = parseInt(input.dataset.idx);
        input.addEventListener('change', () => {
          const val = parseInt(input.value);
          this._deferableLoadsConfig[idx].threshold = (val !== undefined && val !== null) ? val : 50;
          this._thresholdSettings[`deferLoad${idx}`] = this._deferableLoadsConfig[idx].threshold;
        });
      }
    });
    
    // Color pickers
    this.shadowRoot.querySelectorAll('.defer-color-bg').forEach(input => {
      if (!input._wired) {
        input._wired = true;
        const idx = parseInt(input.dataset.idx);
        if (!this._deferableLoadsConfig[idx].color) {
          this._deferableLoadsConfig[idx].color = { bg: '#d4c5f9', txt: '#4527a0', cost: '#4527a0' };
        }
        input.addEventListener('change', () => {
          this._deferableLoadsConfig[idx].color.bg = input.value;
        });
      }
    });
    
    this.shadowRoot.querySelectorAll('.defer-color-txt').forEach(input => {
      if (!input._wired) {
        input._wired = true;
        const idx = parseInt(input.dataset.idx);
        if (!this._deferableLoadsConfig[idx].color) {
          this._deferableLoadsConfig[idx].color = { bg: '#d4c5f9', txt: '#4527a0', cost: '#4527a0' };
        }
        input.addEventListener('change', () => {
          this._deferableLoadsConfig[idx].color.txt = input.value;
        });
      }
    });
    
    this.shadowRoot.querySelectorAll('.defer-color-cost').forEach(input => {
      if (!input._wired) {
        input._wired = true;
        const idx = parseInt(input.dataset.idx);
        if (!this._deferableLoadsConfig[idx].color) {
          this._deferableLoadsConfig[idx].color = { bg: '#d4c5f9', txt: '#4527a0', cost: '#4527a0' };
        }
        input.addEventListener('change', () => {
          this._deferableLoadsConfig[idx].color.cost = input.value;
        });
      }
    });
    
    // Remove buttons
    this.shadowRoot.querySelectorAll('.defer-config-remove').forEach(btn => {
      if (!btn._wired) {
        btn._wired = true;
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          this._deferableLoadsConfig.splice(idx, 1);
          const deferLoadCount = this.shadowRoot.getElementById('defer-load-count');
          if (deferLoadCount) deferLoadCount.value = this._deferableLoadsConfig.length;
          this._renderDeferableLoadsConfig();
        });
      }
    });
  }

  // Generate forecast entity ID from name
  _generateForecastEntityId(name) {
    if (!name) return '';
    // Convert to lowercase, replace spaces and special chars with underscores
    return 'number.' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_load_forecast';
  }

  // Get available forecast load entities from HA
  _getAvailableForecastEntities() {
    if (!this._hass || !this._hass.states) return [];
    
    const entities = [];
    for (const entityId of Object.keys(this._hass.states)) {
      if (entityId.startsWith('number.') && entityId.includes('_load_forecast')) {
        entities.push(entityId);
      }
    }
    
    return entities.sort();
  }

  // Get available power sensors from HA
  _getAvailablePowerSensors() {
    if (!this._hass || !this._hass.states) return [];
    
    const sensors = [];
    const powerUnits = ['W', 'kW', 'MW'];
    
    for (const [entityId, state] of Object.entries(this._hass.states)) {
      // Check for sensor.*_power, sensor.*_apparent_power, sensor.*_active_power
      if (!entityId.startsWith('sensor.')) continue;
      if (state.attributes && powerUnits.includes(state.attributes.unit_of_measurement)) {
        sensors.push(entityId);
      }
    }
    
    return sensors.sort();
  }

  // Open emoji picker for deferrable load

  // Save optional loads configuration from form inputs
  _saveOptionalLoadsConfig() {
    const config = [];
    for (let i = 0; i < 10; i++) {
      const enableCheckbox = this.shadowRoot.getElementById(`optload-enable-${i}`);
      const emojiSelect = this.shadowRoot.getElementById(`optload-emoji-${i}`);
      const loadNameSelect = this.shadowRoot.getElementById(`optload-preset-${i}`);
      const customNameInput = this.shadowRoot.getElementById(`optload-customname-${i}`);
      const forecastInput = this.shadowRoot.getElementById(`optload-forecast-${i}`);
      const historicalInput = this.shadowRoot.getElementById(`optload-historical-${i}`);
      const energyInput = this.shadowRoot.getElementById(`optload-energy-${i}`);
      const thresholdInput = this.shadowRoot.getElementById(`optload-threshold-${i}`);
      
      if (enableCheckbox && emojiSelect && loadNameSelect && forecastInput && historicalInput) {
        const entry = {
          enabled: enableCheckbox.checked,
          emoji: emojiSelect.value || '🔌',
          loadName: loadNameSelect.value || '',
          customName: customNameInput ? customNameInput.value || '' : '',
          forecastEntity: forecastInput.value || '',
          historicalEntity: historicalInput.value || '',
          energyEntity: energyInput ? energyInput.value || '' : '',
          threshold: thresholdInput ? parseInt(thresholdInput.value) || 10 : 10
        };
        config.push(entry);
      }
    }
    
    try {
      localStorage.setItem('haeo-events-card-optional-loads', JSON.stringify(config));
    } catch (e) {
    }
    return config;
  }

  // Load optional loads configuration from localStorage
  _loadOptionalLoadsConfig() {
    try {
      const saved = localStorage.getItem('haeo-events-card-optional-loads');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  // Save all load entity configurations
  _saveLoadEntitiesConfig() {
    const loads = {
      base: { forecast: this.shadowRoot.getElementById('load-forecast')?.value || '', historical: this.shadowRoot.getElementById('load-historical')?.value || '', energy: this.shadowRoot.getElementById('load-energy')?.value || '' },
      pv: { forecast: this.shadowRoot.getElementById('pv-forecast')?.value || '', historical: this.shadowRoot.getElementById('pv-historical')?.value || '', energy: this.shadowRoot.getElementById('pv-energy')?.value || '' },
      grid: { forecast: this.shadowRoot.getElementById('grid-forecast')?.value || '', historical: this.shadowRoot.getElementById('grid-historical')?.value || '', energy: this.shadowRoot.getElementById('grid-energy')?.value || '', energyExport: this.shadowRoot.getElementById('grid-energy-export')?.value || '' },
      battery: { forecast: this.shadowRoot.getElementById('battery-forecast')?.value || '', historical: this.shadowRoot.getElementById('battery-historical')?.value || '', energy: this.shadowRoot.getElementById('battery-energy')?.value || '', energyDischarge: this.shadowRoot.getElementById('battery-energy-discharge')?.value || '' },
      ev: { forecast: this.shadowRoot.getElementById('ev-forecast')?.value || '', historical: this.shadowRoot.getElementById('ev-historical')?.value || '', energy: this.shadowRoot.getElementById('ev-energy')?.value || '', energyDischarge: this.shadowRoot.getElementById('ev-energy-discharge')?.value || '' },
      ev2: { forecast: this.shadowRoot.getElementById('ev2-forecast')?.value || '', historical: this.shadowRoot.getElementById('ev2-historical')?.value || '', energy: this.shadowRoot.getElementById('ev2-energy')?.value || '', energyDischarge: this.shadowRoot.getElementById('ev2-energy-discharge')?.value || '' }
    };
    try {
      localStorage.setItem('haeo-events-card-load-entities', JSON.stringify(loads));
    } catch (e) {
    }
    return loads;
  }

  // Load all load entity configurations
  _loadLoadEntitiesConfig() {
    try {
      const saved = localStorage.getItem('haeo-events-card-load-entities');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
    }
    return {
      base: { forecast: 'sensor.load_power', historical: 'sensor.sigen_plant_total_load_power', energy: 'sensor.sigen_plant_total_load_consumption' },
      pv: { forecast: 'sensor.solar_power', historical: 'sensor.sigen_plant_pv_power', energy: 'sensor.sigen_plant_total_pv_generation' },
      grid: { forecast: 'sensor.grid_active_power', historical: 'sensor.sigen_plant_grid_active_power', energy: 'sensor.sigen_plant_total_imported_energy', energyExport: 'sensor.sigen_plant_total_exported_energy' },
      battery: { forecast: 'sensor.battery_active_power', historical: 'sensor.sigen_plant_battery_power', energy: 'sensor.sigen_plant_daily_battery_charge_energy', energyDischarge: 'sensor.sigen_plant_daily_battery_discharge_energy' },
      ev: { forecast: 'sensor.ev_active_power', historical: 'sensor.sigen_ac_charger_charging_power', energy: '', energyDischarge: '' },
      ev2: { forecast: 'sensor.ev2_active_power', historical: 'sensor.sigen_ac_charger_charging_power_2', energy: '', energyDischarge: '' }
    };
  }

  // Populate load entity form from saved config
  _populateLoadEntitiesForm() {
    const config = this._loadLoadEntitiesConfig();
    
    // Map load names to their input IDs (base -> load, others direct)
    const loadMap = { base: 'load', pv: 'pv', grid: 'grid', battery: 'battery', ev: 'ev', ev2: 'ev2' };
    
    Object.keys(loadMap).forEach(loadName => {
      const inputId = loadMap[loadName];
      const forecastInput = this.shadowRoot.getElementById(`${inputId}-forecast`);
      const historicalInput = this.shadowRoot.getElementById(`${inputId}-historical`);
      const energyInput = this.shadowRoot.getElementById(`${inputId}-energy`);
      if (forecastInput && config[loadName]) {
        forecastInput.value = config[loadName].forecast || '';
      }
      if (historicalInput && config[loadName]) {
        historicalInput.value = config[loadName].historical || '';
      }
      if (energyInput && config[loadName]) {
        energyInput.value = config[loadName].energy || '';
      }
    });
    
    // Handle special export/discharge energy fields
    const gridExportInput = this.shadowRoot.getElementById('grid-energy-export');
    if (gridExportInput && config.grid) {
      gridExportInput.value = config.grid.energyExport || '';
    }
    
    const batteryDischargeInput = this.shadowRoot.getElementById('battery-energy-discharge');
    if (batteryDischargeInput && config.battery) {
      batteryDischargeInput.value = config.battery.energyDischarge || '';
    }
    
    const evDischargeInput = this.shadowRoot.getElementById('ev-energy-discharge');
    if (evDischargeInput && config.ev) {
      evDischargeInput.value = config.ev.energyDischarge || '';
    }
    
    const ev2DischargeInput = this.shadowRoot.getElementById('ev2-energy-discharge');
    if (ev2DischargeInput && config.ev2) {
      ev2DischargeInput.value = config.ev2.energyDischarge || '';
    }
  }

  // Save deferrable loads entity configuration
  _saveDeferrableLoadsConfig() {
    const forecastInput = this.shadowRoot.getElementById('deferLoad-forecast');
    const historicalInput = this.shadowRoot.getElementById('deferLoad-historical');
    const energyInput = this.shadowRoot.getElementById('deferLoad-energy');
    

    if (forecastInput && historicalInput && energyInput) {
      const config = {
        forecastEntity: forecastInput.value || '',
        historicalEntity: historicalInput.value || '',
        energyEntity: energyInput.value || ''
      };
      try {
        localStorage.setItem('haeo-events-card-deferrable-loads-entities', JSON.stringify(config));
      } catch (e) {
      }
      return config;
    }
    return {};
  }

  // Load deferrable loads entity configuration
  _loadDeferrableLoadsConfig() {
    try {
      const saved = localStorage.getItem('haeo-events-card-deferrable-loads-entities');
      if (saved) {
        const config = JSON.parse(saved);
        return config;
      }
    } catch (e) {
    }
    const defaults = { forecastEntity: '', historicalEntity: '', energyEntity: '' };
    return defaults;
  }

  // Populate deferrable loads form from saved config
  _populateDeferrableLoadsForm() {
    const config = this._loadDeferrableLoadsConfig();
    const forecastInput = this.shadowRoot.getElementById('deferLoad-forecast');
    const historicalInput = this.shadowRoot.getElementById('deferLoad-historical');
    const energyInput = this.shadowRoot.getElementById('deferLoad-energy');
    
    if (forecastInput) {
      forecastInput.value = config.forecastEntity || '';
    }
    if (historicalInput) {
      historicalInput.value = config.historicalEntity || '';
    }
    if (energyInput) {
      energyInput.value = config.energyEntity || '';
    }
  }

  _populateEntitiesForm() {
    const savedEntities = localStorage.getItem('haeo-events-card-entities');
    let weatherEntity = 'weather.forecast_home';
    let curtailmentEntity = 'switch.solar_curtailment';
    
    if (savedEntities) {
      try {
        const ents = JSON.parse(savedEntities);
        if (ents.weatherEntity) weatherEntity = ents.weatherEntity;
        if (ents.curtailmentEntity) curtailmentEntity = ents.curtailmentEntity;
      } catch(e) {}
    }
    
    const weatherInput = this.shadowRoot.getElementById('weather-entity-input');
    const curtailmentInput = this.shadowRoot.getElementById('curtailment-entity-input');
    
    if (weatherInput) {
      weatherInput.value = weatherEntity;
    }
    if (curtailmentInput) {
      curtailmentInput.value = curtailmentEntity;
    }
  }

  // Get only enabled optional loads
  _getEnabledOptionalLoads() {
    const config = this._loadOptionalLoadsConfig();
    const enabled = config.filter(load => load.enabled && load.forecastEntity && load.historicalEntity);
    return enabled;
  }

  // Build maps for optional loads forecast data (for FUTURE tab)
  _buildOptionalLoadsForecastMaps() {
    const enabledLoads = this._getEnabledOptionalLoads();
    const maps = [];
    
    enabledLoads.forEach(load => {
      const entity = this._hass.states[load.forecastEntity];
      if (entity && entity.attributes && entity.attributes.forecast) {
        const map = new Map();
        (entity.attributes.forecast || []).forEach(item => {
          if (item.time && item.value !== undefined) {
            const ts = new Date(item.time).getTime();
            const kw = (parseFloat(item.value) || 0) / 1000;
            map.set(ts, kw);
          }
        });
        maps.push({ load, map });
      } else {
        maps.push({ load, map: new Map() });
      }
    });
    
    return maps;
  }

  // Build maps for optional loads historical data (for PAST tab)
  _buildOptionalLoadsHistoricalMaps() {
    const enabledLoads = this._getEnabledOptionalLoads();
    const maps = [];
    
    enabledLoads.forEach(load => {
      const entity = this._hass.states[load.historicalEntity];
      if (entity) {
        const unit = entity.attributes?.unit_of_measurement || 'W';
        const mult = unit === 'kW' ? 1 : unit === 'MW' ? 1000 : 0.001;
        maps.push({ load, entity, mult });
      } else {
        maps.push({ load, entity: null, mult: 0.001 });
      }
    });
    
    return maps;
  }

  // Populate optional loads form from saved config
  _populateOptionalLoadsForm() {
    const config = this._loadOptionalLoadsConfig();
    for (let i = 0; i < 10; i++) {
      const enableCheckbox = this.shadowRoot.getElementById(`optload-enable-${i}`);
      const emojiSelect = this.shadowRoot.getElementById(`optload-emoji-${i}`);
      const loadNameSelect = this.shadowRoot.getElementById(`optload-preset-${i}`);
      const customNameInput = this.shadowRoot.getElementById(`optload-customname-${i}`);
      const forecastInput = this.shadowRoot.getElementById(`optload-forecast-${i}`);
      const historicalInput = this.shadowRoot.getElementById(`optload-historical-${i}`);
      const energyInput = this.shadowRoot.getElementById(`optload-energy-${i}`);
      const thresholdInput = this.shadowRoot.getElementById(`optload-threshold-${i}`);
      
      if (config[i] && enableCheckbox && emojiSelect && loadNameSelect && forecastInput && historicalInput) {
        enableCheckbox.checked = config[i].enabled || false;
        emojiSelect.value = config[i].emoji || '🔌';
        loadNameSelect.value = config[i].loadName || '';
        forecastInput.value = config[i].forecastEntity || '';
        historicalInput.value = config[i].historicalEntity || '';
        if (energyInput) {
          energyInput.value = config[i].energyEntity || '';
        }
        if (thresholdInput) {
          thresholdInput.value = config[i].threshold || 10;
        }
        
        // Populate custom name if it was saved
        if (customNameInput) {
          customNameInput.value = config[i].customName || '';
          // Show/hide custom name input based on loadName
          if (config[i].loadName === 'custom' && config[i].customName) {
            customNameInput.style.display = 'block';
          } else {
            customNameInput.style.display = 'none';
          }
        }
      }
    }
  }

  _populateColorPickers() {
    
    // Populate color picker VALUES first
    const colorPickers = this.shadowRoot.querySelectorAll('.color-picker');
    
    colorPickers.forEach(picker => {
      // Extract category and color type from id (e.g., "color-self_consumption-bg")
      const parts = picker.id.match(/color-(.+?)-(bg|txt|cost)$/);
      if (!parts) {
        return;
      }
      
      const category = parts[1];
      const colorType = parts[2];
      const colorKey = { bg: 'bg', txt: 'txt', cost: 'cost' }[colorType];
      
      // Get the color value from _colorSettings
      const colorValue = this._colorSettings[category]?.[colorKey];
      
      if (colorValue) {
        picker.value = colorValue;
      }
    });
    
    // NOW wire event handlers (only once per picker)
    colorPickers.forEach(picker => {
      // Skip if already wired
      if (picker._wired) return;
      picker._wired = true;
      
      const parts = picker.id.match(/color-(.+?)-(bg|txt|cost)$/);
      if (!parts) return;
      
      const category = parts[1];
      const colorType = parts[2];
      const colorKey = { bg: 'bg', txt: 'txt', cost: 'cost' }[colorType];
      
      picker.addEventListener('change', (e) => {
        const newValue = e.target.value;
        
        // Update _colorSettings in memory
        if (!this._colorSettings[category]) {
          this._colorSettings[category] = { bg: '#fff', txt: '#000', cost: '#000' };
        }
        this._colorSettings[category][colorKey] = newValue;
        
        // Save to localStorage immediately
        try {
          localStorage.setItem('haeo-events-card-colors', JSON.stringify(this._colorSettings));
        } catch (err) {
        }
        
        // Force immediate rebuild with proper event trigger
        this._lastCostTs = null;  // Reset cost timestamp to force update
        
        // Rebuild table with new colors
        if (this._activeTab === 'future') {
          this._renderFuture();
        } else {
          this._loadPast();
        }
      });
    });
    
    // Reset to defaults button - MOVED AND FIXED HERE
    const resetBtn = this.shadowRoot.getElementById('reset-colors-btn');
    if (resetBtn && !resetBtn._wired) {
      resetBtn._wired = true;
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Find which tab is active
        const activeTab = this.shadowRoot.querySelector('.settings-tab.active');
        const activeTabName = activeTab?.dataset?.tab;
        
        if (activeTabName === 'colours-self' || activeTabName === 'colours-profit' || activeTabName === 'colours-cost') {
          // Reset colors to defaults
          this._colorSettings = JSON.parse(JSON.stringify(_HAEO_COLOURS));
          
          // Update color picker VALUES
          const colorPickers = this.shadowRoot.querySelectorAll('.color-picker');
          colorPickers.forEach(picker => {
            const parts = picker.id.match(/color-(.+?)-(bg|txt|cost)$/);
            if (!parts) return;
            
            const category = parts[1];
            const colorType = parts[2];
            const colorKey = { bg: 'bg', txt: 'txt', cost: 'cost' }[colorType];
            
            if (this._colorSettings[category]) {
              const newValue = this._colorSettings[category][colorKey];
              picker.value = newValue;
            }
          });
          
        } else if (activeTabName === 'loads') {
          
          // Reset inverter brand selector to Sigenergy FIRST
          const inverterBrand = this.shadowRoot.getElementById('inverter-brand');
          if (inverterBrand) {
            inverterBrand.value = 'sigenergy';
            // Trigger change event to populate entity placeholders from inverter brand
            inverterBrand.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          // Reset all threshold inputs to defaults
          const thresholdDefaults = {
            'threshold-load': 0,
            'threshold-pv': 50,
            'threshold-grid': 100,
            'threshold-battery': 100,
            'threshold-ev': 100,
            'threshold-ev2': 100,
            'threshold-deferLoad': 5
          };
          
          // Reset thresholds
          Object.entries(thresholdDefaults).forEach(([id, defaultValue]) => {
            const input = this.shadowRoot.getElementById(id);
            if (input) input.value = defaultValue;
          });
          
          // Reset column toggles - DISABLE EV, EV2, Deferrable Loads (uncheck them)
          const colEV = this.shadowRoot.getElementById('col-ev');
          const colEV2 = this.shadowRoot.getElementById('col-ev2');
          const colDeferLoad = this.shadowRoot.getElementById('col-deferLoad');
          if (colEV) colEV.checked = false;
          if (colEV2) colEV2.checked = false;
          if (colDeferLoad) colDeferLoad.checked = false;
          
          // Reset entity inputs - ONLY clear EV, EV2, and Deferrable Loads
          // (forecast/future decisions keep their defaults and show white)
          const entityIds = [
            'ev-forecast', 'ev-historical', 'ev-energy', 'ev-energy-discharge',
            'ev2-forecast', 'ev2-historical', 'ev2-energy', 'ev2-energy-discharge',
            'deferLoad-forecast', 'deferLoad-historical', 'deferLoad-energy'
          ];
          
          entityIds.forEach(id => {
            const input = this.shadowRoot.getElementById(id);
            if (input) input.value = '';
          });
          
        } else if (activeTabName === 'optional-loads') {
          // Reset optional loads: disable all, reset filter to 10W, reset to plug emoji and no name
          if (this._optionalLoadsConfig) {
            this._optionalLoadsConfig.forEach(config => {
              config.enabled = false;
              config.threshold = 10;
              config.emoji = '🔌';
              config.loadName = '';
              config.customName = '';
            });
          }
          // Update UI inputs for optional loads
          for (let i = 0; i < 10; i++) {
            const enableCheckbox = this.shadowRoot.getElementById(`optload-enable-${i}`);
            const emojiSelect = this.shadowRoot.getElementById(`optload-emoji-${i}`);
            const presetSelect = this.shadowRoot.getElementById(`optload-preset-${i}`);
            const thresholdInput = this.shadowRoot.getElementById(`optload-threshold-${i}`);
            
            if (enableCheckbox) enableCheckbox.checked = false;
            if (emojiSelect) emojiSelect.value = '🔌';
            if (presetSelect) presetSelect.value = '';
            if (thresholdInput) thresholdInput.value = 10;
          }
        }
      });
    }
  }

  // Export settings to JSON file
  _exportSettings() {
    const allSettings = {
      version: _HAEO_VERSION,
      exportDate: new Date().toISOString(),
      columns: this._columnSettings,
      colors: this._colorSettings,
      thresholds: this._thresholdSettings,
      deferableLoads: this._deferableLoadsConfig,
      optionalLoads: this._loadOptionalLoadsConfig(),
      deferrableLoadsEntities: this._loadDeferrableLoadsConfig()
    };
    
    const json = JSON.stringify(allSettings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `haeo-events-card-backup-${new Date().toISOString().replace(/[:.]/g, '').slice(0,15)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import settings from JSON file
  _importSettings(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validate backup format
        if (!data.columns || !data.colors || !data.thresholds) {
          alert('Invalid backup file format');
          return;
        }
        
        // Apply settings
        this._columnSettings = data.columns || this._columnSettings;
        this._colorSettings = data.colors || this._colorSettings;
        this._thresholdSettings = data.thresholds || this._thresholdSettings;
        this._deferableLoadsConfig = data.deferableLoads || this._deferableLoadsConfig;
        
        // Save to localStorage and reload
        try {
          localStorage.setItem('haeo-events-card-columns', JSON.stringify(this._columnSettings));
          localStorage.setItem('haeo-events-card-colors', JSON.stringify(this._colorSettings));
          localStorage.setItem('haeo-events-card-thresholds', JSON.stringify(this._thresholdSettings));
          localStorage.setItem('haeo-events-card-deferrable-loads', JSON.stringify(this._deferableLoadsConfig));
          if (data.optionalLoads) {
            localStorage.setItem('haeo-events-card-optional-loads', JSON.stringify(data.optionalLoads));
          }
          if (data.deferrableLoadsEntities) {
            localStorage.setItem('haeo-events-card-deferrable-loads-entities', JSON.stringify(data.deferrableLoadsEntities));
          }
        } catch (e) {
        }
        
        alert('Settings imported successfully!');
        window.location.reload();
      } catch (error) {
        alert('Error reading backup file: ' + error.message);
      }
    };
    reader.readAsText(file);
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
