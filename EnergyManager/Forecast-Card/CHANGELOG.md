# Changelog — EM Forecast Card

All notable changes to `em-forecast-card.js` are documented here.

---

## v1.0.0

First release, bundled from EMS-Events-Card v1.8.0.

* Compact table of the next N slots (default 10) from `sensor.energy_manager_plan`; started slots are skipped
* Decision labels, row colours, provider-aware pricing (Globird / Flow Power / plan) and Globird super-export cap shared with EM Events Card v3.6.3
* ✂️ Curtailed kW and 💲 cost / profit per slot
* Window totals (import, export, curtailed, EV kWh, net cost / profit) right-aligned in the title row
* EV column auto-shown only when the window contains EV charging (`show_ev: auto | true | false`)
* Icon-only, centred column headers with units underneath and hover tooltips; MDI transmission-tower icons for grid, import and export
* Re-renders on plan / provider change and once a minute
* Entity-derived text and the `currency_symbol` option are HTML-escaped
