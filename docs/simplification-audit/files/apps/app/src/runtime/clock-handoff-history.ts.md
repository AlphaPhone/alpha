# apps/app/src/runtime/clock-handoff-history.ts
- Lines: 16 | Role: binds upstream `createClockHandoffHistory` to Alpha's installed secure slot `clock-handoff:v1:device` and the legacy localStorage key `alphaphone:clock-handoff:v1` | Verdict: MERGE into `clock.ts` (see clock-contract report) and drop the legacy key
- Importers: prototype/clock-adapter.ts:6,27 (`createClockHandoffHistory(secureConnectionStore, () => localStorage.getItem(clockHandoffLegacyKey))`). Text/path pins: `test/native-secure-slots.test.mjs:125-127` reads this file to find the exported `clockHandoffSlot` (T1 — the slot value must stay discoverable); `scripts/test-clock-handoff-flow.ts:10` (imports `createClockHandoffHistory`, `clockHandoffLegacyKey`, `clockHandoffSlot`); `test/fixtures/workflow-clock-admission.mjs:17`; `specs/quint/application/manifest.json` sources; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5, 12, 14 | A1 | `clockHandoffLegacyKey='alphaphone:clock-handoff:v1'` and the `legacy` reader keep "existing records readable" from an older build. Upstream's `legacy` option is optional (`options.legacy ?? (() => null)`) and the envelope still stores `legacy: null`, so the persisted format is unchanged without it. | Delete the key and the parameter; clock-adapter.ts:27 calls `createClockHandoffHistory(secureConnectionStore)`. | Low (README: new package starts empty). |
| 2 | 1-16 | D4 | Near-shim over upstream. | Merge into `clock.ts`; keep `clockHandoffSlot` exported with its exact value. | Low (update native-secure-slots test path). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `clockHandoffSlot` | const | 13 | Android secure-slot allowlist (native-secure-slots test) | `clock.ts` |
| `clockHandoffLegacyKey` | const | 12 | none | delete |

## Proposed end state
File removed; 4 lines in `clock.ts` (slot constant + binding without legacy reader).

## Verification
`test/native-secure-slots.test.mjs` (point at the new path), `scripts/test-clock-handoff-flow.ts` (drop legacy-key cases), Clock handoff Playwright spec.
