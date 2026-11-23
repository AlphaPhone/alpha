# test/browser/journey-j04-cloud-maps.production.spec.ts
- Lines: 268 | Kind: Playwright journey, `production` (flag-off bundle; `flag-off-android.ts` + `resident-stub.ts` Cloud Maps HTTP stub), 3 tests, no `/src` imports | Verdict: KEEP (backbone of `journeys/maps.spec.ts`)
- Covers: a Calendar event location is searched once in Cloud Maps, routed from an explicit origin and mode, navigation started and stopped with the screen-off service, Back returns to the event; cancelled search, out-of-coverage place, Retry-After limit; route alternatives. Duplicates: `journey-j04-schedule-travel.spec.ts` (same journey on dev provider), `journey-j04-android.production.spec.ts` test 1 (setup), `journey-core-loops.production.spec.ts:434` (Maps waits for a location). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 40-71 | T7 | `devicePorts` hand-patches `PluginHeaders`/`nativePromise` for ElizaLocation and AlphaMapsTransport. | Move to harness `bridge.add`. | Low. |
| 2 | 185, 204 | T8 | `waitForTimeout(500)` and `(1_000)` to prove nothing late arrives / nothing retried. | Keep a short negative wait only through one named helper (`expectQuiet(page, ms)`), or assert request counts after the next user action. | Low. |
| 3 | 216-268 | T4 | Test 3 repeats test 1's search/origin setup to check alternatives. | Make it a step of test 1 after the origin is chosen (alternatives, choose one, Start follows it). | Low. |
| 4 | 83, 150 | C3 | Begin-time IIFE and feed-URL predicate duplicated with j04-android. | Shared helpers. | Low. |

## Proposed end state
`journeys/maps.spec.ts` (production project): test 1 "event → Cloud Maps → route → alternatives → navigate → Back to event", test 2 "cancel, out of coverage, request limit", plus the installed-map-app hand-off from j04-android and the system-Back / reload cases from j04-schedule-travel. Bridge additions through the harness.
