# Energy Management Systems — Events Card


![release](https://img.shields.io/github/v/release/Roving-Ronin/EMS-Events-Card?style=flat-square&color=green)
![HACS](https://img.shields.io/badge/HACS-Custom-orange?style=flat-square)
![maintained](https://img.shields.io/badge/maintained-yes-brightgreen?style=flat-square)
![commit activity](https://img.shields.io/github/commit-activity/y/Roving-Ronin/EMS-Events-Card?style=flat-square)
![license](https://img.shields.io/badge/license-CC--BY--NC--SA--4.0-lightgrey?style=flat-square)

___

A collection of custom Home Assistant Lovelace cards for energy management and optimisation systems. All three cards share a consistent two-tab layout (Future Decisions + Past Events), column structure, colour conventions and auto-refresh behaviour.


> **Install once via HACS — all three cards are registered as dashboard resources automatically.**

### Future Decisions

![Energy Manager - Future Decisions](/EnergyManager/EM-Card-Future.jpg)

### Past Events

![Energy Manager - Past Events](/EnergyManager/EM-Card-Past-Events.jpg)

---

## Cards

| Card | Type | For | Version |
|------|------|-----|---------|
| [EM Events Card](./EnergyManager/) | `custom:em-events-card` | [Energy Manager](https://energymanager.com.au/usersc/join.php?ref=FE8J34EN)  | v2.7.11 |
| [HAEO Events Card](./HAEO/) | `custom:haeo-events-card` | HAEO [Home Assistant Energy Optimiser](https://haeo.io/) | v3.2.2 |
| [EMHASS Events Card](./EMHASS/) | `custom:emhass-events-card` | EMHASS [Energy Management for Home Assistant](https://emhass.readthedocs.io/en/latest/) | v2.6.6 |

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
1. Download the latest files from the `dist/` folder in this repository. Ensure you download `cards.js` as well as the individual card files (`em-events-card.js`, `emhass-events-card.js`, `haeo-events-card.js`).
2. In your Home Assistant `config` directory, navigate to the `www/` folder (create it if it doesn't exist).
3. Create a new folder inside `www/` called `ems-events-card`.
4. Copy all the `.js` files you downloaded from the `dist/` folder into `config/www/ems-events-card/`.
5. In Home Assistant, go to **Settings** > **Dashboards**.
6. Click the three dots in the top right corner and select **Resources**.
7. Click **Add Resource** in the bottom right corner.
8. Configure the resource with the following details:
   - **URL:** `/local/ems-events-card/cards.js`
   - **Resource Type:** `JavaScript Module`
9. Click **Create** and then refresh your browser.


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

## Individual Card Documentation

- 📄 <a href="https://github.com/Roving-Ronin/EMS-Events-Card/blob/main/EnergyManager/README.md" target="_blank">EM Events Card README</a>
- 📄 <a href="https://github.com/Roving-Ronin/EMS-Events-Card/blob/main/HAEO/README.md" target="_blank">HAEO Events Card README</a>
- 📄 <a href="https://github.com/Roving-Ronin/EMS-Events-Card/blob/main/EMHASS/README.md" target="_blank">EMHASS Events Card README</a>

---

## Versioning

Each card is versioned independently using `v[major].[minor].[patch]`. The version is displayed in the card's legend footer. Release tags follow the format `v[em].[haeo].[emhass]` (e.g. `v2.4.8-2.1.5-2.0.9`).

---

## Credits: 

Based off the initial version of an EMHASS card by Matt xxx ( Discord ID: matt099351 )

---

## License

Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International — see [LICENSE](./LICENSE)
