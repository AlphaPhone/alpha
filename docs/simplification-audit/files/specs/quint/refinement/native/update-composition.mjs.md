# specs/quint/refinement/native/update-composition.mjs
- Lines: 75 | Kind: Quint refinement harness (Java) via `exactUpdateMembers` slice | Verdict: PORT (follows update-barrier)
- Covers: model `NativeUpdateComposition` (live; composes NativeUpdateActivation, NativeUpdateStaging, RuntimeUpdatePause) — pre-stop durable write, confirmed stop, COMMITTING, session handoff, cold/warm/unsupported boot cut points. Duplicates: `test/quint-native-update-composition.test.mjs` (T4). Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 40-41 | T10 | Uses `exactUpdateMembers` (see update-barrier report). | Compile `AppUpdater.java` after U-A1. | M |
| 2 | 30-31 | B5 | Hashes `AlphaLocalAgentPlugin.java` (replaced by `UpdateCompositionResidentPort.java`) and `NativeUpdateStaging.qnt` (not this model) without using them. | Drop. | L |
| 3 | 33-36 | C3 | Pinned-blob assertion loop duplicated. | Shared helper. | L |
| 4 | 47-52 | – | Only `ambiguous-terminal-sync` may skip (host capability). | Keep. | – |

## Proposed end state
~55 lines on the shared update source list; no slice, no unused inputs.
