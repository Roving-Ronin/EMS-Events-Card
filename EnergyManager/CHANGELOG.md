# Changelog — EM Events Card

All notable changes to `em-events-card.js` are documented here.

---
 
## v3.6.0
 
⚠️ **COMPREHENSIVE SECURITY HARDENING**
 
* **XSS Vulnerability Fixed** — Entity-derived values (sensor states, plan attributes) are now HTML-escaped before rendering to prevent Cross-Site Scripting attacks via `innerHTML`
* **HTML Escape Helper Added** — New `_emec_escapeHtml()` function sanitizes all user-controllable entity values
* **Primary XSS Fixes (Critical):**
  - `sensor.import_formatted`, `sensor.export_formatted`, `sensor.net_formatted` states
  - `sensor.daily_imported_energy`, `sensor.daily_exported_energy` states
  - `sensor.energy_manager_plan` attributes (`blocks_summary`)
  - `sensor.energy_manager_decision` (state and derived focus)
* **Secondary XSS Fixes (Defensive):**
  - Error messages in exception handlers (line 3041)
  - Dynamic charging pill time and values (line 1822)
  - EM Decision badge timestamps (line 1384)
**Recommendation:** Update immediately. See SECURITY_ADVISORY_v3.6.0.md for details.
 
---

## v3.5.1

* **EV Charger Support** — Energy Manager can now schedule EV charging with multiple charging modes (Solar Only, Cheapest, Scheduled, Ready by time/price) and real-time SoC% tracking; EV events appear in both FUTURE planned decisions and PAST historical records
* **Solar Forecast Column in PAST** — Historical solar forecast (FCST) data now displayed in PAST tab alongside actual solar readings for analyzing EM's forecast accuracy and decision effectiveness
* **Tab-Aware Column Structure** — FUTURE and PAST tabs now have correct and distinct column layouts; FUTURE excludes Solar Forecast column, PAST includes it; fixes misalignment and gaps in table rendering
* **Conditional Column Visibility** — Curtailed and EV Charger columns dynamically shown/hidden based on EM configuration settings without requiring page reload; improves UI focus on relevant decision factors
* **Event Classifications for EM Decisions** — Comprehensive labeling of EM's planned actions (forced charge/discharge, self-consumption strategies, grid management) with visual indicators (emoji and colour coding) showing decision rationale and energy flows
* **Cost/Profit Tracking** — Energy Manager decision financial impact calculated per interval based on actual tariff rates and power flows; colour-coded display (green for profit, red for cost) shows tariff-based decision effectiveness

## v2.9.0

* **Custom Provider Support** — Extract provider and plan name from `input_select.other_tariff_plan` when "Other" is selected (format: "Provider - Plan - State - DNSP - Date")
* **Dynamic Provider Display** — Status bar pill now shows "⚡ AGL - Battery Rewards" instead of "⚡ Other" for custom electricity providers
* **Supports any electricity provider** — No longer limited to hardcoded providers (Amber Electric, GloBird, Local Volts, Flow Power)

## v2.8.28

* **Export Limit label clarification** — Changed "Set" to "EM" to clarify Energy Manager's calculated limit (not just "set value")

## v2.8.27

* **Grid export limit from Energy Manager plan** — Shows grid operator's hard cap from `input_number.inverter_export_power_hardlimit` instead of sensor
* **Dual export limit display** — Format now shows "6.3 kW (Grid) | 151 W (EM)" to distinguish grid cap vs EM's operational decision

## v2.8.26

* **Export limit sources clarified** — Grid limit from hard limit input, current limit from live inverter sensor

## v2.8.25

* **Fixed inverter export power unit conversion** — Converts watts to kW correctly (6300W → 6.3 kW not 151.2 kW)

## v2.8.24

* **Price decimals example now includes $ symbol** — Shows "$0.352" instead of "0.352" for clarity

## v2.8.23

* **Dynamic Price Decimals example** — Example now updates dynamically based on selected decimal places (e.g., "Example: $0.35" for 2 places)

## v2.8.22

* **Backup tab reset button color** — Changed from grey to red (#f44336) for consistency

## v2.8.13-v2.8.21

* **Settings Modal tab structure fixes** — Properly isolated Display Thresholds, Colours, and Backup tabs
* **Reset to Defaults buttons** — Added to all settings tabs with consistent red styling
* **Default threshold text updated** — Solar: 5W → 500W, Battery: 10W → 100W displays corrected
* **Cost display threshold refined** — Increased from 0.0001 to 0.001 to avoid showing "-$0.000" for small values

## v2.6.0

* **Event Description Tooltips** — Hover over event labels to see detailed rationale for each decision (tariff rates, peak periods, battery discharge timing, cost implications)
* **Interactive Modal Legend** — Click "View Legend" button to open searchable legend instead of static 2-column table
* **Dual-Filter Legend System** — Filter events by power source (☀️ Solar / 🔋 Battery / ⚡ Grid) and category (Self Consumption / Profit / Cost) with independent OR-logic filtering
* **13 Energy Scenarios Documented** — All energy flow scenarios now include specific descriptions explaining tariff-based logic and cost optimization strategy
* **Legend Modal with Backdrop** — Modal overlay (z-index: 1000) with close button (✕) and click-to-close backdrop for better UX
* **Enhanced Tooltips on Past Events** — Past Events tab now shows full event descriptions on hover, matching Future Decisions tab
  
## v2.5.2
- **Column layout refactored to match HAEO Events Card** — 14-column structure with identical colgroup and CSS styling
- **SoC % moved under Battery** — now appears as sub-column in row 2 header (kW | kWh | SoC %), not standalone column
- **Full-width table layout** — Event column uses `width:auto; min-width:154px` to expand and fill available space
- **Scrollbar compensation** — `_setWrapHeight()` measures scrollbar width and adjusts header table width accordingly for perfect alignment
- **Alert pills now show date context for future days** — today shows "3:30pm", future days show "Saturday 3:30pm" (full day name + time)
- **Alerts only appear in FUTURE tab** — automatically cleared on PAST Events tab (warnings are for planned/future events only)
- **All alert types include day context** — Grid Export, Grid Import, Forced Export, and Forced Import warnings all formatted with day name for clarity

## v2.5.1
- **Date timezone fix** — Past tab now uses `toLocaleDateString('en-AU')` for display labels, matching HAEO card's proven approach
- Friday 8 May now correctly displays as Friday, not Saturday (fixed UTC offset issue in date parsing)

## v2.5.0
- **GloBird Super Export cap tracking** — daily export cap reset with tightened `lastDayForCap` logic using consistent `toLocaleDateString('en-CA')` format
- **Delta threshold tolerance** — changed `delta < 0` to `delta < -0.01` to filter floating-point noise around midnight
- **Past tab single-pass render** — eliminated two-pass approach, now uses running totals (`curPastDay`, `curPastKwh`) with inline day header injection
- **GloBird super export remaining pill** — displays in status bar showing "⚡ Super Export: X.X kWh remaining" (green) or "Cap reached" (orange)
- **Refactored future tab rendering** — split `_renderFuture()` into smaller methods (`_buildSbar`, `_buildDayHeaderRow`, `_buildTimelineRow`) for maintainability

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
