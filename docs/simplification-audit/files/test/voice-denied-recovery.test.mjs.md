# test/voice-denied-recovery.test.mjs
- Lines: 42 | Kind: mixed: unit (type-stripped `apps/app/src/runtime/voice-states.ts` imported as a `data:` module), source-text (regex on `prototype/voice-adapter.ts` and `template.html`), transplant (`cloud-voice-view.mjs`) | Verdict: DELETE (REWRITE one case into `journeys/voice.spec.ts`)
- Covers: after a denied microphone, the voice sheet offers "Open app settings" on Android only, it opens the app's privacy settings page, and a granted retry drops it. Duplicates: `voice-calm-cloud-errors.test.mjs:130-137, 259` (denied copy), `voice-start-failure-copy.test.mjs` (`voiceFailure` copy). No browser spec asserts the settings control (grep for `Open app settings`/`DENIED_SETTINGS` in `test/browser` finds nothing). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T2 | `voice-states.ts` loaded by text transform rather than imported. | Delete. | Low |
| 2 | 17-25 | T1 | Five regexes over `voice-adapter.ts` and one over `template.html`. | Delete. | Low |
| 3 | 27-42 | gap | Found on an API 36 emulator (comment line 7): the message named a control that did not exist. Real regression with no journey coverage. | Carry: Android voice fixture denies the mic; assert the "Open app settings" control is shown, opens `privacy` settings through the fixture, and disappears after a granted retry. | Medium |

## Proposed end state
File deleted. `journeys/voice.spec.ts` gains the denied-microphone recovery case on the flag-off Android fixture
(`test/browser/flag-off-android.ts` or the Capacitor voice fixture with an `openSettings` spy).
