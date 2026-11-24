# test/browser/domain-recovery-lifecycle.spec.ts
- Lines: 26 | Kind: Playwright, chromium. It calls `openDomainRecovery` in the page with a hand-made fake store (T6), then clicks the dialog (r4) | Verdict: **MERGE into `journeys/calendar.spec.ts`** (1 case), rest deleted
- Covers: a pending recovery capture or reset is aborted when the device locks (`alpha:device-state`) or a dev incoming call arrives (`alpha:dev-incoming-call`); the retired read does not reopen its dialog; a later `openCalendarRecovery()` still opens. 8 generated tests (2 names × 2 events × 2 phases). Duplicates: the retirement-closes-dialog rule is also in `digest-inbox-migration.spec.ts:46-48`; the generic owned-dialog lifecycle is in the accessibility specs. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T7 | A 2×2×2 loop yields 8 tests for one rule. The `name` axis (calendar/reminders) only changes button labels. | Keep one: calendar, `alpha:device-state`, reset phase. | none |
| 2 | 8-10 | T6 | The recovery store is a literal fake with `legacy:'original'`, `legacyChanged:false`, which pins the `{legacy}` capture shape that D1 removes. | Reach the real dialog instead: seed a damaged calendar document at the bridge, open App calendar recovery from Settings, hold the reset at the bridge. | Low |
| 3 | 2 | D6 | `alpha:dev-incoming-call` is a dev-simulator event. | Drop that axis. A real incoming call reaches the renderer as `alpha:device-state` / the telephony bridge event. | none |
| 4 | 23 | P2 | `openCalendarRecovery()` is called from an in-page import. | Open it through Settings. | none |

## Proposed end state
One test in `journeys/calendar.spec.ts`: "locking the phone during a calendar recovery reset cancels it and the
dialog does not come back; recovery can be reopened". Reset is held at the bridge, and the dialog is reached through
Settings.
