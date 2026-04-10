# HAEO Events Card (`haeo-events-card.js`)

A custom Home Assistant Lovelace card for the **Home Assistant Energy Optimiser (HAEO)** integration. Displays the optimizer's forecast decisions in a **Future Decisions** tab and your inverter's historical energy data in a **Past Events** tab — both in a single, scrollable table with grouped kW and kWh columns.

**Current version:** `v2.1.5`

---

## Features

- **Future Decisions tab** — shows the HAEO optimizer's forecast for the next several days, reading directly from the `forecast` attributes on your HAEO sensors. Includes:
  - Event classification (Solar → Home, Battery → Home, Grid charging, Force Export, etc.)
  - Buy and Sell price per slot
  - Load, PV, Grid and Battery kW and kWh columns
  - SoC % with colour warnings at low levels
  - Cost/Profit per slot and estimated daily totals
  - Status bar: SoC now, Morning/Peak SoC, current buy/sell prices, grid import/export warnings
  - Smart auto-refresh timed to HA's 5-minute update boundary

- **Past Events tab** — reads history from the HA recorder for the same sensors, aligned to 5-minute slots. Includes:
  - Event classification based on actual recorded power values
  - kWh delta columns from `total_increasing` energy sensors
  - Daily kWh totals (Load, PV, Grid, Battery) and daily Cost/Profit
  - Range selector: Today / Yesterday / Last 24h / 48h / 72h / 96h / 7 days
  - Auto-switches to Last 24h if Today has no data yet

- **Colour coding** — row backgrounds reflect the event type; kW/kWh values are individually coloured:
  - Grid: export = green (earning), import = red (costing)
  - Battery: charging from solar = green, charging from grid = amber, discharging = red

- **Configurable sensor mappings** — defaults to HAEO optimizer sensors and Sigenergy Local Modbus energy sensors; any sensor can be overridden via card YAML

- **Auto unit detection** — reads `unit_of_measurement` from live sensor state and normalises to kW / kWh automatically (supports W, kW, MW, Wh, kWh, MWh, GWh)

- **Full-width layout** — designed for HA Sections dashboard with `grid_options: columns: full`

---

## Requirements

- Home Assistant with the [HAEO (Home Assistant Energy Optimiser)](https://github.com/energypatrikf/home-assistant-energy-optimizer) integration installed and running
- An inverter integration providing `total_increasing` energy sensors for kWh columns (Sigenergy Local Modbus defaults provided; any integration can be used)
- HA recorder enabled (for Past Events history queries)

---

## Installation

See the [root README](../README.md) for HACS installation. For manual installation:

1. Copy `haeo-events-card.js` to `/config/www/haeo-events-card.js`
2. Add `/local/haeo-events-card.js` as a **JavaScript module** resource
3. Hard-refresh your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`)

---

## Basic Usage

```yaml
type: custom:haeo-events-card
grid_options:
  columns: full
```

---

## Sensor Configuration

### Power Sensors (HAEO optimizer)

| Config key | Default entity | Notes |
|---|---|---|
| `entity_battery` | `sensor.battery_active_power` | kW, positive=discharge, negative=charge |
| `entity_grid` | `sensor.grid_active_power` | kW, negative=export, positive=import |
| `entity_load` | `sensor.load_power` | kW |
| `entity_solar` | `sensor.solar_power` | kW |
| `entity_soc` | `sensor.battery_state_of_charge` | % |
| `entity_buy_price` | `number.grid_import_price` | $/kWh |
| `entity_sell_price` | `number.grid_export_price` | $/kWh |
| `entity_grid_net_cost` | `sensor.grid_net_cost` | $ per period |

### Energy Sensors (inverter integration)

> **Important:** Use **lifetime/total** sensors wherever possible. Daily or monthly sensors reset at midnight or month-end, causing gaps (shown as `—`) when the Past Events range spans a reset boundary.

| Config key | Default entity | Notes |
|---|---|---|
| `entity_energy_load` | `sensor.sigen_plant_total_load_consumption` | Lifetime total |
| `entity_energy_solar` | `sensor.sigen_plant_total_pv_generation` | Lifetime total |
| `entity_energy_grid_import` | `sensor.sigen_plant_total_imported_energy` | Lifetime total |
| `entity_energy_grid_export` | `sensor.sigen_plant_total_exported_energy` | Lifetime total |
| `entity_energy_batt_charge` | `sensor.sigen_plant_daily_battery_charge_energy` | Daily reset — gaps at midnight |
| `entity_energy_batt_discharge` | `sensor.sigen_plant_daily_battery_discharge_energy` | Daily reset — gaps at midnight |

---

## Full Configuration Example

```yaml
type: custom:haeo-events-card
grid_options:
  columns: full

# ── Override energy sensors for a non-Sigenergy inverter ──
entity_energy_load:           sensor.my_inverter_total_load_consumption
entity_energy_solar:          sensor.my_inverter_total_pv_generation
entity_energy_grid_import:    sensor.my_inverter_total_imported_energy
entity_energy_grid_export:    sensor.my_inverter_total_exported_energy
entity_energy_batt_charge:    sensor.my_inverter_total_battery_charge
entity_energy_batt_discharge: sensor.my_inverter_total_battery_discharge
```

---

## Column Reference

| Column | Description |
|---|---|
| Time | Slot start time |
| Event | Classified activity label |
| Buy $/kWh | Grid import price for this slot |
| Sell $/kWh | Grid export price for this slot |
| Load kW / kWh | Home consumption |
| PV kW / kWh | Solar generation |
| Grid kW / kWh | Negative = export (green), Positive = import (red) |
| Battery kW / kWh | Negative = discharging (red), Positive = charging (green/amber) |
| SoC % | Battery state of charge |
| Cost/Profit | Net grid cost for the slot (`-$` = expense, `$` = earning) |

---

## Event Classification

| Row colour | Meaning |
|---|---|
| 🟢 Green (light) | Solar self-consumption |
| 🩵 Teal | Battery + Solar self-consumption |
| 🟡 Yellow | Battery-only self-consumption |
| 🔴 Red (light) | Grid import or forced grid charge |
| 🟩 Dark green | Force export to grid (earning) |
| 🌸 Pink | Mixed sources including grid import |

---

## Related

- [HAEO Integration](https://github.com/energypatrikf/home-assistant-energy-optimizer)
- [Sigenergy Local Modbus Integration](https://github.com/TypQxQ/Sigenergy-Local-Modbus)
