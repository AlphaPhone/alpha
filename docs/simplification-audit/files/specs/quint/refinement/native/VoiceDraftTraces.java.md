# specs/quint/refinement/native/VoiceDraftTraces.java
- Lines: 137 | Kind: Quint refinement driver (host JVM; compiles the staged patched upstream `ai.eliza.voice.LocalVoiceRecording` whole with `NoteRecordingPorts` media/clock ports) | Verdict: KEEP
- Covers: model `NativeVoiceDraft` (live): the native voice-draft recorder used by Notes/voice capture. 22 scenarios: start/stop, 29 s and 59 s limits, invalid limit, cancel, wrong-id discard, mic error, deadline, max-size/duration info, event consumer throwing, stale callbacks after cancel, foreign metrics refusal, external selection, recreate sweeps stale `alpha-draft-*` cache only, empty/oversized/max-bytes files, stop/open/auto-stop/constructor failure, call interruption with and without release failure. Duplicates: none for this class on the host (`test/note-recorder*`-style host tests cover `AlphaNoteRecorder`, a different class). Callers: `voice-draft.mjs:22` (`javaTraces(..., ['campaign', ...])`); `index.mjs:18`; wrappers `test/quint-native-voice-draft.test.mjs` (DELETE, T4) and the native aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-137 | — | Ties to product code by compiling the real class through `preparePatchedNative()` (no text slicing). This is the target shape for T10 ports. | Keep. | — |
| 2 | 27, 31-35, 61, 75-77, 104 | T10 (reflection) | Reads private fields `file`, `recorder`, `id`, `startedAt`, `deadline`, `interrupted` via `Trace.read`. These are upstream (`vendor/eliza`) field names, so they change only on a pin bump. | Accept; or ask upstream for a package-private snapshot (D14 follow-up). | Low |
| 3 | 126-136 | C5 | Re-implements "one JVM per scenario" by spawning itself (`ProcessBuilder`) for each argument, while `java.mjs:javaTraceCampaign` already does that from Node. | Call `javaTraceCampaign` with one argument set per scenario and delete the `campaign` branch. | Low |
| 4 | 16-23 | D3 | All state is static and reset per JVM; fine because of finding 3. | — | — |
| 5 | — | P6 | The model concerns upstream code (`plugin-local-inference`). It is live in this product (Notes voice drafts) and the source is effective after local patches (`android/upstream-native-sources.json`), so it should stay here while patches exist; run it only when the lock, the patch set or its driver changes. | Path filter: `upstream.lock.json`, `patches/eliza/**`, `android/upstream-native-sources.json`, this directory. | — |

## Proposed end state
Unchanged scenarios; one JVM per scenario launched by `javaTraceCampaign` rather than a self-spawning `campaign` mode.
Run in the native family lane only when its inputs change.
