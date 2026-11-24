# test/browser/speak-replies.spec.ts
- Lines: 68 | Kind: Playwright chromium, 5 tests (2 loops); UI plus backdoor transport (`alphaClient.attachVerifiedTransport`) and in-page module calls to `voice-timing.ts` / `local-speech-playback.ts` (s5 r11 w1) | Verdict: MERGE one case into `journeys/voice.spec.ts`; DELETE the rest
- Covers: a typed reply is not spoken; a dictated-and-sent reply is not spoken; a stored value under the retired key `alphaphone:speak-replies:v1` changes nothing; Settings has no "Read replies aloud" switch. Duplicates: `chat-voice-mode.spec.ts` (spoken replies only inside the voice conversation), `voice-assistant.production.spec.ts`. Callers/importers: chromium; imports `./cloud-voice-fixture`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 10, 16, 35 | A1 | `oldReadRepliesAloud` key "an earlier build stored". The package starts with empty private data (D1); a value under that key cannot exist. | Drop the stored-value variants. | None |
| 2 | 57-68 | A8 / T1-like | Settings "has no Read replies aloud switch" plus a regex for three retired labels: a tombstone test for a removed feature. | Delete. | None |
| 3 | 29-55 | T6 / P2 | Dictated case fakes a dictation by calling `beginVoiceTurn`, `markVoiceTiming`, `noteVoiceDraft` directly, then asserts the exact timing-mark list. Pins internal timing marks; production has no Transcribe launcher (`voice-assistant.production.spec.ts` test 1). | Delete. | Low |
| 4 | 17-21 | P2 | `alphaClient.attachVerifiedTransport` replaces the agent transport in-page. | Use the harness agent stub (`flag-off-android` resident replies) in the voice journey. | None |
| 5 | 51 | T8 | `waitForTimeout(1000)` to prove nothing starts speaking. | Gone with the case. | None |

## Proposed end state
One step in `journeys/voice.spec.ts`: "a typed message gets a silent reply" (no speech call recorded, no "Stop reply" button), using the shared voice harness. Delete this file. Speech only inside the voice conversation is already the subject of `chat-voice-mode` / the voice journey.
