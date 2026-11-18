# test/native-adapter-activity.test.mjs
- Lines: 54 | Kind: unit with stubs (esbuild bundles `prototype/native-adapter.ts` with 12 stubbed imports, recording connection controller) | Verdict: REWRITE as cases in `journeys/settings.spec.ts`
- Covers: Settings › Privacy › Activity "It happened / did not happen" shows "Not recorded" on failure, ignores double taps while in flight, frees the row after failure. Duplicates: `test/browser/connection-activity-presentation.spec.ts` (renders the Activity rows and reconcile controls, success path). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-20 | T3 / T7 | Stub map of 12 module specifiers; breaks on any import change in `native-adapter.ts`. | Delete. | Low |
| 2 | 36-54 | - | Failure toast and in-flight guard are visible behaviour not covered by the browser spec. | Add two cases to the Activity journey: reconcile rejected → toast "Not recorded" and retry works; double tap issues one request. | Low |

## Proposed end state
File deleted; Activity reconcile success/failure/double-tap are three cases of the settings journey.
