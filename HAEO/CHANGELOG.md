# Changelog

All notable changes to `haeo-events-card.js` are documented here.

---

## [v3.2.69] — 2026-06-17

> **Note:** This entry consolidates all changes between v3.1.0 and v3.2.69. The intermediate point releases in this range were not individually logged, so the items below are summarised against the v3.1.0 baseline rather than attributed to specific intermediate version numbers.

### Added
- **Mode & Focus status pills** — status bar now derives and displays a 📌 Mode badge (SELF CONSUMPTION / MAXIMISE PROFIT / MINIMISE COST, colour-coded green/orange/blue) and a matching 🎯 Focus description from the current slot's classification, via new `_haeo_getModeAndFocus()` helper
- **🔄 HAEO Updated badge** — new freshness indicator centred in the tab bar, showing how long ago the optimizer last ran. Reads `last_run` from `sensor.optimizer_status` and renders relative time (e.g. `3m ago`, `1h 12m ago`, or `just now` for clock-skew cases)
- **Power limit pills** — four new conditional status bar badges: 📤 Export Limit, ⚡ Import Limit, 🔋 ESS Charge Limit, 🔋 ESS Disch. Limit. Each only renders when its corresponding `number.*` entity is configured AND the relevant grid/battery flow is currently active
- **Four new optional limit sensor defaults** — `haeo_export_limit` (`number.grid_export_limit`), `haeo_import_limit` (`number.grid_import_limit`), `haeo_batt_charge_limit` (`number.battery_max_charge_power`), `haeo_batt_discharge_limit` (`number.battery_max_discharge_power`)
- **Battery capacity kWh display** — when `number.battery_capacity` is available, SoC badges (now, Morning/Peak) optionally show the kWh equivalent alongside the percentage
- **Independent kW/kWh decimal precision settings** — new `kwDecimals` and `kwhDecimals` display options (1–4 places, default 3), separate from the existing `priceDecimals` (Buy/Sell) setting. Configurable in Settings → Entities & Options
- **Weather Affected alert pill** — 🌧️ pill in the ALERTS row when the configured weather entity reports `rainy`, `pouring`, `cloudy`, `fog`, or `partly_cloudy`
- **Curtail On alert pill** — ⚠️ pill in the ALERTS row when the configured curtailment switch entity is `on`

### Changed
- **Event classification scheme restructured** — the 36-label ad hoc classification system has been replaced with a structured key-based system (`_HAEO_COLOURS` and `_HAEO_EVENT_LABELS` now keyed by identifiers such as `pv_to_baseload_battery`, `grid_to_loads_only`, `battery_to_loads_grid_force`, etc.), bringing the total to 35 distinct classification keys. Several prior event labels were merged, renamed, or had their "Base Load" wording generalised to "Loads" as part of this restructure. Colours and descriptions are now resolved independently via key rather than exact label-string matching alone
- **Settings modal "Loads" tab renamed to "Base Sensors"** — same tab content and position (first tab), name change only
- **ALERTS row priority order extended** — now Weather Affected → Curtail On → Grid Import → Grid Export → Force Charge → Force Discharge (previously Grid Import → Grid Export → Force Charge → Force Discharge only)

### Fixed
- Various event classification edge cases addressed as part of the key-based restructure (see "Changed" above); a legacy colour-key fallback table (`self_consumption`, `profit`, `battery`, `cost`, `forced_export`, `loss`, `gain`) was retained in `_HAEO_COLOURS` to avoid breaking any custom colour overrides saved under the old scheme

---

## [v3.1.0] — 2026-06-02

### Added
- **Comprehensive Hover Tooltips** — All 36 events now display detailed descriptions on hover:
  - FUTURE tab: Rich, contextual tooltips explaining tariff strategies, battery implications, and cost/profit logic
  - PAST tab: Descriptive tooltips showing energy flow scenarios and recorded sensor values
- **Tooltip Arrow Parsing** — Smart tooltip generation that correctly distinguishes energy **sources** (before `→`) from **destinations** (after `→`), fixing battery/grid misclassification in multi-source scenarios
- **Complete Event Description Coverage** — All 36 event classifications have dedicated descriptions aligned with legend

### Fixed
- **Tooltip Generation Logic** — Fixed `_generateDescriptionFromLabel()` to properly parse arrow position, correcting ~10 events where Battery or Grid appeared in the destination (charging/export) position but was being labeled as a source
- **Missing Event Tooltip** — Added tooltip for `pv_to_baseload_battery_grid` event (Solar → Base Load + Battery + Grid)
- **PAST Tab Tooltip Coverage** — PAST tab event cells now display tooltips (previously no hover descriptions on historical events)

### Changed
- **FUTURE Tab Tooltips** — Upgraded from short `cls.note` descriptions to detailed `_HAEO_DESCRIPTIONS` with full context
- **PAST Tab Tooltips** — Now use `_HAEO_DESCRIPTIONS` instead of auto-generated descriptions for consistency and clarity

---

## [v3.0.0] — 2026-05-30

### Added
- **Redesigned Column Headers** — Tab-specific event column headers with emoji indicators:
  - FUTURE tab: 🔮 **HAEO Forecast Decisions** — planned optimization scenarios
  - PAST tab: 🔎 **BESS Past Events** — recorded inverter/battery measurements
- **Restructured Header Bars** — New visual hierarchy with labeled sections:
  - **ALERTS:** section (red) for weather, curtailment, grid import/export status
  - **STATUS:** section (blue) for Mode, Focus, SoC, tariff prices, limits
- **PAST Tab Informational Note** — Centered red message clarifying that PAST tab shows recorded sensor values, not HAEO decisions
- **36 Complete Event Labels** — Full emoji-rich event descriptions in settings display (`_HAEO_EVENT_LABELS`)

### Changed
- **Tab Navigation** — More explicit visual distinction between Future (forecast) and Past (historical) views
- **Status Bar Layout** — ALERTS and STATUS labels aligned with consistent 12px left padding for visual symmetry
- **Legend Accuracy** — All 36 events now have complete descriptions and visual representations

### Preserved
- All v2.6.0 core functionality (modal legend, description tooltips, EV/EV2 support, smart thresholds)
- Future/Past tab data flow and classification logic
- Smart alert pills and Mode/Focus color coding
- Multi-provider support and configurable sensor defaults

---

## [v2.6.0] — 2026-05-10

### Added
- **Event Description Tooltips** — Hover over event labels to see detailed rationale for each decision (tariff rates, peak periods, battery discharge timing, cost implications)
- **Interactive Modal Legend** — Click "View Legend" button to open searchable legend with color blocks instead of static 2-column table
- **Power Source Filter Checkboxes** — Filter legend events by ☀️ Solar / 🔋 Battery / ⚡ Grid / 🚗 EV with OR-logic (show events matching ANY selected source)
- **Category-Based Legend Organization** — Legend grouped into Self Consumption / Cost / Profit categories with alphabetical sorting within each
- **34 Event Descriptions** — Complete tooltip documentation including tariff-based rationale, battery state implications, cost/profit logic
- **Legend Modal Backdrop** — Modal overlay (z-index: 1000) with close button (✕) and click-to-close backdrop for better UX
- **Enhanced EV Charging Classification** — Fixed event labels when EV charges alongside grid import and battery charging (now includes all three in event label)
- **EV+Battery Combination Scenarios** — 6 new scenarios covering EV charging with grid import, solar, and battery simultaneously

### Fixed
- **EV Discharging Classification Precedence** — EV scenarios now checked before non-EV scenarios, preventing missing EV labels in complex multi-source scenarios
- **Peak SoC Time Format** — Removed leading zero from hour (01:55pm → 1:55pm)
- **Morning SoC Time Format** — Same fix as Peak SoC badge
- **Grid export/import alerts showing on Past Events tab** — alert pills are now hidden when Past tab is active (alerts are for planned Future events only)
- **Grid export/import alert date format** — when alert refers to a future day, format now includes day name (e.g. `Grid export from Saturday 3:30pm` instead of just `3:30pm`). Today events show time only (e.g. `3:30pm`)

### Changed
- **Legend Header** — Removed emoji and "Legend:" text; replaced with single "View Legend" pill badge (navy #000099, white text)
- **Legend Display Method** — Static table replaced with dynamic modal for space efficiency and better interactivity
- **Event Classification Logic** — Restructured EV charging cascade to check grid+battery combinations before single-source scenarios

### Preserved
- All v2.5.2 core functionality (auto-refresh, multi-provider support, energy calculations, column alignment, status bar, history querying)
- Future/Past tab structure and data flow
- Smart alert pills (Grid Import / Export / Force Charge / Discharge)
- Mode and Focus pills with color coding
- Daily totals and Cost/Profit calculations
- All sensor defaults and configuration options

---

## [v2.5.1a] — 2026-05-08

### Added
- **EV event classification** — `_haeo_classifyFuture()` and `_haeo_classifyPast()` now accept EV power parameter and generate event labels reflecting EV charging/discharging scenarios (e.g. `Solar + Battery + EV → Home`, `EV → Home`, `EV + Grid → Home`)
- **EV charging color coding** — EV kW/kWh columns now display with semantic colors: discharging to home=amber, discharging to grid=red, charging from solar=green, charging from grid=red

### Changed
- **Battery/EV display convention reversed** — battery and EV kW values now negated for display so positive=charging, negative=discharging (opposite of raw sensor convention). Makes display more intuitive: charging shows positive, discharging shows negative
- **Battery color logic updated** — charging from grid=red, charging from solar=green, discharging=red (adjusted for new display convention)
- **16:00 row color** — "Solar + Battery → Home + Grid (Force)" scenario now uses `#ffb3b3` (darker pink) instead of light teal for improved readability in light mode
- **Legend updated** — added darker pink entry for "Solar + Battery → Home + Grid (Force)" scenario

---

## [v2.5.0c] — 2026-05-08

### Fixed
- **Past tab column count mismatch** — day header rows and error messages had colspan="14" but should be 17 to match EV column additions. Past tab data rows were missing 3 EV columns causing blank area on right

---

## [v2.5.0b] — 2026-05-08

### Added
- **EV column (17 columns total)** — added kW, kWh, and SoC% sub-columns for EV charging/discharging tracking between Battery and Cost/Profit columns
- **EV sensor defaults** — `sensor.ev_active_power` and `sensor.ev_state_of_charge`
- **EV daily kWh accumulation** — Past tab daily totals now include EV energy

### Changed
- **Table structure** — all colspan values updated from 14 to 17 to accommodate EV columns

---

## [v2.5.0a] — 2026-05-08

### Added
- **Mode and Focus pills** — status bar now displays current optimizer mode (SELF CONSUMPTION / MAXIMISE PROFIT / MINIMISE COST) with semantic colors (green / orange / blue) and corresponding focus statement
- **Limit sensor support** — added defaults for grid export/import limits, battery charge/discharge limits with conditional visibility logic based on current activity
- **EV1 fallback sensor support** — EV power and SoC can use either `sensor.ev_active_power`/`sensor.ev_state_of_charge` (primary) or `sensor.ev1_active_power`/`sensor.ev1_state_of_charge` (fallback)

### Changed
- **Status bar restructure** — Mode/Focus pills now appear at far left, other pills follow in standard order

---

## [v2.4.2] — 2026-05-07

### Added
- **Sensor existence checking** — new `_evSensorExists()` method detects if EV sensors are present in HA
- **EV sensor missing indicator** — displays `x` in EV columns when sensors not found (vs `—` for no activity)
- **Light mode text color** — rows with light backgrounds now use black text in light mode for better contrast

### Changed
- **EV display** — shows `x` when sensor missing, `—` when no activity, actual values when data present
- **Battery/EV color coding** — amber for charging from grid, green for charging from solar/battery, red for discharging

---

## [v2.4.1l] — 2026-05-06

### Added
- **Limit sensor defaults** — grid export/import limits, battery charge/discharge limits now read from Home Assistant
- **Conditional limit visibility** — Import Limit only shows when importing; ESS Charge Limit only when charging; ESS Discharge Limit only when discharging+exporting

---

## [v2.4.1k] — 2026-05-06

### Fixed
- **Grid and battery kW/kWh display** — values below ±100W threshold now consistently show `—` in both Future and Past tabs

---

## [v2.4.1j] — 2026-05-05

### Changed
- **Grid export alert position** — moved from status bar to tab bar far right as a standalone green pill badge
- **Alert format** — single green pill containing full label and time (e.g. `📤 Grid export from 6:50 pm`)

---

## [v2.4.1i] — 2026-05-05

### Changed
- **SoC column restructure** — Battery SoC% moved from own column to display under Battery kWh column (right-aligned alongside kWh)
- **Morning/Peak SoC format** — time now included inside pill badge (e.g. `50.7% (8:00 am)`)
- **Time format** — 12-hour format without leading zero on hour (e.g. `6:00 am` not `06:00 am`)
- **Buy/Sell pill labels** — removed `/kWh` suffix, display price only
- **Status bar pills** — all non-modal pills now use neutral grey background (#555) with white text

---

## [v2.4.1h] — 2026-05-05

### Changed
- **Status bar pill redesign** — SoC%, Morning SoC, Buy/Sell prices now display as grey pills with white text instead of plain text
- **Pill styling** — consistent padding, border-radius, and font-weight across all status bar indicators

---

## [v2.4.1] — 2026-05-04

### Added
- **EV2 sensor support** — added `sensor.ev2_active_power` and `sensor.ev2_state_of_charge` for second EV charging tracking
- **EV2 columns** — 18-column layout with separate EV and EV2 kW/kWh/SoC% sub-columns

### Changed
- **Event column width** — reduced from 220px to 154px (70% of original) to make room for additional columns
- **Column padding** — added 8px right padding to data columns to prevent negative numbers from touching borders
- **Colgroup structure** — Event column changed from 40% to `auto; min-width:154px` for flexible sizing

---

## [v2.4.0] — 2026-05-03

### Added
- **EV1 sensor support** — added `sensor.ev_active_power` and `sensor.ev_state_of_charge` for EV charging tracking
- **EV columns** — 17-column layout with EV kW/kWh/SoC% sub-columns between Battery and Cost/Profit
- **EV SoC color coding** — red ≤20%, green ≥80%, default otherwise
- **Daily EV kWh accumulation** — Future and Past tabs now track daily EV energy totals

### Changed
- **Table structure** — all colspan values updated from 14 to 17
- **Colgroup** — adjusted column widths to accommodate EV columns

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
- **Grid and battery kW/kWh noise display** — values below ±50W (0.05 kW) now show `—` instead of small coloured numbers

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
