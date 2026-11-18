# test/cloud-speech-timing.test.mjs
- Lines: 6 | Kind: JVM integration (patched shared `CloudSpeechTimings.java` + committed fixture `test/fixtures/CloudSpeechTimingsTest.java`) | Verdict: MERGE into the same JVM lane as `cloud-speech-stream.test.mjs` case 1
- Covers: Cloud request timing separates network and preparation stages without unsafe fields. Duplicates: none. Callers/importers: `npm test` glob; imports `fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-6 | - | A host-side runner for a committed Java test. | One `jvm` case list next to the wire test (or the Gradle test source set). | None |

## Proposed end state
A row in the shared JVM runner; file deleted.
