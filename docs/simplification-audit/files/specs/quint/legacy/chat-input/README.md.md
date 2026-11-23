# specs/quint/legacy/chat-input/README.md
- Lines: 18 | Kind: documentation of the ChatInput mounted-composer replay | Verdict: DELETE (with C17)
- Covers: explains that `check-chat-input-refinement.mjs` mounts the flag-off launcher in Chromium and replays composer schedules against historical `ChatInput.qnt`, recording four expected mismatches. Duplicates: the `chatInputDifferences` text in `specs/quint/refinement/legacy/index.mjs`. Callers: nothing links to it (`git grep chat-input/README` → 0).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 / A7 | Describes a historical comparison harness that is being deleted; unreferenced. | Delete with the folder. | None |

## Proposed end state
Removed together with `specs/quint/legacy/chat-input/`.
