# test/paired-speech-contract.test.mjs
- Lines: 14 | Kind: host-JVM unit (javac of `android/.../PairedSpeechContract.java` + `test/fixtures/PairedSpeechContractTest.java`) | Verdict: DELETE
- Covers: the paired development agent's ASR/TTS request/response contract (`/api/asr/libelizainference`, `/api/tts/paradee`). Duplicates: none in host tests; `test/campaign-speech-routes.test.mjs` pins the same class by text. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-14 | A3 / D5 | Covers hosted/paired-agent speech, which DECISIONS D5 deletes; `PairedSpeechContract.java` is DELETE in its own report (delete-candidates A69) and `test/fixtures/PairedSpeechContractTest.java` is DELETE. | Delete together with the class, the fixture and the `AlphaVoiceCloudPlugin` paired branches. | Low |
| 2 | 8 | T3 | Single-class unit test with a hand-written fixture main. | Gone. | None |

## Proposed end state
File deleted in the same change that removes `PairedSpeechContract.java` (still present in the worktree at review time) and its other pins (`campaign-speech-routes.test.mjs`, `scripts/android-browser-reading-live.ts`, `specs/quint/refinement/native/note-bridge-platform.mjs`, androidTest `BrowserReadingFixture.java`).
