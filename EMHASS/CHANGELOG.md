# Changelog

All notable changes to the EMHASS Events Card. Newest first.

## v2.7.0

- Security: all entity-derived values (optimizer status, currency, entity IDs, error messages, settings inputs, event labels) are now HTML-escaped before being written to the DOM

## v2.6.7

- STATUS bar Mode now read from `sensor.mpc_optim_status`; Updated badge uses `automation.last_triggered`; new `optim_status` and `emhass_automation` sensor keys

## v2.2.0 – v2.6.6

- ALERTS / STATUS / FINANCES bars; Focus and Mode in the STATUS bar; EMHASS Updated badge; settings modal (sensor overrides, per-sensor noise filters, alert thresholds, price decimals); currency detection; emoji column headers; "EMHASS Plan" / "EMHASS Mode" headers; BESS note; import / export kWh daily totals on both tabs; Past tab loading and toggle fixes; 3-decimal kW / kWh

## v2.1.5

- Fix BESS unit scaling (kW→W) after bucketing; fix battery kWh sign in BESS vs EMHASS mode

## v2.1.4

- BESS mode aggregates into 5-min buckets (average power, last SoC/price)

## v2.1.3

- Fix BESS "No Data" — toggle mode now determined before history API call so correct sensors are requested

## v2.1.2

- BESS/EMHASS toggle switch in Past tab; BESS actual inverter sensors with separate sign convention handling

## v2.1.1

- Sigenergy lifetime energy sensors as Tier 2 defaults; Mode column in Past tab

## v2.1.0

- Fix Past tab power values all zero — exact recorded timestamps used instead of snapped 5-min slots

## v2.0.9

- Fix Past tab rows all skipped — `_pwrMult` W→kW conversion made values fall below skip threshold

## v2.0.8

- Past tab uses actual recorded timestamps instead of fixed 5-min slots

## v2.0.7

- Fix Past tab blank — skip condition incorrectly gated on SoC=0

## v2.0.6

- Separate `past_buy_price` / `past_sell_price` sensors — dense Amber history for past cost calculations

## v2.0.5

- Fix daily Cost/Profit sum sign; add 10W noise floor clamp

## v2.0.4

- Fix battery daily sum sign and colour in both tabs

## v2.0.3

- HAEO-style event labels; battery display negated (discharge = -kW red); classifier threshold 50W

## v2.0.2

- Fix battery sign convention (raw +ve = discharging confirmed by SoC trend)

## v2.0.1

- Three-tier sensor fallback; auto-detect attribute keys; sensor debug panel

## v2.0.0

- Initial release — Future Decisions + Past Events tabs, MPC sensor support
