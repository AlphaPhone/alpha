# test/browser/clock-repeat.production.spec.ts
- Lines: 109 | Kind: Playwright, `production` project, real UI journey over `flag-off-android.ts` with a wrapped `nativePromise` adding `DailyApps.clockHandoff` and `surfaceInfo.clockRepeatDaysVersion` | Verdict: **MERGE** into `journeys/reminders.spec.ts` (Clock handoff section)
- Covers: when the native surface reports `clockRepeatDaysVersion >= 1`, the Clock form offers day chips, Mon-Fri reads "Repeats weekdays", other actions hide Repeat and keep the Set draft, review shows "06:30 · weekdays · …", a double activation sends one reviewed handoff with `days:[2..6]`, and no "alarm saved" claim appears; without the flag there are no chips and no `days`; Show alarms is its own reviewed handoff. Duplicates: Clock handoff in `agent-clock-handoff.spec.ts` and `journey-core-loops.production.spec.ts`; repeat days only here. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-36 | P6 | `clockBridge` wraps `Capacitor.nativePromise` after `flagOffAndroid` installs it, pushing a method into `PluginHeaders` and stubbing four Agent discovery GETs. | Make it a harness plugin option: `app({daily:{clockHandoff:true, clockRepeatDaysVersion:1}})`. | Low. |
| 2 | 47 | T4 | The version loop runs the same journey for 1 and 2; the product checks `>= 1`. | Keep one value (1) plus the absent case. | Low: a future version-2 behaviour would need its own case. |
| 3 | 69-71 | none | Double activation through two synchronous `click()` calls is a deliberate, commented race test. | Keep. | none |
| 4 | 1-8 | A8 | Evidence-boundary header. | Trim to one line. | none |
| 5 | 48, 83 | T8 | 120 s timeouts. | Measure on the shared harness. | Low. |

## Proposed end state
Two tests in `journeys/reminders.spec.ts`: repeat days with the native flag (weekday chips, review text, one handoff with
days, no saved claim) and without it (no chips, no days, Show alarms handoff). Delete this file.
