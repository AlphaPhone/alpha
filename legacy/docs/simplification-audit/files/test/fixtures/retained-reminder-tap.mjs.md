# test/fixtures/retained-reminder-tap.mjs
- Lines: 118 | Kind: transplant (same `reminder-creations.ts` marker slice + stripped `reminder-adapter.ts` in `vm`) | Verdict: PORT (share the bundled reminder fixture with `reminder-open-intent.mjs`)
- Covers: a notification tap retained by the native side (`DailyApps.pendingReminderTap`) opens the exact Calendar reminder detail and is consumed only after render commit, and only while the app is foreground, no connection chooser / sensitive agent context / open form, and the same visit and detail. Duplicates: `test/retained-reminder-tap-admission.test.mjs` runs it; Android `ClockHandoffInstrumentedTest`/reminder instrumentation covers the native half. Callers/importers: `test/retained-reminder-tap-admission.test.mjs:3`, `specs/quint/refinement/application/retained-reminder-tap-admission.mjs:2` (registered `application/index.mjs:40`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-27, 83 | T2 / T10 | Identical slice/strip code to `reminder-open-intent.mjs:18-24` (C5 duplicate) keyed on the same two text markers. | One shared `test/fixtures/reminder-adapter-bundle.mjs` that esbuild-bundles the real adapter + presentation with injected `DailyApps`, `Capacitor`, `connectionController`, `alphaClient` ports; both fixtures build on it. | Medium |
| 2 | 7-12 | D13 | Deep `.eliza/client-features` path. | `@eliza/*` alias. | Low |
| 3 | 46-55 | — | `setState` asserts the commit callback shape the adapter uses (render-then-consume). This is the behaviour under test, keep. | Keep. | — |

## Proposed end state
~70-line fixture on the shared reminder bundle; no source slicing; the separate host test goes to the family runner.
