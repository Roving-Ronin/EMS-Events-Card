# Energy Manager Events Card - Sensor Usage

## Overview
This document outlines all sensors and input entities used by the Energy Manager Events Card, organized by view (FUTURE/PAST) and category.

---

## Sensor Usage Table

| **Category** | **Sensor** | **FUTURE** | **PAST** | **Purpose** |
|---|---|---|---|---|
| **Core Plan Data** | `sensor.energy_manager_plan` | ✅ | | Timeline with expected power flows |
| | `sensor.energy_manager_decision` | ✅ | | Current decision metadata |
| **Battery** | `sensor.inverter_battery_level` | ✅ | | Current SoC % |
| | `sensor.inverter_battery_capacity` | ✅ | | Battery kWh capacity |
| | `sensor.inverter_battery_charging_power` | ✅ | ✅ | Current charge rate / Historical data |
| | `sensor.inverter_battery_discharging_power` | ✅ | ✅ | Current discharge rate / Historical data |
| **Inverter** | `sensor.inverter_pv_power` | ✅ | ✅ | Solar generation (kW) - current & historical |
| | `sensor.inverter_load_power` | ✅ | ✅ | Home load (kW) - current & historical |
| | `sensor.inverter_export_power` | ✅ | ✅ | Export rate (kW) - current & historical |
| | `sensor.inverter_import_power` | ✅ | ✅ | Import rate (kW) - current & historical |
| | `sensor.inverter_current_export_power_limit` | ✅ | | Grid export limit (kW) |
| | `sensor.inverter_current_max_charge_power` | ✅ | | Max charge rate (kW) |
| **Daily Financials** | `sensor.import_formatted` | ✅ | | Daily import cost ($) |
| | `sensor.export_formatted` | ✅ | | Daily export income ($) |
| | `sensor.net_formatted` | ✅ | | Daily net ($ imported - exported) |
| | `sensor.daily_imported_energy` | ✅ | | Daily kWh imported |
| | `sensor.daily_exported_energy` | ✅ | | Daily kWh exported |
| | `sensor.daily_consumed_energy` | ✅ | | Daily kWh consumed |
| **Tariff (Globird)** | `input_number.globird_super_sell` | ✅ | | Super export price ($/kWh) |
| | `input_number.globird_std_sell` | ✅ | | Standard export price ($/kWh) |
| | `input_number.globird_other_sell` | ✅ | | Other export price ($/kWh) |
| | `input_number.globird_free_buy_price` | ✅ | | Free import window price |
| | `input_number.globird_peak_buy_price` | ✅ | | Peak import price ($/kWh) |
| | `input_number.globird_other_buy_price` | ✅ | | Other import price ($/kWh) |
| **Export Limits (Globird)** | `input_number.globird_super_max_export_kw_percentage` | ✅ | | Super export % limit |
| | `input_number.globird_other_max_export_kw_percentage` | ✅ | | Other export % limit |
| | `input_number.globird_bad_weather_max_export` | ✅ | | Bad weather restriction (%) |
| | `input_number.inverter_export_power_hardlimit` | ✅ | | Inverter hard export limit (kW) |
| **Time Windows (Globird)** | `input_datetime.globird_super_start` | ✅ | | Super export window start time |
| | `input_datetime.globird_super_end` | ✅ | | Super export window end time |
| | `input_datetime.globird_free_buy_start` | ✅ | | Free import window start time |
| | `input_datetime.globird_free_buy_end` | ✅ | | Free import window end time |
| | `input_datetime.globird_peak_buy_start` | ✅ | | Peak import window start time |
| | `input_datetime.globird_peak_buy_end` | ✅ | | Peak import window end time |
| | `input_datetime.globird_std_start` | ✅ | | Standard rate window start time |
| | `input_datetime.globird_std_end` | ✅ | | Standard rate window end time |
| **Tariff (Flow Power)** | `input_number.flowpower_buy_price` | ✅ | | Buy price ($/kWh) |
| | `input_number.flowpower_offpeak_feedin_price` | ✅ | | Off-peak export price |
| | `input_number.flowpower_peak_feedin_price` | ✅ | | Peak export price |
| | `input_datetime.flowpower_peak_start_time` | ✅ | | Peak time window start |
| | `input_datetime.flowpower_peak_end_time` | ✅ | | Peak time window end |

---

## Summary Statistics

- **Total sensors referenced:** 50+
- **FUTURE view sensors:** 40+ (planning & monitoring)
- **PAST view sensors:** 6+ (historical inverter data)
- **Shared between both:** Inverter power sensors, battery, load, solar
- **Globird-specific:** 18
- **Flow Power-specific:** 5
- **Generic/inverter:** 12+

---

## Key Findings

### FUTURE View
✅ **Comprehensive** - Uses all available sensors for detailed timeline planning
- Energy plan timeline data (expected power flows)
- Real-time inverter status
- Tariff information
- Export/import limits
- Time-based windows for smart limiting

### PAST View
✅ **Historical Actual Data** - Shows what actually happened using inverter sensors
- Uses **actual inverter sensors** with historical data lookup:
  - `sensor.inverter_import_power` (actual grid imports)
  - `sensor.inverter_export_power` (actual grid exports)
  - `sensor.inverter_pv_power` (actual solar generation)
  - `sensor.inverter_load_power` (actual home consumption)
  - `sensor.inverter_battery_charging_power` (actual charge)
  - `sensor.inverter_battery_discharging_power` (actual discharge)
- Displays real historical data with time-series lookup via `_emec_getAt()` function
- Data converted from Watts to kW for display

### Data Comparison
| Aspect | FUTURE | PAST |
|--------|--------|------|
| **Data Source** | Energy Manager plan (expected) | Inverter sensors (actual) |
| **Time Basis** | Forward-looking timeline | Historical records |
| **Grid Column** | Planned import/export | Actual import/export |
| **Accuracy** | Forecast/prediction | Measured reality |

---

## Provider-Specific Sensors

### Globird Users
- 8 tariff price inputs (`globird_*_buy/sell`)
- 8 time window inputs for 4 rate periods
- 3 export limit controls

### Flow Power Users
- 2 tariff price inputs
- 1 time window (peak period)

### All Users
- 12+ generic inverter sensors
- 6 daily financial sensors
- 1 core plan sensor
