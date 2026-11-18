# test/fixtures/NativeVoiceBindingTest.java
- Lines: 16 | Kind: Java fixture, single-class unit (`NativeVoiceBinding`, compiled with `VoiceEventAdmission`) | Verdict: MERGE into the Gradle JVM resident/voice suite
- Covers: a native voice binding is current only for the same epoch, runtime root, token and owner, before expiry and while the resident is running. Duplicates: none. Callers/importers: `test/native-live-pcm.test.mjs:16` (research: that file's two upstream cases go, this Alpha case stays).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T3 | Seven boolean rows over one predicate. Kept because it is the owner/re-enrollment fence for streamed voice (a stale binding would send audio to a previous owner's agent). | One table-driven method. | Medium if deleted |
| 2 | importer | cross-file | U-A7 merges `VoiceEventAdmission` into `NativeVoiceBinding`; the compile list shrinks. | Apply with the move. | Low |

## Proposed end state
`nativeVoiceBindingFences` in the Gradle resident suite. Fixture and the javac line in `native-live-pcm.test.mjs` deleted.
