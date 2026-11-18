# test/native-navigation-client-header.test.mjs
- Lines: 43 | Kind: transplant on the JVM (slices the header-copy loops out of `raw(` and `requestStream(` in `AlphaLocalAgentPlugin.java` by literal markers and pastes them into a generated Java class written from a JS template) | Verdict: REWRITE as a JVM case in `test/integration/android-jvm.test.mjs` after extracting the header copy into one product method
- Covers: native JSON and chat-stream forwarding keep the canonical renderer id and device id, never forward caller `Authorization` or other headers, refuse malformed ids, and only forward a trace id on a bound voice turn of the resident stream. Duplicates: none for the header allow-list (security boundary). Callers/importers: `npm test` glob; `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-13 | T2 | Four text markers (`private static JSONObject json(`, `/** A single ephemeral voice-only feed`, `synchronized(lifecycleLock){requireCurrent`) pin the plugin's layout. | Product: move both loops into one static `NativeForwardHeaders.copy(supplied, body, stream)` (they are near-duplicates, C4); test calls it. | Medium if deleted without the rewrite: header authority loses its only check. |
| 2 | 15-41 | T7 | Java test source inside a JS template literal. | Committed `test/fixtures/NativeForwardHeadersTest.java`. | None |

## Proposed end state
Cases carried: canonical client id and device id kept on both paths; `Authorization` and unknown headers not taken
from the caller; four invalid ids refused; trace id forwarded only on the stream path for a `VOICE_DM` turn whose
`clientMessageId` matches, refused otherwise. One fixture main, run by the android-jvm suite.
