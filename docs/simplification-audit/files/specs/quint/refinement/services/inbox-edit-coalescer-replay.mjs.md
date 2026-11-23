# specs/quint/refinement/services/inbox-edit-coalescer-replay.mjs
- Lines: 88 | Kind: Quint replay (imports real `editCoalescer` from `apps/app/src/runtime/inbox-edit-coalescer.ts`; model scenarios + 60 random walks) | Verdict: KEEP, SIMPLIFY
- Covers: retained-edit write coalescing: burst, bounded wait, hold/release, leave, oversized edit, retire against `InboxEditCoalescer.qnt`. Duplicates: `forward-replays.mjs` row `InboxEditCoalescer` re-runs Case1+Case2 (T4). Callers: `test/quint-inbox-edit-coalescer.test.mjs`, `forward-replays.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 75-82 | T3 | `runInboxEditCoalescerCase3` is a hand-scripted unit check of one invariant (`WaitingHasDriver`) outside the model trace machinery; the random walks already assert every step against the model. | Delete Case3 and its `test(...)` line. | Low |
| 2 | 62, 68, 75 | A7 | Parameters `t` and `{canaries=true}` are unused in all three cases. | Remove. | Low |
| 3 | 2, 4-5 | B5 | Module-level `observedTraces`/`observedCheckpoints` counters and `recordComparedObservation` exist only for the forward-replay receipt. | Drop with `forward-replays.mjs`. | Low |
| 4 | 84-88 | — | `runInboxEditCoalescerReplay` exists only for `forward-replays.mjs`. | Delete with it. | Low |
| 5 | 6 | C5 | Uses `inbox-workflows-model-traces.mjs` (another ITF/text-parsing twin). | Re-point to `itf-replay.mjs`. | Low |

## Proposed end state
One exported `replayInboxEditCoalescer()` doing scenarios + walks; one test line.
