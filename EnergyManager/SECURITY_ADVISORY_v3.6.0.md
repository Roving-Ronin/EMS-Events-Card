# Security Advisory — EM Events Card v3.6.0

**Severity:** CRITICAL  
**Vulnerability Type:** Cross-Site Scripting (XSS) via innerHTML injection  
**Affected Versions:** v3.5.1 and earlier  
**Fixed in:** v3.6.0

---

## Vulnerability Description

The EM Events Card rendered entity states and attributes directly into HTML via `innerHTML` without escaping user-controllable or integration-controllable values.

**Impact:** Any integration or user with permission to modify the following entity states/attributes could inject arbitrary HTML and JavaScript into the dashboard of all users viewing the card:

### Primary XSS Vectors (Critical)
- `sensor.import_formatted` (state)
- `sensor.export_formatted` (state)
- `sensor.net_formatted` (state)
- `sensor.daily_imported_energy` (state)
- `sensor.daily_exported_energy` (state)
- `sensor.energy_manager_plan` (attribute: `blocks_summary`)
- `sensor.energy_manager_decision` (state or derived focus value)

### Secondary XSS Vectors (Defensive)
- Exception error messages (in Past tab loading error display)
- Dynamic charging pill timestamps
- EM Decision badge time formatting

**Attack Vector Example:**
An authorized user or compromised integration could set a sensor state to:
```
<img src=x onerror="alert('XSS')">
```

This would execute in the context of the Home Assistant dashboard, potentially stealing credentials or performing actions on behalf of the viewing user.

---

## Fix Applied (v3.6.0)

### HTML Escape Helper Function
Added `_emec_escapeHtml()` function that sanitizes special characters before inserting into HTML:

- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#39;`

### Primary XSS Fixes (Lines 1868-1869, 1889-1893)
All entity-derived values are now escaped before being inserted into HTML strings:
- Mode label and focus text in status bar
- Buy/Sell price formatting
- Net cost/profit display
- Daily import/export values

### Secondary XSS Fixes (Defensive Hardening)
- **Line 3041** — Error messages in exception handlers
- **Line 1822** — Dynamic charging pill time and amount displays
- **Line 1384** — EM Decision badge timestamp displays

---

## Remediation

**Immediate action required:**

1. **Update to EM Events Card v3.6.0 or later**
2. **Verify entity permissions** — Ensure trusted users/automations only have write access to:
   - `sensor.energy_manager_plan`
   - `sensor.energy_manager_decision`
   - `sensor.import_formatted`, `sensor.export_formatted`, `sensor.net_formatted`
   - `sensor.daily_imported_energy`, `sensor.daily_exported_energy`
3. **Consider implementing Home Assistant's built-in security features:**
   - Restrict entity write permissions to specific automations
   - Enable two-factor authentication for sensitive user accounts
   - Use service calls with `service_template` validation rather than state modification

---

## Verification

To verify the fix is in place:

1. Check that `_emec_escapeHtml()` function exists in the card code (added early in the file)
2. Confirm that `_buildSbar()`, `_buildFinancialsBar()`, and error handling use this function for entity values
3. Version should display as **v3.6.0** or later in the card footer

---

## Additional Notes

- **HAEO Events Card** and **EMHASS Events Card** should also be audited for this pattern
- Consider implementing a Content Security Policy (CSP) in Home Assistant to provide defense-in-depth against XSS
- All three cards in the EMS Events Card bundle should be updated to v3.6.0 when released

---

## Timeline

- **v3.5.1** — Initial release with EV Charger and Solar Forecast features
- **v3.5.2** — First security fix (primary XSS vectors only)
- **v3.6.0** — Comprehensive security hardening (primary + secondary XSS vectors)

---

**Thank you to the security researcher who reported this vulnerability responsibly.**
