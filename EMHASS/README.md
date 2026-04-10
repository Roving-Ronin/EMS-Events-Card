# EMHASS Events Card (`emhass-events-card.js`)

A custom Home Assistant Lovelace card for [EMHASS](https://emhass.readthedocs.io/) (Energy Management for Home Assistant) that displays MPC optimizer forecasts and historical energy events in a rich, colour-coded table.

Designed for the **Sigenergy + EMHASS MPC** setup documented at [sigenergy.annable.me](https://sigenergy.annable.me/emhass/), with three-tier sensor fallback so it also works with standard EMHASS installations.

**Current version:** `v2.0.9`

---

## Features

- **📅 Future Decisions tab** — full MPC forecast horizon showing every 5-minute optimization decision
- **📋 Past Events tab** — historical sensor data with configurable lookback (Today, Yesterday, 24h–7 days)
- **Colour-coded event rows** — instantly see what the optimizer is doing at each timestep
- **HAEO-style flow labels** — descriptive events like `🌞 Solar → 🏠 Home + 🔋 Battery + ⚡ Grid`
- **Status bar** — current SoC, morning/peak SoC forecast, buy/sell prices, net cost, grid alerts
- **Daily summary rows** — kWh totals per day for Load, PV, Grid and Battery
- **Cost/Profit column** — per-row estimated cost or earnings
- **Three-tier sensor fallback** — card YAML config → MPC/Sigenergy sensors → standard EMHASS sensors
- **Auto-refresh** — updates at :01, :06, :11 ... past each hour to align with MPC optimization cycles
- **Adaptive history rows** — Past tab uses actual recorded timestamps rather than fixed slots
- **Sensor debug panel** — expandable diagnostic showing exactly which sensor attributes were found

---

## Requirements

- Home Assistant with a working [EMHASS](https://github.com/davidusb-geek/emhass) installation running `naive-mpc-optim`
- No additional frontend dependencies — pure vanilla JS

---

## Installation

See the [root README](../README.md) for HACS installation. For manual installation:

1. Copy `emhass-events-card.js` to `/config/www/emhass-events-card.js`
2. In Home Assistant go to **Settings → Dashboards → Resources** and add:
   - URL: `/local/emhass-events-card.js`
   - Type: **JavaScript Module**
3. Hard-refresh your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`)

---

## Basic Usage

```yaml
type: custom:emhass-events-card
grid_options:
  columns: full
  rows: auto
```

The card auto-detects sensors using its three-tier fallback.

---

## Sensor Configuration

The card resolves each sensor through three tiers in priority order:

| Priority | Source | Description |
|---|---|---|
| 1 | Card YAML config | Explicit overrides you provide in the card config |
| 2 | MPC / Sigenergy defaults | `sensor.mpc_*` sensors from the annable.me setup |
| 3 | Standard EMHASS defaults | `sensor.p_batt_forecast`, `sensor.unit_load_cost` etc. |

### Default sensor mapping (Tier 2 — MPC/Sigenergy)

| Role | Default sensor | Attribute |
|---|---|---|
| Battery power forecast | `sensor.mpc_batt_power` | `battery_scheduled_power` |
| Battery SoC forecast | `sensor.mpc_batt_soc` | `battery_scheduled_soc` |
| Grid power forecast | `sensor.mpc_grid_power` | `forecasts` |
| PV power forecast | `sensor.mpc_pv_power` | `forecasts` |
| Load power forecast | `sensor.mpc_load_power` | `forecasts` |
| Buy price (future) | `sensor.mpc_general_price` | `unit_load_cost_forecasts` |
| Sell price (future) | `sensor.mpc_feed_in_price` | `unit_prod_price_forecasts` |
| Net cost | `sensor.mpc_cost_fun` | — |
| Buy price (past tab) | `sensor.amber_express_home_general_price` | — |
| Sell price (past tab) | `sensor.amber_express_home_feed_in_price` | — |

### Full YAML override example

```yaml
type: custom:emhass-events-card
grid_options:
  columns: full
  rows: auto

p_batt_forecast:   sensor.mpc_batt_power
p_grid_forecast:   sensor.mpc_grid_power
p_pv_forecast:     sensor.mpc_pv_power
p_load_forecast:   sensor.mpc_load_power
soc_forecast:      sensor.mpc_batt_soc
buy_price:         sensor.mpc_general_price
sell_price:        sensor.mpc_feed_in_price
net_cost:          sensor.mpc_cost_fun

past_buy_price:    sensor.amber_general_price
past_sell_price:   sensor.amber_feed_in_price

energy_load:           sensor.sigen_plant_total_load_consumption
energy_solar:          sensor.sigen_plant_total_pv_generation
energy_grid_import:    sensor.sigen_plant_total_imported_energy
energy_grid_export:    sensor.sigen_plant_total_exported_energy
energy_batt_charge:    sensor.sigen_plant_daily_battery_charge_energy
energy_batt_discharge: sensor.sigen_plant_daily_battery_discharge_energy
```

---

## Recorder Configuration

For the **Past Events tab** to work, the MPC sensors must be recorded by HA:

```yaml
recorder:
  include:
    entity_globs:
      - sensor.mpc_*
```

---

## Sign Conventions

| Sensor | Positive | Negative |
|---|---|---|
| Battery (`mpc_batt_power`) | Discharging (SoC falls) | Charging (SoC rises) |
| Grid (`mpc_grid_power`) | Import (buying) | Export (selling) |
| PV / Load | Always positive | — |

Battery display **negates** the raw value: discharging → `-x.xx kW` red, charging → `x.xx kW` green.

---

## Event Classification

| Row colour | Meaning |
|---|---|
| 🟡 Yellow-green | Solar self-consumption, charging or exporting |
| 🩵 Teal | Solar + battery, no grid |
| 🔴 Pink-red | Grid import or forced grid charge |
| 🟢 Dark green | Forced export: solar + battery |

---

## Related Projects

- [EMHASS](https://github.com/davidusb-geek/emhass) — Energy Management for Home Assistant
- [Sigenergy + EMHASS guide](https://sigenergy.annable.me/emhass/)
- [HAEO Events Card](../haeo-events-card/)
