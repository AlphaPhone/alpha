# specs/quint/native/NativeSmsDispatch.qnt
- Lines: 314 | Kind: Quint model, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness compiles real Alpha telephony classes plus patched upstream messages classes, with upstream members spliced by text | Verdict: KEEP (harness: SIMPLIFY)
- Covers: Reviewed SMS send: fixed operation ID, durable intent before radio, one radio call per recipient, SIM change → unknown, tombstone retires record, delivery needs sent+report and a unique provider row, multipart reports never prove delivery (9 runs, 5 invariants). Duplicates: `NativeMmsDispatch.qnt` (binding 3 = SMS) overlaps on journal/tombstone rules. Callers/importers: manifest (13 sources); `specs/quint/refinement/native/sms-dispatch.mjs` (+`sms-dispatch-platform.mjs` 436 lines, `SmsDispatchTraces.java`); `test/quint-native-sms-dispatch.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `specs/quint/services/manifest.json` mentions it

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness `sms-dispatch.mjs:13` | P6 | Imports `materializeHistoricalSources` from `specs/quint/legacy/core/formal-source-inventory.mjs` for the historical `b1817660…` probe (shared inventory with MMS). | Delete the historical probe with the MMS one. | Low |
| 2 | `sms-dispatch-platform.mjs:26-55` | T10 (vendor) | Splices upstream `TelephonyPlugin`/`SmsTelephony`/`SmsProviderReader` members by anchors (` public static final Pattern NUMBER`, ` // ---- Reviewed native MMS`, regex `static (int|long|String) longAt(`). | Same as MMS: whole-class compile or upstream accessor (D14). | Low |
| 3 | — | C5 | Two models share one journal; merging would create one 500+ line model. Not worth it; the shared platform helper already deduplicates the harness. | None. | — |
| 4 | test + `index.mjs` | T4 | Runs twice. | One runner. | None |
| 5 | harness | B5 | `checkTraces` re-hashes every input before and after the run (`driverHashes`, `inputsUnchanged`) and the wrapper test asserts exact trace counts. | Pass/fail only. | None |

## Proposed end state
Model unchanged; historical probe and legacy import removed; one runner; path-filtered to telephony Java, launcher manifest, `consumer-host.json` and the upstream messages plugin.
