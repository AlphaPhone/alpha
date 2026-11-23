# test/browser/dev-speech-account-switch.spec.ts
- Lines: 11 | Kind: Playwright, chromium; journey through the development connection dialog plus in-page `AlphaVoiceCloud` calls | Verdict: MERGE into `journeys/voice.spec.ts`
- Covers: switching the development sample account stops current speech and retires playback prepared for the previous account (P-43, owner isolation). Duplicates: none found for the account-switch case. Callers: chromium only. Helpers: `connection-diagnostics.ts`, `app-navigation.ts`, `voice-fixture.ts` (`agentBrowserVoice`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-10 | T6 | Speech started and replayed by `registerPlugin('AlphaVoiceCloud').synthesizeLocal/play` in-page. | Start speech from a visible control (e.g. read a message aloud) and assert it stops after the switch. | Low. |
| 2 | 10 | T6 | `f.audios[0].onended===null` inspects the fixture's internal audio objects. | Assert via fixture recorder API (`voiceFixture.cancels`, `spoken`). | None. |
| 3 | 6 | P2 | Account switch via `openConnectionDiagnostics` (dev chooser). | Harness helper `switchDevelopmentAccount(name)`. | Depends on D5/D19: if the development Cloud sample-account surface is deleted with personal-Cloud simulators, this case goes too. |

## Proposed end state
One case in `journeys/voice.spec.ts`: "switching account stops current speech and the old playback cannot resume". Owner question: does the sample-account chooser survive D19?
