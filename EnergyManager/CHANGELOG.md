# Changelog — EM Events Card

All notable changes to `em-events-card.js` are documented here.

---

## v2.4.15
- Export Limit and Charge Limit values now displayed as neutral grey pills
- Export Limit pill only shown when next timeline decision involves grid export
- Charge Limit pill only shown when next timeline decision involves grid import or battery charging

## v2.4.14
- Added Export Limit pill — reads `sensor.inverter_current_export_power_limit` (W), converted to kW
- Added Charge Limit pill — lesser of `sensor.inverter_current_max_charge_power` (W) and `input_number.inverter_import_limit` (kW)
- Values auto-formatted from watts to kW (e.g. 6300W → 6.3 kW, 12000W → 12 kW)

## v2.4.13
- Forced Export/Import pills always appear to the left of Grid Export/Import pills for stable layout
- All pill and label text consistently title-cased: Grid Export, Grid Import, Forced Export, Forced Import
- Focus text title-cased: Optimising Self-Use, Export Protection, Grid Charging Expected etc.
- Times converted to 12hr am/pm format throughout status bar

## v2.4.12
- Provider-calculated Buy and Sell prices added to status bar as neutral grey pills — correct for Amber Electric, LocalVolts, Flow Power and GloBird
- 🎯 Focus label added with neutral grey pill
- Grid Export pill (green) added alongside existing Grid Import pill (orange)
- Force Export upgraded from plain text to coloured pill — green if profitable (sell > 0), orange if dump price (sell ≤ 0)
- Force Import pill added — green if buy price negative (paid to import), red if positive (costs money)

## v2.4.11
- Zero kW values now display as `—` in neutral row colour instead of `0.00` in red/green — both Future and Past tabs
- Threshold: < 0.005 kW (5W) for kW columns, < 0.001 for kWh columns

## v2.4.10
- Future tab daily cost and kWh totals now exclude slots before current time, matching the render loop
- Previously past slots (not shown as rows) were incorrectly included in day totals

## v2.4.9
- Shadow DOM rebuild now resets `_pastState` and `_lastPlanTs` to prevent Past tab stuck on Loading when navigating between dashboards
- Stuck-loading recovery: if Past tab has been loading for > 30 seconds, automatically resets and retries on next `hass` update
- `_pastLoadTs` timestamp added to track loading start time

## v2.4.8
- kWh sanity filter extended to all columns — Grid and Battery kWh deltas forced to zero when corresponding kW reading < 50W, suppressing sensor rounding artefacts
- Previously only PV and Load had this filter applied

## v2.4.7
- Future tab day total cost/profit sign fixed — net export day correctly shows `$x.xx` (profit) in green instead of `-$x.xx`

## v2.4.6
- Battery kW/kWh colour convention applied consistently across both Future and Past tabs: discharge (negative) = red, charge (positive) = green
- Separate `fmtGrid` / `fmtBatt` colour functions for day header totals — Grid and Battery now colour independently

## v2.4.5
- `Est.` prefix removed from Future tab day Cost/Profit totals

## v2.4.4
- Grid and Battery kWh day header totals now colour-coded: Grid negative (export) = green, positive (import) = red; Battery negative (discharge) = red, positive (charge) = green

## v2.4.3
- Day header rows now show Load, PV, Grid and Battery kWh totals in their respective kWh columns
- Grid kWh on data rows signed and coloured: negative (green) = export, positive (red) = import
- Battery kWh on data rows signed: negative = discharge, positive = charge

## v2.4.2
- Smart boundary-aligned auto-refresh: fires at :01, :06, :11, :16, :21, :26, :31, :36, :41, :46, :51, :56 past the hour
- Page Visibility API: refreshes skipped when browser tab is hidden, catches up immediately on tab focus
- Replaced fixed `setInterval` with `setTimeout` chained to next boundary

## v2.4.1
- Per-row `interval_minutes` support for mixed 5-min / 30-min forecast steps
- kWh and cost calculations now use each row's own step size rather than a single fixed value
- GloBird super export cap accumulation also uses per-row step

## v2.4.0
- Provider pill moved from status bar to legend footer, sitting left of version number
- Prevents provider pill causing status bar to wrap to a second line when multiple alert pills are present
- 🚿 emoji restored in legend Scheduled Load(s) entry

## v2.3.9
- Chrome and Opera column misalignment fixed — scrollbar width measured after each render and applied to header table width via `calc(100% - Npx)`
- Works correctly whether scrollbar is 0px (overlay), 17px (Windows Chrome) or any other value

## v2.3.8
- Event column width changed from `width:auto` to `width:40%` for consistent cross-browser fixed table layout

## v2.3.7
- **Sticky header fix** — each pane split into two separate tables: a header-only table above the scroll div and a body-only table inside
- `_setWrapHeight()` measures actual viewport position and sets pixel height on `.wrap` scroll container
- Resolves long-standing issue where `position:sticky` thead failed across Chrome, Firefox and Opera

## v2.3.0 — v2.3.6
- 14-column table layout with kWh columns added (Load, PV, Grid, Battery)
- Two-row column header with group labels (Load, PV, Grid, Battery)
- `.dt` CSS class scoping to prevent legend table style leakage
- Day header rows with Cost/Profit totals
- `_setWrapHeight()` JS method for scroll container sizing
