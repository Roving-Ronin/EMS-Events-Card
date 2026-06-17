# Energy Management Systems — Events Card


![release](https://img.shields.io/github/v/release/Roving-Ronin/EMS-Events-Card?style=flat-square&color=green)
![HACS](https://img.shields.io/badge/HACS-Custom-orange?style=flat-square)
![maintained](https://img.shields.io/badge/maintained-yes-brightgreen?style=flat-square)
![commit activity](https://img.shields.io/github/commit-activity/y/Roving-Ronin/EMS-Events-Card?style=flat-square)
![license](https://img.shields.io/badge/license-CC--BY--NC--SA--4.0-lightgrey?style=flat-square)

___
> **Install once via HACS — all three cards are registered as dashboard resources automatically.**
> 
A collection of custom Home Assistant Lovelace cards for energy management and optimisation systems. All three cards share a consistent two-tab layout (Future Decisions + Past Events), column structure, colour conventions and auto-refresh behaviour. Depending upon the sensors and specific data available from each of the EMS, the card differs slightly between each of the different versions. The example screenshots below are usually based off the HAEO version.


### Future Decisions

![HAEO - Future Decisions](/HAEO/HAEO-Card-Future-Decisions.png)

### Past Events

![Energy Manager - Past Events](/HAEO/HAEO-Card-Past-Events.png)

---

## Cards

For more detailed views and information for each specific card, please refer to their read.me files (below):

| Card | Type | For | Version |
|------|------|-----|---------|
| <a href="https://github.com/Roving-Ronin/EMS-Events-Card/blob/main/EnergyManager/" target="_blank">EM Events Card</a> | `custom:em-events-card` | <a href="https://energymanager.com.au/usersc/join.php?ref=FE8J34EN" target="_blank">Energy Manager</a> | v2.8.8 |
| <a href="https://github.com/Roving-Ronin/EMS-Events-Card/blob/main/HAEO/" target="_blank">HAEO Events Card</a> | `custom:haeo-events-card` | HAEO <a href="https://haeo.io/" target="_blank">Home Assistant Energy Optimiser</a> | v3.2.69 |
| <a href="https://github.com/Roving-Ronin/EMS-Events-Card/blob/main/EMHASS/" target="_blank">EMHASS Events Card</a> | `custom:emhass-events-card` | EMHASS <a href="https://emhass.readthedocs.io/en/latest/" target="_blank">Energy Management for Home Assistant</a> | v2.6.6 |

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

## Versioning

Each card is versioned independently using `v[major].[minor].[patch]`. The version is displayed in the card's legend footer. Release tags follow the format `v[em].[haeo].[emhass]` (e.g. `v2.4.8-2.1.5-2.0.9`).

---

## Credits: 

Based off the initial version of an EMHASS card by Matt xxx ( Discord ID: matt099351 )

---

## License

Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International — see [LICENSE](./LICENSE)
