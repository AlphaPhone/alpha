# test/browser/dev-voicemail-audio.spec.ts
- Lines: 34 | Kind: Playwright, chromium; UI journey on the development Phone → Voicemail screen with the agent-speech fixture (AOSP-only renderer path) | Verdict: MERGE into `journeys/telephony.spec.ts`
- Covers: "Read voicemail" speaks the exact transcript through agent on-device speech (no Web Speech, P-43), Stop works, a stale completion is ignored, delete/Home/pagehide/incoming call retire speech, retry after speech becomes ready. Duplicates: none for voicemail read-aloud. Callers: chromium only. Helper: `voice-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-17 | T7 | Loop of four retirement triggers; three are synthetic `window` events (`launcher-home`, `alpha:dev-incoming-call`, `pagehide`). | Keep two: Delete voicemail (UI) and Home (Device controls). | Low. |
| 2 | 7 | C6 | Full transcript string duplicated at lines 7 and 11. | Fixture constant. | None. |
| 3 | 31-34 | T6 | "Other consumer" speech started in-page via `registerPlugin('AlphaVoiceCloud')`. | Drop, or start the other consumer from UI in the voice journey. | Low. |
| 4 | 22-29 | T4 | Device-state retirement then replay overlaps the retirement loop. | Fold into case 1. | None. |
| 5 | 11, 19 | — | Good: asserts exact spoken text and not-ready refusal. | Carry. | None. |

## Proposed end state
`journeys/telephony.spec.ts` carries three voicemail cases: read/stop/stale-completion/finish (line 11), Delete and Home retire speech (lines 13-17 reduced), not-ready then retry (line 19).
