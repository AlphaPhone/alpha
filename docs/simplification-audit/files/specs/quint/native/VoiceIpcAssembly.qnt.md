# specs/quint/native/VoiceIpcAssembly.qnt
- Lines: 123 | Kind: Quint model (live) | Verdict: KEEP (upstream lane only); fix manifest sources
- Covers: `BufferedStreamExchange.exchange`: one owned handle, deadline, bounded chunk assembly, completion validation, first failure wins, foreign handle preserved, cleanup. Duplicates: none. Callers/importers: `quint:check`, `refinement/native/index.mjs:136-152` (`JournalTraces.java` group, eight actual exchanges), obligation `index.mjs:241`; mentioned in `specs/quint/verification.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `sources` vs `sharedSources` | T10 | `sources` lists Alpha `NativeVoiceBinding.java` and `VoiceEventAdmission.java`, but the harness compiles and runs only vendor `BufferedStreamExchange.java`. The Alpha files are pinned without being exercised, so edits to them re-run this model for nothing, while the obligation says "actual owner/binding admission" is open. | Drop the two Alpha files from `sources` (the model is upstream-only), or extend the harness to run `VoiceEventAdmission` as the guard port. The former is the simplification. | Low |
| 2 | – | P6 / §2.9 | With finding 1 applied the model is upstream-only. | Upstream-pin lane; move upstream as a D14 follow-up. | Low |
| 3 | harness | C5 | The exchange is replayed inside `JournalTraces.java`, a harness named for deletion/SMS journals, under main class `ai.eliza.plugins.messages.JournalTraces`. | When harnesses are reorganised, give it its own group (or rename the group "UpstreamComponentTraces"). | Low |
| 4 | 90-123 | – | Nine scenarios cover all failure paths; model is fine. | None. | – |

## Proposed end state
Model unchanged. Manifest `sources` empty (only `sharedSources` vendor file), so Alpha voice binding edits do
not select it. Replayed in the upstream-pin lane by a Java group that runs the real class.
