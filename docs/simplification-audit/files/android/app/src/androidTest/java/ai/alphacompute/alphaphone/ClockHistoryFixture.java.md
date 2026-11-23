# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ClockHistoryFixture.java
- Lines: 48 | Role: test-only observer of the encrypted Clock receipt slot `clock-handoff:v1:device` (waits for an `opened` receipt, then compare-and-clears it on close). | Verdict: SIMPLIFY (small)
- Importers: `ClockHandoffInstrumentedTest:31`, `RealClockInstrumentedTest`. Text/path pins: none (no test, manifest or script names it).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-17 | C3 | Bridge-ready poll `while(!"true".equals(WebViewTestDriver.evaluate("Boolean(window.Capacitor?.Plugins?.AlphaConnection)")))` — same readiness poll in ConnectionInstrumentedTest:48, CloudDelegationCallback:23, CloudVoice:43 | `WebViewTestDriver.until("window.Capacitor?.Plugins?.AlphaConnection", 20000)` | None |
| 2 | 10 | C6 | Slot literal `"clock-handoff:v1:device"` duplicated from the native Clock receipt owner | Reference the production constant if one is exposed; otherwise keep (test must pin the persisted key) | None |
| 3 | 21 | D10 | Uses `NotesSecureFixture.call` (a Notes fixture) as a generic secure-bridge caller | Move `call` to `WebViewTestDriver.secure(...)`; NotesSecureFixture keeps Notes-specific helpers | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ClockHistoryFixture` | class | 9-48 | none | keep; colocate with a new `ClockIntents` helper |
| `SLOT` | const | 10 | native Clock receipt slot | keep (persisted key pin) |

## Proposed end state
Keep the class; replace its readiness loop with the shared poll helper and its bridge call with a generic secure-bridge
helper. Estimated 48 -> ~40 lines.

## Verification
`--classes ClockHandoff` and `RealClock` (`--clock-exclusive`) instrumentation runs.
