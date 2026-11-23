# test/fixtures/SpeechOutputWarmupTest.java
- Lines: 85 | Kind: unit (upstream `SpeechOutputWarmup` with a fake `StreamingSpeechPlayback.Output`) | Verdict: DELETE
- Covers: the speech output warm-up writes only bounded silence (15 s), closes once, never plays after close or a late open, and retires on write failure or zero writes. Duplicates: `vendor/eliza/plugins/plugin-local-inference/native/android/test/speech/SpeechOutputWarmupTest.java` is the same file plus one doc comment (`diff` differs at line 8 only); upstream runs it from `test/speech-output.node.mjs`. Callers/importers: only `test/speech-output-warmup.test.mjs:35`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-85 | T4, T5 | Verbatim copy of an upstream test. Alpha also rebuilds the patched native tree (`materializeNativePatches`) to compile it, although the manifest has no patches. | Delete; remove the `runJvm` lines 35-36 from the importer. Lines 17-31 of the importer are source-text regexes over the upstream bridge (T1) and go too. | None |
| 2 | 70-72 | T8 | Busy-wait on `Thread.State.BLOCKED`. | Upstream concern. | — |

## Proposed end state
Deleted, and with it most of `test/speech-output-warmup.test.mjs` (what remains, `FirstWriteSpeechOutputTest`,
belongs to another chunk's review).
