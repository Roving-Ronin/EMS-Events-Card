# CLAUDE.md — EMS Events Card Development Guide

This document governs development, naming, styling, and release workflows for the **EMS Events Card** bundle repository.

---

## Project Overview

**EMS Events Card** is a Home Assistant Lovelace card bundle providing unified energy management UI across three integrations:

| Card | Type | For | File |
|------|------|-----|------|
| Energy Manager - Events Card | `custom:em-events-card` | Energy Manager addon | `src/em-events-card.js` |
| HAEO - Events Card | `custom:haeo-events-card` | HAEO integration | `src/haeo-events-card.js` |
| EMHASS - Events Card | `custom:emhass-events-card` | EMHASS integration | `src/emhass-events-card.js` |
| Energy Manager - Forecast Card | `custom:em-forecast-card` | Energy Manager addon | `src/em-forecast-card.js` |

Bundle is released as a single version (vX.Y.Z); individual card versions shown in legend footer.

---

## Naming Conventions

### Card Display Names
Use format: **`Product - Card Type`**
- ✅ `Energy Manager - Events Card`
- ✅ `Energy Manager - Forecast Card`
- ✅ `HAEO - Events Card`
- ✅ `EMHASS - Events Card`

**Apply everywhere:**
- GitHub issue template dropdowns
- PR template "Card(s) affected" section
- README cards table
- Badge labels

### File & Code Naming
- **Custom element**: `custom:em-events-card` (kebab-case, no spaces)
- **Function prefix**: `_emec_` (EM Events Card)
- **Version constant**: `_EMEC_VERSION = 'vX.Y.Z'`
- **CSS classes**: kebab-case, card-scoped (e.g., `.em-events-card__header`)

---

## SVG Icons & Visual System

### Transmission Tower Icons
Used in em-events-card.js to show energy flow direction with towers.

**Implementation** (`_emec_svgIcon()` function, lines 86–111):
```javascript
// Tower sizing: 1.3em × 1.3em
// Arrow sizing: 1.8em × 1.3em
// Spacing: -0.4em negative margin (tight, non-overlapping)
```

**Color coding:**
- **Orange** (`#ff9800`) — Grid column header, neutral
- **Red** (`#f44336`) — Import (energy flowing in, cost)
- **Green** (`#4caf50`) — Export (energy flowing out, profit)

**Icon patterns:**
- **Import**: Red left-pointing arrow → Red tower (arrow on left, pointing at tower)
- **Export**: Orange/Green tower → Green right-pointing arrow (tower on left, arrow pointing away)
- **Grid header**: Orange tower only (no arrow)

**Rules:**
- Arrows and towers are separate inline SVG elements (never overlapping)
- Use SVG Repo transmission tower design (path provided in codebase)
- Vertical align: `-0.3em` for baseline alignment with text
- Display: `inline-block` for proper spacing control
- Right margin: `4px` between tower and surrounding text, `-0.4em` between tower and arrow

**Responsive:** Icons scale with `1em` base font size; adjust sizing constants for different contexts.

---

## Badges & README Standards

### Badge Format
All badges use **`style=flat-square`** unless specified otherwise.

**Standard badges:**
```markdown
![HA version][ha-version-badge]
[![Marketplace][marketplace-badge]][hacs-url]
[![Release][release-badge]][release-url]
[![Downloads][downloads-badge]][release-url]
[![Maintained][maintained-badge]][commits-url]
[![Commit Activity][activity-badge]][commits-url]
[![License][license-badge]][license-url]
![Repo Stars][repo-stars-badge]
```

**Label styling:**
- Use `label=` parameter for custom labels
- Format: **Uppercase first letter** (e.g., `label=Release`, `label=Downloads`)
- Use `%20` for spaces: `label=Commit%20Activity`

**Badge definitions:**
```markdown
[ha-version-badge]: https://img.shields.io/badge/Home%20Assistant-2024.6%2B-blue?style=flat-square&color=%2300c29e&logo=homeassistant&logoColor=white
[marketplace-badge]: https://img.shields.io/badge/Marketplace-Default-blue?style=flat-square
[release-badge]: https://img.shields.io/github/v/release/Roving-Ronin/EMS-Events-Card?style=flat-square&color=green&label=Release
[downloads-badge]: https://img.shields.io/github/downloads/Roving-Ronin/EMS-Events-Card/total?style=flat-square&label=Downloads
[maintained-badge]: https://img.shields.io/badge/maintained-yes-brightgreen?style=flat-square&label=Maintained
[activity-badge]: https://img.shields.io/github/commit-activity/y/Roving-Ronin/EMS-Events-Card?style=flat-square&label=Commit%20Activity
[license-badge]: https://img.shields.io/github/license/Roving-Ronin/EMS-Events-Card?style=flat-square&label=License
[repo-stars-badge]: https://img.shields.io/github/stars/Roving-Ronin/EMS-Events-Card?style=flat-square&logo=github&label=Repo%20Stars&link=https%3A%2F%2Fgithub.com%2FRoving-Ronin%2FEMS-Events-Card
```

**Badge layout:**
Arrange in two rows:
- Row 1: HA version, Marketplace, Release, Downloads
- Row 2: Maintained, Commit Activity, License, Repo Stars

---

## GitHub Workflow Rules

### Critical: Explicit Approval Required
**NEVER commit or push to GitHub without explicit user approval.** Always ask first.

This applies to:
- Code changes (SVG icons, card logic)
- Template updates (issue templates, PR templates)
- Badge/README updates
- Version bumps
- Branch selection (main vs. draft-v1.8.0)

### Issue Templates
Both `bug_report.yml` and `feature_request.yml` must include card dropdown:

```yaml
options:
  - Energy Manager - Events Card
  - Energy Manager - Forecast Card
  - HAEO - Events Card
  - EMHASS - Events Card
  - [More than one / Not sure | All cards]  # Varies by template
```

### PR Template
`.github/PULL_REQUEST_TEMPLATE.md` "Card(s) affected" section:

```markdown
## Card(s) affected

- [ ] Energy Manager - Events Card (`src/em-events-card.js`)
- [ ] Energy Manager - Forecast Card (`src/em-forecast-card.js`)
- [ ] HAEO - Events Card (`src/haeo-events-card.js`)
- [ ] EMHASS - Events Card (`src/emhass-events-card.js`)
- [ ] Bundle / repo only (`src/cards.js`, README, workflows)
```

### Workflow Updates
GitHub Actions workflows (`.github/workflows/release.yml`) auto-upload all card files on release. No manual updates needed unless adding a new card.

---

## Responsive Design

**Base resolution:** 1920×1080 (minus ~256px HA sidebar = **1664px** effective width)

**Rules:**
- Design for single-monitor width max
- Test at 1664px minimum width
- Use flexbox/grid for reflow below 1664px
- No horizontal scrolling at base resolution

---

## Development Workflow

### Approach
- **Iterative**: Make small, testable changes
- **File-exact**: Specify exact file paths and line numbers
- **Explicit confirmation**: Ask before any GitHub actions

### Local Testing
1. Hard-refresh browser after card changes (`Ctrl+Shift+R` / `Cmd+Shift+R`)
2. Check browser console (F12) for errors
3. Test responsive width (1664px)
4. Verify all tabs and conditional columns display correctly

### Code Changes
When modifying card logic:
- Identify exact file and line numbers
- Describe the flow/change clearly
- Include before-and-after if complex
- Test with actual sensor data if possible

---

## Release Process

### Version Bumping
- **Bundle version**: vX.Y.Z in release tag
- **Individual card versions**: Independent in `_*VERSION` constants
- Format: semver (major.minor.patch)

### Release Checklist
1. ✅ Bump version constants in card files
2. ✅ Update CHANGELOG.md for each card
3. ✅ Update root README.md card table with new versions
4. ✅ Update any badges (if HA min version changed)
5. ✅ Commit with message: "Release vX.Y.Z — [changes summary]"
6. ✅ Create GitHub release tag
7. ✅ Workflows auto-upload card .js files

### Changelog Format
```markdown
## vX.Y.Z — YYYY-MM-DD

### Added
- Feature description

### Fixed
- Bug fix description

### Changed
- Behavior change description
```

---

## Styling & CSS

### Shadow DOM Considerations
Custom elements use shadow DOM (style encapsulation).

**Rules:**
- Inline SVG icons required (ha-icon cannot access registry inside shadow DOM)
- CSS variables use HA standard (e.g., `--secondary-text-color`)
- Light/dark mode: use HA theme variables, not hardcoded colors

### Icon Styling Example
```javascript
// SVG inline with inline styles (required)
const svg = `<svg style="width:1.3em;height:1.3em;vertical-align:-0.3em;display:inline-block;margin-right:4px;" viewBox="0 0 116.044 116.044" xmlns="http://www.w3.org/2000/svg"><path fill="${color}" d="${towerPath}"/></svg>`;
```

---

## Data Flows & Core Logic

### EM Events Card Data Flow

**Future Decisions Tab:**
1. Read `sensor.energy_manager_plan` JSON attributes
2. Parse forecast array: each slot contains mode, kW values, prices, SoC, times
3. For each slot: call `_emec_classifyFuture()` with power flows
4. Render row with classification label, power columns, cost/profit

**Past Events Tab:**
1. Query inverter sensor history via WebSocket (last 24h/48h/7d)
2. Align historical readings to 5-minute slots
3. For each 5-min bucket: call `_emec_classifyPast()` with actual readings
4. Render row with classification label, kWh totals, cost/profit

**Status Bar:**
- Mode pill: extracted from plan attributes
- Focus pill: derived from current row's classification
- SoC now: `sensor.inverter_battery_level`
- Morning/Peak SoC: extracted from plan attributes
- Buy/Sell prices: `sensor.nodered_buyprice` / `sensor.nodered_sellprice`
- Alert pills: grid import/export windows, low battery, forced charge/discharge

**Auto-refresh:**
- Watches `automation.update_energy_manager_decision_sensor` state changes
- Triggered every 30 minutes (EM plan update cycle)
- Updates `sensor.energy_manager_plan` with new forecast

---

## Event Classification Logic

### Classification Rules (Future & Past Tabs)

Events are classified by power flow pattern. All power values compared against threshold **T = 0.05 kW (50W)**.

#### Future Classification: `_emec_classifyFuture(mode, solarKw, impKw, expKw, battCKw, battDKw, curtail, soc, gridThreshold)`

**Parameters:**
- `mode`: 'Force Export', 'Force Import', 'Force Charge', 'Self Consumption', 'Maximize Profit', etc.
- `solarKw`, `impKw`, `expKw`, `battCKw` (charging), `battDKw` (discharging): power in kW
- `curtail`: export limiter (0–100%) from Energy Manager
- `soc`: battery state of charge (%)
- `gridThreshold`: minimum export before grid is "active"

**Decision tree** (top → bottom, first match wins):

1. **Force Export mode:**
   - `solar > T && export > T` → "🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force)" [pink]
   - Fallback → "🔋 Battery → Home + ⚡ Grid (Force)" [yellow]

2. **Force Discharge mode:**
   - `solar > T && export > T` → "🌞 Solar + 🔋 Battery → 🏠 Home + ⚡ Grid (Force)" [pink]
   - Fallback → "🔋 Battery → 🏠 Home + ⚡ Grid (Force)" [yellow]

3. **Force Charge mode:**
   - `solar > T && battC > T && export > T` → "🌞 Solar → 🏠 Home + 🔋 Battery (Force) + ⚡ Grid" [green]
   - `import > T` → "⚡ Grid → 🏠 Home + 🔋 Battery (Force)" [pink]
   - `battC > T && solar > T` → "🌞 Solar → 🏠 Home + 🔋 Battery (Force)" [green]
   - Fallback → "🌞 Solar → 🏠 Home" [green]

4. **Self Consumption / Maximize Profit mode:**
   - `solar > T && export > T && battC > T` → "🌞 Solar → 🏠 Home + 🔋 Battery + ⚡ Grid" [green]
   - `solar > T && export > T` → "🌞 Solar → 🏠 Home + ⚡ Grid" [green]
   - `solar > T && curtail === 100 && battC > T && soc < 99` → "🌞 Solar → 🏠 Home + 🔋 Battery" [green] ← *exports blocked*
   - `solar > T && curtail === 100 && soc >= 99` → "🌞 Solar → 🏠 Home (Self Consumption)" [green] ← *exports & charge blocked*
   - `battD > T && import < T && export < T` → "🔋 Battery → 🏠 Home (Self Consumption)" [teal]
   - `import > T` → "⚡ Grid → 🏠 Home" [pink]
   - Fallback → "🏠 Idle" [teal]

#### Past Classification: `_emec_classifyPast(solar, gridImp, gridExp, battC, battD, evCharge, gridThreshold)`

Similar logic but uses **actual kWh deltas** instead of forecast values, with EV charger support. Event threshold **evT = 0.1 kWh** for EV detection.

---

## Conditional Columns

Certain columns are shown/hidden based on:

1. **Curtailed column** — Shows only if curtailment is enabled (`input_boolean.enable_curtailing`)
   - Toggle in settings modal: **"Show Curtailed Column"**
   - Displays export limit value or "—" if N/A

2. **EV Charger column** — Shows only if EV charger sensors available
   - Checks for `sensor.charger_current_import` existence
   - Displays EV charging power (kW) or kWh deltas
   - EV mode dropdown populated from plan attributes

**Column groups are built dynamically** via `_emec_buildColgroup()` based on tab + settings.

---

## Color-Coding

Row background colors are determined by the event classification's **color category**:

```javascript
_EMEC_COLOURS = {
  green:  { bg: '#66ff66', txt: '#333333', cost: '#004400' },  // Solar, charging, profit
  yellow: { bg: '#ffff80', txt: '#333333', cost: '#333333' },  // Battery discharge
  teal:   { bg: '#99ffff', txt: '#333333', cost: '#333333' },  // Battery + solar mix
  pink:   { bg: '#ffe0e0', txt: '#333333', cost: '#cc3333' },  // Grid import, cost
};
```

**Rules:**
- **Green** = profit-generating (solar generation, exporting, battery charging)
- **Yellow** = battery discharge (not grid import, but consuming storage)
- **Teal** = mixed solar + battery (balanced, self-consumption)
- **Pink** = grid import (cost-generating) or forced mode

**Cost text color:**
- Profit rows: Use `profitColor` setting (default #4caf50 green)
- Cost rows: Use `costColor` setting (default #f44336 red)
- Other rows: Use event color's `.cost` property

---

## Cost / Profit Calculation

**Formula per 5-min / 30-min slot:**

```javascript
netCost = ((gridImportKw * buyPrice) - (gridExportKw * sellPrice)) * slotDurationHours

// Example: 5-min slot (5/60 = 0.0833 hours)
// If import 1 kW @ $0.30/kWh, export 0 kW:
// netCost = (1 × 0.30) - (0 × 0.15) × (5/60) = $0.025
```

**Daily totals:**
- Sum all slot net costs for the day
- Positive = you paid the retailer (cost)
- Negative = retailer paid you (credit/profit)

**Status bar "Net" pill:**
- Green background + profit color text = credit (profit)
- Red/pink background + cost color text = cost (expense)

**Cost column in past tab:**
- Color: green (profit) or red (cost)
- Format: `$X.XX` or `—` if < $0.01

**Currencies:**
- Uses Home Assistant's `currency_symbol` setting
- Default to `$` if not configured

---

## Settings & User Configuration

**Available in settings modal:**
- **Base Sensors** — select inverter/load/grid/battery entities
- **Optional Loads** — Deferrable, EV, EV2 entities
- **Display Options** — decimal places (2–5), kW/kWh precision (1–4)
- **Colour Customization** — per-event-type background + text colors
- **Filter Categories** — toggle Profit/Cost visibility by legend filter
- **Show Curtailed Column** — toggle for export limiter display
- **Backup/Restore** — JSON export/import of settings

---

## Common Gotchas

- **Shadow DOM**: ha-icon elements won't render inside shadow DOM; use inline SVG instead
- **History queries**: Large date ranges (>7 days) may timeout; consider pagination
- **Sensor naming**: Each EMS uses different sensor names; check required sensors table in card README
- **Browser cache**: Always hard-refresh after card changes; F12 → Application → Cache Storage to verify
- **Responsive width**: Test at 1664px explicitly; don't assume mobile breakpoints

---

## References

- [Home Assistant Custom Card Development](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card)
- [Shadow DOM & Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
- [Energy Manager](https://energymanager.com.au/)
- [HAEO](https://github.com/hass-energy/haeo)
- [EMHASS](https://github.com/davidusb-geek/emhass)
