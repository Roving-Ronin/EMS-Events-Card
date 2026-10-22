# EM Events Card — Sensors & Entities Used

**Version:** v3.5.1  
**Last Updated:** 2026-10-23

Complete reference of all Home Assistant sensors, automations, and input entities used by the EM Events Card.

---

## Core Plan Data (FUTURE tab)

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `sensor.energy_manager_plan` | Sensor | Energy Manager forecast plan (attributes contain timeline) | ✅ Yes |
| `sensor.energy_manager_decision` | Sensor | Current EM mode/decision metadata | ✅ Yes |
| `automation.update_energy_manager_decision_sensor` | Automation | Triggers card refresh on new plan updates | ✅ Yes |

---

## Inverter Power Data (Both tabs)

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `sensor.inverter_pv_power` | Sensor | Solar generation power (W) | ✅ Yes |
| `sensor.inverter_load_power` | Sensor | Home load power (W) | ✅ Yes |
| `sensor.inverter_import_power` | Sensor | Grid import power (W) | ✅ Yes |
| `sensor.inverter_export_power` | Sensor | Grid export power (W) | ✅ Yes |
| `sensor.inverter_battery_charging_power` | Sensor | Battery charge power (W) | ✅ Yes |
| `sensor.inverter_battery_discharging_power` | Sensor | Battery discharge power (W) | ✅ Yes |

---

## Battery Data

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `sensor.inverter_battery_level` | Sensor | Battery state of charge (%) | ✅ Yes |
| `sensor.inverter_battery_capacity` | Sensor | Battery capacity (kWh) | ✅ Yes |
| `input_number.inverter_max_soc` | Input Number | Maximum SoC limit (%) | ✅ Yes |
| `input_number.battery_charge_power_hardlimit` | Input Number | Max battery charge power (kW) | ✅ Yes |
| `input_number.em_ev_current_soc` | Input Number | EV current SoC (%) — for EV readiness | ⚠️ Optional |

---

## Daily Energy Totals (PAST tab)

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `sensor.daily_consumed_energy` | Sensor | Daily load consumption (kWh) | ✅ Yes |
| `sensor.daily_imported_energy` | Sensor | Daily grid import (kWh) | ✅ Yes |
| `sensor.daily_exported_energy` | Sensor | Daily grid export (kWh) | ✅ Yes |
| `sensor.monthly_solar_generation` | Sensor | Monthly solar generation (kWh) | ✅ Yes |
| `sensor.monthly_imported_energy` | Sensor | Monthly grid import (kWh) | ✅ Yes |
| `sensor.monthly_exported_energy` | Sensor | Monthly grid export (kWh) | ✅ Yes |
| `sensor.monthly_battery_charge` | Sensor | Monthly battery charge (kWh) | ✅ Yes |
| `sensor.monthly_battery_discharge` | Sensor | Monthly battery discharge (kWh) | ✅ Yes |

---

## Export & Charge Limits

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `sensor.inverter_current_export_power_limit` | Sensor | Current export power limit (W) | ✅ Yes |
| `sensor.inverter_current_max_charge_power` | Sensor | Current max charge power (W) | ✅ Yes |
| `sensor.inverter_current_max_soc` | Sensor | Current max SoC limit (%) | ✅ Yes |
| `input_number.inverter_export_power_hardlimit` | Input Number | Grid operator export hard limit (kW) | ✅ Yes |
| `input_number.inverter_import_limit` | Input Number | Inverter import limit (kW) — for Charge Limit pill | ✅ Yes |

---

## EV Charger Data (Optional — v3.5.1+)

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `sensor.charger_current_import` | Sensor | EV charger import power/current (kW or A) | ⚠️ Optional |
| `sensor.charger_energy_session` | Sensor | EV session energy (kWh) | ⚠️ Optional |
| `sensor.charger_status_connector` | Sensor | EV charger connector status | ⚠️ Optional |
| `input_select.em_ev_site_phases` | Input Select | EV charger phase configuration (1/3-phase) | ⚠️ Optional |

---

## Provider Selection

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `input_select.electricity_provider` | Input Select | Selected provider: `Amber Electric`, `LocalVolts`, `Flow Power`, `GloBird`, or `Other` | ✅ Yes |
| `input_select.other_tariff_plan` | Input Select | Custom tariff plan for "Other" provider (format: "Provider - Plan - State - DNSP - Date") | ⚠️ Optional |

---

## Tariff Pricing — Amber Electric / LocalVolts

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `sensor.nodered_buyprice` | Sensor | Current buy price ($/kWh) — fallback for Amber/LocalVolts | ⚠️ Optional |
| `sensor.nodered_sellprice` | Sensor | Current sell price ($/kWh) — fallback for Amber/LocalVolts | ⚠️ Optional |

---

## Tariff Pricing — Flow Power

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `input_number.flowpower_buy_price` | Input Number | Flat buy price (cents/kWh) | ⚠️ Optional |
| `input_number.flowpower_peak_feedin_price` | Input Number | Peak feed-in price (cents/kWh) | ⚠️ Optional |
| `input_number.flowpower_offpeak_feedin_price` | Input Number | Off-peak feed-in price (cents/kWh) | ⚠️ Optional |
| `input_datetime.flowpower_peak_start_time` | Input DateTime | Peak export window start | ⚠️ Optional |
| `input_datetime.flowpower_peak_end_time` | Input DateTime | Peak export window end | ⚠️ Optional |

---

## Tariff Pricing — GloBird

### Buy Pricing

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `input_number.globird_peak_buy_price` | Input Number | Peak buy price (cents/kWh) | ⚠️ Optional |
| `input_number.globird_free_buy_price` | Input Number | Free period buy price (cents/kWh) | ⚠️ Optional |
| `input_number.globird_other_buy_price` | Input Number | Off-peak buy price (cents/kWh) | ⚠️ Optional |

### Buy Time Windows

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `input_datetime.globird_peak_buy_start` | Input DateTime | Peak buy window start | ⚠️ Optional |
| `input_datetime.globird_peak_buy_end` | Input DateTime | Peak buy window end | ⚠️ Optional |
| `input_datetime.globird_free_buy_start` | Input DateTime | Free buy window start | ⚠️ Optional |
| `input_datetime.globird_free_buy_end` | Input DateTime | Free buy window end | ⚠️ Optional |

### Sell Pricing

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `input_number.globird_super_sell` | Input Number | Super export sell price (cents/kWh) | ⚠️ Optional |
| `input_number.globird_std_sell` | Input Number | Standard sell price (cents/kWh) | ⚠️ Optional |
| `input_number.globird_other_sell` | Input Number | Off-peak sell price (cents/kWh) | ⚠️ Optional |

### Sell Time Windows & Caps

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `input_datetime.globird_super_start` | Input DateTime | Super export window start (default 18:00) | ⚠️ Optional |
| `input_datetime.globird_super_end` | Input DateTime | Super export window end (default 21:00) | ⚠️ Optional |
| `input_datetime.globird_std_start` | Input DateTime | Standard sell window start | ⚠️ Optional |
| `input_datetime.globird_std_end` | Input DateTime | Standard sell window end | ⚠️ Optional |
| `input_number.globird_super_max_export` | Input Number | Super export daily cap (kWh, default 10) | ⚠️ Optional |
| `input_number.globird_super_max_export_kw_percentage` | Input Number | Super export as % of system capacity | ⚠️ Optional |
| `input_number.globird_other_max_export_kw_percentage` | Input Number | Standard sell as % of system capacity | ⚠️ Optional |
| `input_number.globird_bad_weather_max_export` | Input Number | Bad weather export limit (kWh) | ⚠️ Optional |

---

## Settings & Features

| Entity | Type | Description | Required |
|--------|------|-------------|----------|
| `input_boolean.enable_curtailing` | Input Boolean | Enable curtailment display (shows Curtailed columns) | ⚠️ Optional |

---

## Historical Data Lookups (PAST tab)

The PAST tab uses Home Assistant's history system to fetch entity state changes within the selected date range. All power and energy sensors listed above are queried for historical 5-minute readings.

---

## Formatted/Derived Data (Internal)

These are computed internally by the card (not entity requirements):

| Entity | Type | Description |
|--------|------|-------------|
| `sensor.export_formatted` | Internal | Formatted grid export display |
| `sensor.import_formatted` | Internal | Formatted grid import display |
| `sensor.net_formatted` | Internal | Formatted net cost/profit display |
| `sensor.solcast_pv_forecast_power_now` | Internal | Used for surplus PV detection (Curtailment) |

---

## Summary

- **Total Entities:** 65+
- **Required (Core):** 18
- **Optional (Provider-specific):** 47+
- **Version:** v3.5.1

### Required for Basic Function
All **Core Plan Data**, **Inverter Power Data**, **Battery Data**, **Daily Totals**, **Export/Charge Limits**, and **Provider Selection** are required.

### Optional / Provider-Specific
EV Charger sensors and all tariff pricing entities are optional and depend on:
- Electricity provider selected
- Whether EV charger integration is configured
- Which features are enabled in card settings
