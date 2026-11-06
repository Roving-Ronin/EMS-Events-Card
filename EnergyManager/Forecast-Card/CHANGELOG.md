# Changelog — EM Forecast Card

All notable changes to `em-forecast-card.js` are documented here.

---

## v1.0.0

First release, bundled from EMS-Events-Card v1.8.0.

* Compact table of the next N slots (default 10) from `sensor.energy_manager_plan`; started slots are skipped
* Decision labels, row colours, provider-aware pricing (Globird / Flow Power / plan) and Globird super-export cap shared with EM Events Card v3.6.3
* **Icon-only Decision column** — decision labels are drawn as icons (e.g. 🌞 → 🏠+🔋+export tower); the full label and note are in the cell's hover tooltip
* **Grid shown as transmission towers** — grid import uses the red `mdi:transmission-tower-import`, grid export (including Surplus PV) uses the green `mdi:transmission-tower-export`, matching the title-row totals; darker shades on tinted rows for contrast
* **Decision style switch** — small `Aa` button beside the title toggles the Decision column between icons only and the original icon + text labels; the choice is remembered per browser. YAML: `decision_text` (default style), `show_decision_toggle`
* **Forced modes marked with 💪**; EV shown as 🚗 with its charging mode in the tooltip
* Fallback labels for unrecognised plan modes use the same Source → Destination form
* ✂️ Curtailed kW and 💲 cost / profit per slot
* Window totals (import, export, curtailed, EV kWh, net cost / profit) right-aligned in the title row
* EV column auto-shown only when the window contains EV charging (`show_ev: auto | true | false`)
* Icon-only, centred column headers with units underneath and hover tooltips; MDI transmission-tower icons for grid, import and export
* Re-renders on plan / provider change and once a minute
* Entity-derived text and the `currency_symbol` option are HTML-escaped
