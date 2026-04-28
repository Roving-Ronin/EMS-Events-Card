# Changelog

All notable changes to `haeo-events-card.js` are documented here.

---

## [v2.3.8] — 2026-04-28

### Fixed
- **Cost/Profit wildly inflated** — `sensor.grid_net_cost` is a cumulative running total, not a per-slot value. The card now computes per-slot deltas (`value[i] - value[i-1]`) from the forecast array. Previously the raw cumulative value was used, producing figures like `$1.058` instead of the correct `$0.130`
- **Daily Cost/Profit totals** — now correctly sum per-slot deltas only, not cumulative values

### Changed
- Removed unused `costFc` variable from `_renderFuture`

---

## [v2.3.7] — 2026-04-28

### Changed
- **Status bar grid times** — grid import/export times now display in 12h format without leading zero (e.g. `6:00 am` instead of `06:00`)
- **Grid export pill badge** — changed from plain coloured text to a green pill badge (`#2e7d32`) matching the import pill style
- **Grid import pill badge** — updated icon from ⚠️ to ⚡ for consistency with export pill

---

## [v2.3.6] — 2026-04-27

### Fixed
- **Future tab grid and battery** — kW/kWh values below ±100W (0.1 kW) now show `—` instead of `0.00`, consistent with Past tab behaviour

---

## [v2.3.5] — 2026-04-27

### Fixed
- **PV kWh showing a value when PV kW is 0.00** — energy sensor delta was picking up residual noise at night. PV kW and kWh now show `—` below 50W (0.05 kW) in both Future and Past tabs

---

## [v2.3.4] — 2026-04-27

### Fixed
- **`—` dashes rendering in red or green** — `—` values were being wrapped inside coloured `<span>` elements, inheriting grid or battery colour. Fixed in four places: `fmtKwhC` (Future), Future battery kWh, Past grid kWh, Past battery kWh. All dashes now render in the default row text colour

---

## [v2.3.3] — 2026-04-27

### Changed
- **Display threshold raised to ±100W** — grid and battery kW/kWh values below 0.1 kW now show `—` (previously 0.05 kW). Suppresses Sigenergy inverter sensor noise more effectively

---

## [v2.3.2] — 2026-04-27

### Added
- **Battery kWh fallback** — when `past_battery_charge_energy` or `past_battery_discharge_energy` returns null (e.g. daily-reset sensor at midnight boundary), kWh is now estimated as `battKw × stepH`
- **Grid kWh fallback** — same fallback for grid import/export energy sensors when delta is null

### Fixed
- **Grid and battery kW noise display** — values below ±50W (0.05 kW) now show `—` instead of small coloured numbers

---

## [v2.3.1] — 2026-04-26

### Fixed
- **Past tab Grid kWh always showing `—`** — `importing` and `exporting` variables in pass 2 were using the old HAEO grid convention (negative=import) instead of the Sigenergy convention (positive=import). This meant `eGrid` was always null and slot cost was always zero

---

## [v2.3.0] — 2026-04-26

### Breaking Changes
- **All entity config keys renamed** — Future tab sensors now prefixed `haeo_`, Past tab sensors prefixed `past_`. Any existing card YAML overrides must be updated:
  - `entity_battery` → `entity_haeo_battery`
  - `entity_grid` → `entity_haeo_grid`
  - `entity_load` → `entity_haeo_load`
  - `entity_solar` → `entity_haeo_solar`
  - `entity_soc` → `entity_haeo_soc`
  - `entity_buy_price` → `entity_haeo_buy_price`
  - `entity_sell_price` → `entity_haeo_sell_price`
  - `entity_grid_net_cost` → `entity_haeo_grid_net_cost`
  - `entity_energy_load` → `entity_past_load_energy`
  - `entity_energy_solar` → `entity_past_solar_energy`
  - `entity_energy_grid_import` → `entity_past_grid_import_energy`
  - `entity_energy_grid_export` → `entity_past_grid_export_energy`
  - `entity_energy_batt_charge` → `entity_past_battery_charge_energy`
  - `entity_energy_batt_discharge` → `entity_past_battery_discharge_energy`

### Added
- **Four new Past tab inverter power sensors** — Past tab now reads actual inverter measurements instead of HAEO optimizer sensor history, giving real measured values rather than planned values:
  - `entity_past_battery_power` → `sensor.sigen_plant_battery_power` (negative=discharge, positive=charge)
  - `entity_past_load_power` → `sensor.sigen_plant_total_load_power`
  - `entity_past_solar_power` → `sensor.sigen_plant_pv_power`
  - `entity_past_grid_power` → `sensor.sigen_plant_grid_active_power` (positive=import, negative=export)
- All four sensors fully overridable in card YAML for non-Sigenergy inverters

### Fixed
- **Sigenergy battery sign** — `sigen_plant_battery_power` records negative=discharge; negated at read time to match internal convention (positive=discharge), then negated again at display time so discharge shows as negative

---

## [v2.2.0] — 2026-04-25

### Fixed
- **Full sign convention audit** — corrected across all sensor reads, classifiers, colours and display in both tabs:
  - Grid: `positive=import, negative=export` consistently applied to forecast and history
  - Battery (Future): `positive=discharge, negative=charge` — display negated so discharge shows as negative
  - `exporting`/`importing` threshold checks updated throughout
  - Removed incorrect `-1` buildMap multiplier for grid forecast
  - Removed incorrect grid negation in Past tab pass 1 and pass 2
  - Removed SoC-delta battery direction inference (introduced in v2.1.8, was incorrect)
- **Grid colour** — `positive=import=red`, `negative=export=green` (was previously backwards)
- **Battery colour** — `positive=discharge=red`, `negative=charge from solar=green`, `negative=charge from grid=amber`
- **Past Cost/Profit direction** — `importing = gridKw > 0.1`, `exporting = gridKw < -0.1`
- **Day header grid totals** — removed double-negation

---

## [v2.1.8] — 2026-04-24

### Fixed
- **Battery direction in Past tab** — `sensor.battery_active_power` history was incorrectly treated as unsigned absolute value. Replaced SoC-delta inference with direct sign convention (positive=discharge, negative=charge). *(Note: this was superseded and corrected in v2.2.0 after confirming Sigenergy sensor conventions)*

---

## [v2.1.7] — 2026-04-24

### Fixed
- **Past tab battery sign** — negated raw battery value at read time to align with internal convention. *(Note: partially correct — fully resolved in v2.2.0 and v2.3.0)*

---

## [v2.1.6] — 2026-04-23

### Fixed
- **Past tab stuck loading** — `setConfig` now resets `_pastState` to `'idle'` and `_lastCostTs` to `null` when the Shadow DOM is rebuilt (e.g. navigating back to the dashboard), ensuring a fresh fetch on return
- **Stuck-loading recovery** — if `_pastState` remains `'loading'` for more than 30 seconds (WebSocket call silently failed), it resets to `'idle'` on the next `set hass` call to trigger a retry. `_pastLoadTs` tracks when loading started

---

## [v2.1.5] — 2026-04-22

### Changed
- **Legend updated to EM-card style** — 8×8 layout with EM-style descriptions (e.g. `Self Consumption - Solar`, `Profit - Grid Export (Solar)`, `Cost - Grid Import (Battery Idle | No Solar)`)
- EV Charger and Scheduled Loads split into separate placeholder entries in legend right column

---

## [v2.1.4] — 2026-04-22

### Fixed
- **Grid day total sign** — `dk.grid` / `pk.grid` accumulate positive=export internally; now passed as `-dk.grid` to `fmtKdCol` so export displays as negative=green, import as positive=red
- **Battery day total colour** — added `fmtKdColBatt` with inverted colour logic: negative=discharge=red, positive=charge=green. Battery total passed as `-dk.batt` / `-pk.batt`

---

## [v2.1.3] — 2026-04-21

### Fixed
- **Grid and battery kW/kWh text colour** — grid export (negative) now green, import (positive) now red; was previously backwards
- **Battery colour** — positive=discharge=red, negative=charge from solar=green, negative=charge from grid=amber
- **Past eBatt sign** — discharge now correctly negative, charge positive, matching display convention
- **Battery daily total sign** — discharge total now shows `-` prefix in red; charge total shows positive in green
- **Cost/Profit day header** — removed `Est.` prefix from both Future and Past tabs

---

## [v2.1.2] — 2026-04-20

### Fixed
- **Card blank screen** — `gridKw` was referenced before declaration in the Future tab daily cost pre-pass, causing a `ReferenceError` that crashed the entire card render

---

## [v2.1.1] — 2026-04-20

### Fixed
- **Future Cost/Profit showing on battery-only rows** — `sensor.grid_net_cost` carries interpolated/stale values between grid events. Cost is now only shown when `|gridKw| > 0.05 kW`; otherwise forced to zero and displayed as `—`
- **Daily total pre-pass** — same grid activity gate applied so day header cost estimates are also correct

---

## [v2.1.0] — 2026-04-19

### Changed
- **Classification aligned with EM card full event set** — both Future and Past tabs now use the full EM-style event labels
- Removed `(Self Consumption)` suffix from all event labels
- Renamed `(Force Export)` to `(Force)` throughout for consistency
- Added `🌞 Solar → 🏠 Home + 🔋 Battery + ⚡ Grid` three-way case
- Added `🌞 Solar + 🔋 Battery + ⚡ Grid → 🏠 Home` import+solar+discharge case
- Legend rebuilt to 7×7 matching full event set

---

## [v2.0.7] — 2026-04-18

### Fixed
- **Event classification** — `Solar → Grid (Force Export)` was firing for normal surplus self-consumption. Now only `exporting && discharging` paths are classified as Force Export; `solarKw > T && exporting` correctly classified as `🌞 Solar → 🏠 Home + ⚡ Grid`
- **Grid and battery display signs** — grid and battery kW/kWh columns now display with correct sign (export negative, discharge negative) in both tabs

---

## [v2.0.6] — 2026-04-17

### Fixed
- **Primary forecast axis** — switched from `sensor.grid_net_cost` to `sensor.battery_active_power` as the primary axis for the Future tab. `grid_net_cost` timestamps did not align with battery/grid/load/solar timestamps, causing near-zero lookups for all power values
- **Nearest-timestamp lookup** — added `nearestGet()` helper for sensors with coarser step sizes (buy/sell price, grid net cost) to find the closest Map entry rather than requiring exact epoch-ms match
- **`set hass` trigger** — updated to watch `sensor.battery_active_power` for forecast changes

---

## [v2.0.5] — 2026-04-16

### Fixed
- **Grid forecast sign** — HAEO `sensor.grid_active_power` forecast uses `negative=export, positive=import` (confirmed from raw sensor data). Removed incorrect `-1` buildMap multiplier. Classification thresholds updated: `exporting = gridKw < -T`, `importing = gridKw > T`

---

## [v2.0.4] — 2026-04-15

### Fixed
- **Unit comparison case sensitivity** — `_haeo_powerMult` and `_haeo_energyMult` now call `.trim().toUpperCase()` before comparing, handling variations like `kW`, `KW`, `kw`. Explicit `KW`/`KWH` cases added

---

## [v2.0.3] — 2026-04-15

### Fixed
- **Future event classification fallback** — when load > 0 but no source is identifiable in the forecast (HAEO sometimes omits small battery discharge values), now infers `🔋 Battery → 🏠 Home` in teal rather than showing `—`
- **Past energy kWh noise** — `eGrid` and `eBatt` now gated on kW threshold; if grid kW is 0.00 then eGrid is null regardless of energy sensor delta

---

## [v2.0.2] — 2026-04-14

### Fixed
- **Forecast power units** — HAEO forecast attribute values are always in kW regardless of live sensor `unit_of_measurement`. Removed `_haeo_powerMult` from `buildMap` calls (multiplier still correctly applied to history sensor reads in `_loadPast`)
- **Future kWh columns** — now calculated as `kW × stepH` where `stepH` is derived from the actual gap to the next forecast timestamp (1-min slots → 0.017h, 30-min → 0.5h, 1h → 1h)
- **Past energy kWh noise** — threshold raised from 0.001 to 0.005 kWh (5 Wh)
- **Past classification fallback** — changed from `🏠 Home (Source Unknown)` to `⚡ Grid → 🏠 Home` when load > 0 but no source identified

---

## [v2.0.0] — 2026-04-12

### Added
- Two-tab card: **Future Decisions** (HAEO forecast) and **Past Events** (HA recorder history)
- Sticky dual-row header with Load / PV / Grid / Battery kW + kWh columns
- Status bar: SoC now, Morning/Peak SoC, buy/sell price, grid import/export warnings
- Smart auto-refresh at `:01`, `:06`, `:11`... past the hour
- ResizeObserver for dynamic table height
- Range selector for Past tab (Today / Yesterday / Last 24h–7 days)
- Auto-switches to Last 24h if Today has no data
- Configurable sensor entity IDs via card YAML
- Auto unit detection (W/kW/MW, Wh/kWh/MWh/GWh)
- EM-card aligned event classification and legend (8×8)
- Daily kWh totals and Cost/Profit in day header rows
- `_haeo_getDelta` for total_increasing energy sensor kWh deltas
- Battery SoC colour warnings (red ≤20%, green ≥75%)

### Changed
- Complete rewrite from v1.x single-tab timeline card

---

## [v1.0.0] — 2026-03-01

- Initial release — single-tab Future Decisions timeline card
- HAEO forecast attributes for battery, grid, solar, load, SoC, buy/sell price
- Basic event classification and legend
