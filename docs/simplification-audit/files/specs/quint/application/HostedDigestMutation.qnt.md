# specs/quint/application/HostedDigestMutation.qnt
- Lines: 103 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; EDIT model with B297 (drop "legacy" phase)
- Covers: scheduled digest save: journal phases (review/dispatched), retry/discard, and that a retired owner's replies cannot clear, refresh or unbusy the replacement (`hosted-digest-ui.tsx`, `hosted-digests.ts`). Duplicates: harness reuses `hosted-digest-refresh.mjs` mount. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `hosted-digest-mutation.mjs` via `test/quint-hosted-digest-mutation.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | A1 | `JournalPhases` includes `"legacy"`: a pending record without `phase` from an older build (`hosted-digest-ui.tsx:66-67`). B297/D1 delete that reader. | When B297 lands, remove `"legacy"` from `JournalPhases`; rewrite runs `retiredJournalClearDoesNotRefreshReplacementTest`, `oldCleanupKeepsNewSaveBusyTest`, `discardClearsOnlyAnUnsentReviewTest` with `""`/`"review"` as the second journal. | M: model and harness must change in the same commit as the code |
| 2 | harness 23-92 | A1 | Harness seeds `null` phase for `legacy` and has four cases using it. | Drop those seeds/cases with the model change. | M |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model without the legacy phase; same invariants.
- Harness cases seeded only with current phases; lands with the B297 code change.
