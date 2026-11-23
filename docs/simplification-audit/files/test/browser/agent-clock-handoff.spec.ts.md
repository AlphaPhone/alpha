# test/browser/agent-clock-handoff.spec.ts
- Lines: 235 | Kind: Playwright spec, chromium (dev build `?mode=dev`), 20 tests (19 loop modes + 1) | Verdict: REWRITE as `journeys/reminders.spec.ts` (Clock handoff section, production project on the resident harness)
- Covers: an agent-proposed Clock action (set/show/snooze/dismiss alarm) is shown for review, executes only after approval, records a device-journal receipt, and never replays after reload or a lost response. Duplicates: `all-view-context.production.spec.ts` (clock.handoff.v2 capability advertisement), host tests around `clock-agent-review.ts`/`clock-contract.ts` (tests-host). Callers/importers: none (spec); imports `helpers/connection-diagnostics.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-96 | T7/P6 | 86-line inline Capacitor bridge (`AlphaNotifications`, `AlphaVoiceCloud`, `DailyApps`, `AlphaConnection`, `AlphaActionJournal`) plus a fake agent HTTP server written into `nativePromise`; 19 modes branch inside it. | Use `resident-stub.ts` + `flag-off-android.ts` (already model agent proposals, journal and DailyApps) or the planned `harness/plugins/agent.ts`; add a journal/clock handler there. | Medium: the fake proposal/claim/receipt protocol must exist in the shared stub. |
| 2 | 100-108 | A3/D5 | Connects through the "Local development agent" pairing form (`/api/auth/pair`). D5 retires paired-agent product paths; the dev form survives only while the test-mocks harness needs it. | Run on the production project with the resident stub; no pairing UI. | Low. |
| 3 | 114, 135-143, 157-168, 174, 192 | T6/P2 | Backdoor singletons: `connectionController` overrides (`getCloudEnvironment`, `getCloudClient`, `disconnect`, `actionHistory`), `alphaClient.getState()`/`approve()`, `retireClockReviews()`. | Drive sign-out/disconnect and history refresh through Settings UI; assert the visible review card state instead of `alphaClient` context. | Medium. |
| 4 | 117 | T8 | `waitForTimeout(950)` to simulate end of speech. | Voice path belongs to `journeys/voice.spec.ts`; drop the `transcribed` mode here. | Low. |
| 5 | 131, 181 | P3 | Patches `Intl.DateTimeFormat.prototype.resolvedOptions` and `document.hidden` in-page. | Use `test.use({timezoneId})` and `page.emulateMedia`/visibility via a real tab switch, or drop the mode. | Low. |
| 6 | 216-235 | P7/T6 | Last test calls `DailyApps.clockHandoff` on the browser stand-in (`browser/daily.ts:151` "No repeat here") and `validateClockOperation` directly; only the final dialog check is UI. It proves simulator semantics. | DELETE. | Low: the native Clock refusal of repeats is Android code, not this stand-in. |
| 7 | 8 | T4 | 19 modes each boot the full dev app; `browser`, `old-host` are the same assertion; `unavailable/denied/failed` differ only in a status string. | Parametrise status mapping in one test; one capability-absent test. | Low. |

Cases worth carrying (the rest are dropped): `confirm` (review → approve → one effect, receipt `opened`); `unknown` + `duplicate` (lost bridge reply then reload: repeat request shows "already has a device journal entry", effect count stays 1); `denied`/`unavailable`/`failed` status mapping (one parametrised test); `old-host` (no `clock.handoff.v1` → no review card, no effect); `review-cancel` (native review declines → failed receipt, no effect); `receipt-loss` (receipt upload retried, effect not repeated); `modal` (editing a Clock draft retires the pending approval).

## Proposed end state
- Delete this file. Add a "Clock handoff" `describe` to `journeys/reminders.spec.ts` on the production project.
- Harness: `flag-off-android.ts` + `resident-stub.ts` (or `harness/plugins/agent.ts`) gain a typed `AlphaActionJournal`/`DailyApps.clockHandoff` handler recording calls in `window.__alphaTest`.
- Seven cases above, each driven by typing in the composer and tapping the visible review card; no `/src` imports.
- Voice-originated Clock request (`transcribed`) is one step in `journeys/voice.spec.ts` if still wanted.
- Expected size ~90 lines, against 235.
