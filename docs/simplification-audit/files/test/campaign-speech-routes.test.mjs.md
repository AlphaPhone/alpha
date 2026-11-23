# test/campaign-speech-routes.test.mjs
- Lines: 30 | Kind: source-text (regex on `PairedSpeechContract.java` for `ASR_PATH`/`TTS_PATH`, then regex over every `scripts/android-*-live.ts`) | Verdict: DELETE
- Covers: live Android campaigns intercept the same `/api/asr/…` and `/api/tts/…` routes the app declares. Matching scripts today: `scripts/android-paired-speech-live.ts` (92 lines) and `scripts/android-browser-reading-live.ts`. Duplicates: none; a renamed route would make the live campaign itself fail (it never sees a request). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-15 | T1 | Regex over Java constants. | Delete. | None |
| 2 | 17-30 | T1 / T5 | Regex over test scripts' text: a test of the test machinery. | Delete; if wanted, the live campaigns read the route from one JSON constant shared with the Java build, or fail loudly when no request arrives. | Low |
| 3 | - | Q | `PairedSpeechContract` is the "explicit development-host contract"; with D5 (no hosted-agent pairing) the owner should confirm the paired speech path and its live campaign are still product. | Owner question. | - |

## Proposed end state
Deleted. The live campaign's own assertion that it received an ASR/TTS request is the check. Whether
`PairedSpeechContract` and `android-paired-speech-live.ts` survive D5 is an owner question.
