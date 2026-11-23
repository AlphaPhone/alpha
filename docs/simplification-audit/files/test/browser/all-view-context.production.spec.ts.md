# test/browser/all-view-context.production.spec.ts
- Lines: 89 | Kind: Playwright spec, production project (flag-off bundle, `flag-off-android.ts` + `resident-stub.ts`), 4 tests | Verdict: MERGE into `journeys/chat.spec.ts` (context section)
- Covers: every enabled view sends its own view id as turn context and no stored secret travels with a message; the Passwords screen pauses observation; `clock.handoff.v2` is advertised only when native Clock reports repeat-day support. Duplicates: per-view context checks in `context-selection*.spec.ts` (other chunks); capability negotiation partly in `agent-clock-handoff.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18, 41 | T6 (minor) | `launcher-home` window event and `f.emit('DailyApps','assistantInvoked')` stand in for HOME and the assist gesture. These are bridge-boundary events, acceptable. | Keep; move into `harness/nav.ts` `goHome()`. | None. |
| 2 | 23 | B1 | `secrets()` swallows `JSON.parse` failure and adds the raw value. Correct here (raw slot values are secrets too) but write it as an explicit branch. | Keep, comment. | None. |
| 3 | 28, 58, 75 | P11 | 240 s / 120 s / 90 s timeouts for 11 view switches. | Fold into one journey with the default timeout once the harness boots once per test. | Low. |
| 4 | 73-89 | C5 | Capability negotiation test is protocol behaviour, not view context. | Move to `journeys/reminders.spec.ts` Clock section beside the handoff cases. | None. |

## Proposed end state
Tests 1-2 become the "context and privacy" part of `journeys/chat.spec.ts` on the production project: one walk over the 11 views asserting `metadata.clientDevice.context.view` and no secret on the wire, then the Passwords pause. Test 3 moves to the reminders journey. Uses only `harness` and `stub` readers; no `/src` imports.
