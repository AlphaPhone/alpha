# test/browser/voice-route-preference.spec.ts
- Lines: 34 | Kind: Playwright spec, chromium, 1 test; module-in-page | Verdict: DELETE
- Covers: a stored `alphaphone:voice-route:v1` = `device` preference does not move a signed-in account off Cloud transcription, and a signed-out reload reports `sign-in`. Duplicates: the signed-out half is covered by `voice-preparation-ownership.spec.ts` test 1 through the UI. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24 | T6 | The assertion calls `noteSegmentTranscriber()` imported from `/src/runtime/note-recorder-driver.ts`; no user-visible result is checked. | Delete. | None. |
| 2 | 5-6, 28 | A1 | Proves that a "legacy persisted local preference" is ignored. `voice-selection.ts` says `speechRoute()` is the single source; the stored route key is a leftover. | Delete the test; the key `alphaphone:voice-route:v1` and `voicePreferenceKeys().route` are deletion candidates for the runtime chunk (check the Settings reader first). | Low. |
| 3 | 1-3, 18 | A1 | Uses `openLegacyNotes`. | Goes with the file. | None. |
| 4 | 11-15 | T6 | Replaces `getCloudEnvironment/getCloudClient` on the controller. | Goes with the file. | None. |
| 5 | 8 | T8 | 120 s describe timeout. | Goes with the file. | None. |

## Proposed end state
File deleted. "Signed-in Notes recording uses Cloud transcription" is asserted in the notes recording journey through the
Cloud fake's upload counter; "signed-out shows sign-in" stays in `journeys/voice.spec.ts`.
