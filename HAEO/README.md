# HAEO Events Card (`haeo-events-card.js`)

A custom Home Assistant Lovelace card for the **Home Assistant Energy Optimiser (HAEO)** integration. Displays the optimizer's forecast decisions in a **Future Decisions** tab and your inverter's actual historical sensor readings in a **Past Events** tab — both in a single, scrollable table with grouped kW and kWh columns.

**Current version:** `v2.3.8`

---

## Features

- **Future Decisions tab** — shows the HAEO optimizer's forecast for the next several days, reading directly from the `forecast` attributes on your HAEO sensors. Includes:
  - Event classification (Solar → Home, Battery → Home, Grid charging, Force Export, etc.)
  - Buy and Sell price per slot
  - Load, PV, Grid and Battery kW and kWh columns
  - SoC % with colour warnings at low levels
  - Cost/Profit per slot and daily totals — calculated from per-slot deltas of `sensor.grid_net_cost`
  - Status bar: SoC now, Morning/Peak SoC, current buy/sell prices, colour-coded grid import/export pill badges with 12h times
  - Smart auto-refresh timed to HA's 5-minute update boundary

- **Past Events tab** — reads actual inverter sensor history from the HA recorder, aligned to 5-minute slots. Uses real inverter power measurements (not HAEO planned values) for accurate event classification. Includes:
  - Event classification from actual inverter power readings
  - kWh delta columns from `total_increasing` energy sensors, with fallback estimation when sensor data is unavailable
  - Daily kWh totals (Load, PV, Grid, Battery) and daily Cost/Profit
  - Range selector: Today / Yesterday / Last 24h / 48h / 72h / 96h / 7 days
  - Auto-switches to Last 24h if Today has no data yet

- **Colour coding** — row backgrounds reflect the event type; kW/kWh values are individually coloured:
  - Grid: export = green (earning), import = red (costing)
  - Battery: charging from solar = green, charging from grid = amber, discharging = red
  - Values below display threshold (±100W grid/battery, 50W PV) show as `—` in default text colour

- **Two sensor groups** — Future tab uses HAEO optimizer sensors (forecast attributes); Past tab uses inverter power sensors (actual measurements). Both groups are fully configurable via card YAML.

- **Auto unit detection** — reads `unit_of_measurement` from live sensor state and normalises to kW / kWh automatically (supports W, kW, MW, Wh, kWh, MWh, GWh)

- **Reliability** — Shadow DOM rebuild detection resets Past tab state on dashboard navigation; stuck-loading recovery retries after 30 seconds if a WebSocket call silently fails

- **Full-width layout** — designed for HA Sections dashboard with `grid_options: columns: full`

---

## Requirements

- Home Assistant with the [HAEO (Home Assistant Energy Optimiser)](https://github.com/energypatrikf/home-assistant-energy-optimizer) integration installed and running
- An inverter integration providing real-time power sensors and `total_increasing` energy sensors (Sigenergy Local Modbus defaults provided; any integration can be configured)
- HA recorder enabled (for Past Events history queries)

---

## Installation

1. Copy `haeo-events-card.js` to your HA config directory:
   ```
   /config/www/haeo-events-card.js
   ```

2. Add it as a Lovelace resource. In HA go to **Settings → Dashboards → ⋮ → Manage resources** and add:
   - **URL:** `/local/haeo-events-card.js`
   - **Type:** JavaScript module

   Or add it manually to your `configuration.yaml` / `ui-lovelace.yaml`:
   ```yaml
   resources:
     - url: /local/haeo-events-card.js
       type: module
   ```

3. Hard-refresh your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) to load the new resource.

---

## Basic Usage

The simplest configuration — uses all HAEO default sensor names and Sigenergy Local Modbus defaults:

```yaml
type: custom:haeo-events-card
grid_options:
  columns: full
```

---

## Sensor Configuration

The card uses three groups of sensors, split by tab and purpose.

### Future Tab — HAEO Optimizer Sensors

These are provided by the HAEO integration and are the same for all installs. The card reads their `forecast` attributes for the Future Decisions tab, and their recorded history for SoC and price columns in the Past Events tab. **No configuration is needed** unless you have renamed them.

| Config key | Default entity | Notes |
|---|---|---|
| `entity_haeo_battery` | `sensor.battery_active_power` | kW, positive=discharge, negative=charge |
| `entity_haeo_grid` | `sensor.grid_active_power` | kW, positive=import, negative=export |
| `entity_haeo_load` | `sensor.load_power` | kW, always positive |
| `entity_haeo_solar` | `sensor.solar_power` | kW, always positive |
| `entity_haeo_soc` | `sensor.battery_state_of_charge` | % |
| `entity_haeo_buy_price` | `number.grid_import_price` | $/kWh |
| `entity_haeo_sell_price` | `number.grid_export_price` | $/kWh |
| `entity_haeo_grid_net_cost` | `sensor.grid_net_cost` | Cumulative $ total — card computes per-slot deltas |

### Past Tab — Inverter Power Sensors

These provide the actual measured power values used for event classification and kW display in the Past Events tab. Defaults are for the [Sigenergy Local Modbus](https://github.com/TypQxQ/Sigenergy-Local-Modbus) integration. Override these for other inverter integrations.

| Config key | Default entity | Sign convention |
|---|---|---|
| `entity_past_battery_power` | `sensor.sigen_plant_battery_power` | negative=discharge, positive=charge |
| `entity_past_load_power` | `sensor.sigen_plant_total_load_power` | always positive |
| `entity_past_solar_power` | `sensor.sigen_plant_pv_power` | always positive |
| `entity_past_grid_power` | `sensor.sigen_plant_grid_active_power` | positive=import, negative=export |

### Past Tab — Inverter Energy Sensors

These provide the kWh delta columns in the Past Events tab. Defaults are for the [Sigenergy Local Modbus](https://github.com/TypQxQ/Sigenergy-Local-Modbus) integration.

> **Important:** Use **lifetime/total** sensors wherever possible. Daily or monthly sensors reset at midnight or month-end, causing gaps (shown as `—`) when the Past Events range spans a reset boundary. The battery sensors below are daily-reset — lifetime variants are preferred if your integration provides them.

| Config key | Default entity | Notes |
|---|---|---|
| `entity_past_load_energy` | `sensor.sigen_plant_total_load_consumption` | Lifetime total |
| `entity_past_solar_energy` | `sensor.sigen_plant_total_pv_generation` | Lifetime total |
| `entity_past_grid_import_energy` | `sensor.sigen_plant_total_imported_energy` | Lifetime total |
| `entity_past_grid_export_energy` | `sensor.sigen_plant_total_exported_energy` | Lifetime total |
| `entity_past_battery_charge_energy` | `sensor.sigen_plant_daily_battery_charge_energy` | Daily reset — gaps at midnight |
| `entity_past_battery_discharge_energy` | `sensor.sigen_plant_daily_battery_discharge_energy` | Daily reset — gaps at midnight |

---

## Full Configuration Example

```yaml
type: custom:haeo-events-card
grid_options:
  columns: full

# ── FUTURE tab: HAEO optimizer sensors (only needed if you have renamed them) ──
# entity_haeo_battery:       sensor.battery_active_power
# entity_haeo_grid:          sensor.grid_active_power
# entity_haeo_load:          sensor.load_power
# entity_haeo_solar:         sensor.solar_power
# entity_haeo_soc:           sensor.battery_state_of_charge
# entity_haeo_buy_price:     number.grid_import_price
# entity_haeo_sell_price:    number.grid_export_price
# entity_haeo_grid_net_cost: sensor.grid_net_cost

# ── PAST tab: inverter power sensors (override for non-Sigenergy inverters) ──
entity_past_battery_power: sensor.my_inverter_battery_power
entity_past_load_power:    sensor.my_inverter_load_power
entity_past_solar_power:   sensor.my_inverter_pv_power
entity_past_grid_power:    sensor.my_inverter_grid_power

# ── PAST tab: inverter energy sensors (override for non-Sigenergy inverters) ──
entity_past_load_energy:              sensor.my_inverter_total_load_consumption
entity_past_solar_energy:             sensor.my_inverter_total_pv_generation
entity_past_grid_import_energy:       sensor.my_inverter_total_imported_energy
entity_past_grid_export_energy:       sensor.my_inverter_total_exported_energy
entity_past_battery_charge_energy:    sensor.my_inverter_total_battery_charge
entity_past_battery_discharge_energy: sensor.my_inverter_total_battery_discharge
```

---

## Column Reference

| Column | Description |
|---|---|
| Time | Slot start time |
| Event | Classified activity label |
| Buy $/kWh | Grid import price for this slot |
| Sell $/kWh | Grid export price for this slot |
| Load kW / kWh | Home consumption — always positive |
| PV kW / kWh | Solar generation — `—` below 50W |
| Grid kW / kWh | Positive = import (red), Negative = export (green) — `—` below 100W |
| Battery kW / kWh | Negative = discharging (red), Positive = charging (green/amber) — `—` below 100W |
| SoC % | Battery state of charge |
| Cost/Profit | Net grid cost (`-$` = expense, `$` = earning) — `—` when no grid activity |

Day header rows show daily kWh totals for each column and the net cost/profit for the day.

---

## Event Classification

### Future Decisions

Events are classified from HAEO's forecast power values. HAEO does not expose a mode field, so classification is based purely on the forecast kW values for battery, grid, solar and load. A 50 W (0.05 kW) deadband threshold is used to ignore near-zero values.

### Past Events

Events are classified from actual inverter sensor readings (not HAEO planned values). A 100 W (0.10 kW) threshold is used to filter inverter noise in recorded history. Note that the Past Events tab shows what the inverter physically measured — this may occasionally differ from what HAEO planned if the optimizer's instructions were not followed exactly.

### Event Colour Reference

| Row colour | Meaning |
|---|---|
| 🟢 Light green | Solar self-consumption — solar covering home load |
| 🩵 Teal | Solar + battery self-consumption — no grid |
| 🟡 Yellow | Battery-only or mixed battery/grid |
| 🔴 Dark red | Grid import or forced grid charge — cost incurred |
| 🟩 Dark green | Forced export to grid — profit earned |
| 🌸 Light red | Mixed sources including grid import |

### Full Event List

| Event | Description |
|---|---|
| 🌞 Solar → 🏠 Home | Self Consumption - Solar |
| 🌞 Solar → 🏠 Home + 🔋 Battery | Self Consumption - Charge Battery |
| 🌞 Solar → 🏠 Home + ⚡ Grid | Profit - Grid Export (Solar) |
| 🌞 Solar → 🏠 Home + 🔋 Battery + ⚡ Grid | Profit - Grid Export + Charge Battery |
| 🌞 Solar + 🔋 Battery → 🏠 Home | Self Consumption - No Grid |
| 🌞 Solar + ⚡ Grid → 🏠 Home | Cost - Solar + Grid Import |
| 🌞 Solar + ⚡ Grid → 🏠 Home + 🔋 Battery (Force) | Cost - Solar + Grid Import + Charge Battery |
| 🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force) | Profit - Grid Export (Forced) |
| 🔋 Battery → 🏠 Home | Self Consumption - Battery |
| 🔋 Battery → 🏠 Home + ⚡ Grid (Force) | Profit - Grid Export (Forced) |
| 🔋 Battery + ⚡ Grid → 🏠 Home | Cost - Battery + Grid Import |
| ⚡ Grid → 🏠 Home | Cost - Grid Import (Battery Idle \| No Solar) |
| ⚡ Grid → 🏠 Home + 🔋 Battery (Force) | Cost - Grid Import (Forced Battery Charge) |

---

## Notes

- **Auto-refresh** — the card refreshes at 1 minute past each 5-minute HA update boundary (`:01`, `:06`, `:11`... past the hour) and catches up automatically if the browser tab was hidden
- **Cost/Profit (Future tab)** — `sensor.grid_net_cost` is a cumulative running total; the card computes per-slot deltas (`value[i] - value[i-1]`) for accurate per-row and daily totals. Only shown when grid flow exceeds 0.05 kW
- **Cost/Profit (Past tab)** — calculated from grid kW × buy/sell price × slot duration; only shown when grid flow exceeds 0.10 kW
- **Display thresholds** — Grid and Battery kW/kWh values below ±100W show as `—`; PV below 50W shows as `—`. This suppresses inverter sensor noise without affecting event classification thresholds
- **Unit detection** — `unit_of_measurement` is read from each sensor's live state and values are normalised automatically. Supported units: W / kW / MW (power) and Wh / kWh / MWh / GWh (energy). A browser console warning is logged if a power value exceeds 500 kW after conversion, which may indicate a misconfigured sensor
- **Past Events accuracy** — the Past tab reads inverter sensor history recorded by HA. Classification accuracy depends on how frequently your inverter sensors update and whether HA's recorder captures each 5-minute slot. Values shown are real measurements, not HAEO's planned decisions
- **Dashboard type** — designed for the HA **Sections** dashboard with `grid_options: columns: full`

---

## Related

- [HAEO Integration](https://github.com/energypatrikf/home-assistant-energy-optimizer)
- [Sigenergy Local Modbus Integration](https://github.com/TypQxQ/Sigenergy-Local-Modbus)
- [Energy Manager Card](../EM) — equivalent card for the EMHASS energy manager
