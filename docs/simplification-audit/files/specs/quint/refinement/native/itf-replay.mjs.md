# specs/quint/refinement/native/itf-replay.mjs
- Lines: 91 | Kind: harness engine (runs the pinned Quint simulator with `--mbt`, decodes ITF, replays each trace in its own JVM run and deep-compares per-step observations) | Verdict: KEEP (become the shared ITF module)
- Covers: no product behaviour; the replay mechanism for `HomeInstanceHandoff`, `ResidentStartCancel`, `RendererBackgroundRebuild`, request withdrawal. This is the import-and-run style the owner wants (real classes, model-generated inputs). Duplicates: ITF decoding `plain()` and simulator invocation are re-implemented in `services/maps-model-traces.mjs` (exports its own `plain`, `modelTraces`, `replayTraces` for JS targets) and `#bigint` decoding appears in 8 more files (`check-traces.mjs`, `observed-replay.mjs`, `assistant-model-traces.mjs`, `application/{notes-files-media-itf,browser-model-traces,calendar-itf,shell-model-traces}.mjs`, `services/inbox-workflows-model-traces.mjs`). Callers/importers: `home-instance-handoff.mjs`, `request-withdrawal.mjs`, `resident-start-cancel.mjs`, `renderer-background-rebuild.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-25, 27-43 | C3 / C5 | Two ITF engines (`modelTraces` here vs `services/maps-model-traces.mjs`) with the same export name and different options; ~10 copies of the ITF value decoder. | One `specs/quint/refinement/itf.mjs` exporting `plain`, `simulate`, `modelTraces`; Java (`replayJava`) and JS (`replayTraces`) replayers on top. | Low |
| 2 | 30 | — | Hard-codes `specs/quint/native/${model}.qnt`; a shared module should take the model path. | Parameter. | None |
| 3 | 81-82 | B5 | `recordComparedObservation` writes every compared observation to the receipt store. | Keep only if receipts survive. | None |
| 4 | 63-91 | — | One JVM per trace via `javaTraceCampaign` (one compile, N runs): correct for static product state; notable runtime (64+ JVM starts per model). | Keep. | — |

## Proposed end state
Moved up one level as the single ITF utility for all families; native replays keep `replayJava`.
