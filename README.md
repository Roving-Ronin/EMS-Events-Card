# Energy Management Systems — Events Card

A collection of custom Home Assistant Lovelace cards for energy management and optimisation systems. All three cards share a consistent two-tab layout (Future Decisions + Past Events), column structure, colour conventions and auto-refresh behaviour.

> **Install once via HACS — all three cards are registered as dashboard resources automatically.**

---

## Cards

| Card | Type | For | Version |
|------|------|-----|---------|
| [EM Events Card](./EnergyManager/) | `custom:em-events-card` | [Energy Manager](https://energymanager.com.au/usersc/join.php?ref=FE8J34EN)  | v2.4.11 |
| [HAEO Events Card](./HAEO/) | `custom:haeo-events-card` | HAEO [Home Assistant Energy Optimiser](https://haeo.io/) | v2.3.6 |
| [EMHASS Events Card](./EMHASS/) | `custom:emhass-events-card` | EMHASS [Energy Management for Home Assistant](https://emhass.readthedocs.io/en/latest/) | v2.1.5 |

---

## Installation via HACS

1. In Home Assistant open **HACS → Frontend**
2. Click the **⋮** menu → **Custom repositories**
3. Add [https://github.com/Roving-Ronin/ems-events-cards](https://github.com/Roving-Ronin/EMS-Events-Card) with category **Dashboard**
4. Search for **Energy Management Systems - Events Cards** and click **Download**
5. Hard-refresh your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`)

All three card types will be available immediately — add whichever you need to your dashboard.

---

## Manual Installation

1. Download `cards.js`, `em-events-card.js`, `haeo-events-card.js` and `emhass-events-card.js` from the [latest release](https://github.com/Roving-Ronin/ems-events-cards/releases/latest)
2. Copy all four files to `/config/www/` on your HA server
3. Go to **Settings → Dashboards → Resources** and add `/local/cards.js` as a **JavaScript module**
4. Hard-refresh your browser

---

## Adding Cards to Your Dashboard

Once installed, add whichever card(s) apply to your setup:

### Energy Manager
```yaml
type: custom:em-events-card
grid_options:
  columns: full
```

### HAEO
```yaml
type: custom:haeo-events-card
grid_options:
  columns: full
```

### EMHASS
```yaml
type: custom:emhass-events-card
grid_options:
  columns: full
```

See each card's README for full configuration options and required sensors.

---

## Card Documentation

- 📄 [EM Events Card README](./EnergyManager/README.md)
- 📄 [HAEO Events Card README](./HAEO/README.md)
- 📄 [EMHASS Events Card README](./EMHASS/README.md)

---

## Versioning

Each card is versioned independently using `v[major].[minor].[patch]`. The version is displayed in the card's legend footer. Release tags follow the format `v[em].[haeo].[emhass]` (e.g. `v2.4.8-2.1.5-2.0.9`).

---

## License

MIT — see [LICENSE](./LICENSE)
