# scripts/android-browser-reading-live.ts
- Lines: 332 | Kind: script (manual device campaign: paired combined-host speech for browser reading) | Verdict: DELETE
- Covers: on an emulator, pairs the app with the combined development host on port 47858 through a recording proxy, runs `BrowserReadingLiveInstrumentedTest` on both variants and checks two exact TTS posts, held-response cancellation and a late send. Duplicates: browser reading with a synthetic loopback speech route is run in CI by `BrowserReading`, `BrowserIsolatedReading`, `BrowserSensitiveReading`, `BrowserReadingNavigation` (`scripts/ci/emulator-suite.ts` reading lanes). Callers/importers: only listed in `android-instrumentation.ts:312` `CAMPAIGN_RUNNERS`; no npm, workflow, doc or test caller (git grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A3 / D5 | Depends on pairing (`/api/auth/pair-code`, `/api/auth/pair`, `PairedSpeechContract`) with the combined development host; the PRD has no hosted-agent pairing and delete-candidates A50/C4 removes the instrumentation class. | Delete this script, `BrowserReadingLiveInstrumentedTest.java`, its `CAMPAIGN_RUNNERS` entry. | Low |
| 2 | 36-53, 279 | B5 | Evidence ceremony: refuses existing output, uid/mode checks on the session file, result JSON with `realMicrophoneTested:false`. | Gone with the file. | — |
| 3 | 44, 55-56 | — | Hard-coded developer profile path and ports 47858/47861. | Gone with the file. | — |

## Proposed end state
Deleted. Coverage that is lost: speech for browser reading against a real speech host with mid-utterance cancellation on a device. The cancellation and exact-text behaviour stays covered by the loopback reading classes in the CI emulator lane; real-speech-host acceptance belongs to the on-device speech route (`LocalSpeech*` classes), not pairing.
