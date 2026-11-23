# specs/quint/refinement/application/hosted-digest-mutation.mjs
- Lines: 107 | Kind: Quint refinement harness (source campaign over the mounted panel, `HostedDigestMutation`, live) | Verdict: KEEP (edit after Q-LEG-11)
- Covers: scheduled-digest save/discard journal phases (review → dispatched), retry after an unconfirmed reply, and that a retired binding's replies cannot clear, refresh or unbusy its replacement (`hosted-digest-ui.tsx`, `hosted-digests.ts`). Duplicates: `test/hosted-digest-mutation-ownership.test.mjs` mounts the same panel through `withHostedDigestRefresh` (T4 candidate, reviewed in the host-test chunk). Callers/importers: `test/quint-hosted-digest-mutation.test.mjs`; aggregate `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23, 30, 45, 80-92 | A1 | A journal row without `phase` is treated as `'legacy'`; four of eight cases seed it. This is the "legacy record without a phase" behaviour the Lemma contract `digestPhaseDiscardable` also encodes (Q-LEG-11 / Q-FORMAL-2, open). | When the owner confirms D1 applies: drop `'legacy'` seeds and the `|| 'legacy'` projection together with the model and Lemma change. Until then, keep. | M: changes a proof. |
| 2 | 5, 97-101 | — | Reads no source text itself; reuses `withHostedDigestRefresh` (Chromium mount). Inherits that harness's marker (see its report). | Follows the `hosted-digest-refresh.mjs` port. | — |
| 3 | 11-17 | — | Notice strings mapped to classes; copy changes fail loudly. | Keep. | — |

## Proposed end state
Unchanged structure; legacy-phase cases removed if Q-LEG-11 is answered "delete"; imports the panel mount from a shared `hosted-digest-panel.mjs` support module once that is extracted.
