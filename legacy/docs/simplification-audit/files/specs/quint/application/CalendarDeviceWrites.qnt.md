# specs/quint/application/CalendarDeviceWrites.qnt
- Lines: 289 | Kind: Quint model (live, 14 runs, 11 invariants, 7 witnesses, 20 symbol pins) | Verdict: KEEP; add a replay harness (or accept as design-only)
- Covers: device-calendar writes from the Calendar form/detail: creation receipts (unknown/saved/acknowledged) block blind duplicates, one write at a time, the unconfirmed edit/delete latch released only by a read covering its event, inspect-then-delete, superseded saves write nothing. Duplicates: Android `CalendarCreationStore`/`AlphaCalendarPlugin` instrumentation tests cover the native journal; no other model. Callers/importers: manifest (sources `prototype/calendar-adapter.ts`, `CalendarCreationStore.java`, `AlphaCalendarPlugin.java`; sharedSources upstream `CalendarCreationStore.java`), `specs/quint/application/README.md:74`. **No refinement harness and no test** (`git grep -l "CalendarDeviceWrites\|calendar-device-writes"` hits only the model, manifest and README).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | coverage | The model is tied to code only by 20 regex symbol pins (`creationPending`, `readCreations`, `calendarWriteUncertain`, `pending-creation` …). `quint:check` proves the model; nothing shows the adapter behaves like it. | Write `refinement/application/calendar-device-writes.mjs` on `calendar-adapter-fixture.mjs`, which already bundles the real adapter and already injects an unused `creations` probe (fixture:24-25). Or, if the owner accepts design-only models, delete the probe. | Medium (new harness) |
| 2 | fixture:24-25 | A7 | `__ports.probe.creations` is injected into the bundle and read by nothing (`git grep "probe.creations"`). | Use it in the new harness (#1) or delete it. | None |
| 3 | 149, 169 | — | `deleteResult` and `retryStatus` are aliases (`deleteOutcome(o,false)`, `readAgain(ok,true)`) kept for run readability. | None | — |
| 4 | — | D18 | Android calendar bridge is kept (D18); the model's code stays. | None | — |

## Proposed end state
Model unchanged. Either a ~120-line harness replaying runs against the bundled adapter with the native calendar port stubbed (preferred: this is the most behaviour-dense Calendar model with no code tie), or an explicit "design model" note in the manifest and the dead probe removed.
