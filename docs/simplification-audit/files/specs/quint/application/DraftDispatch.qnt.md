# specs/quint/application/DraftDispatch.qnt
- Lines: 78 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP
- Covers: AssistantDraftController per-conversation write queue: held text retained until dispatch, unsettled sends never auto-offered, conflict review on failed release. Duplicates: `test/quint-conformance.test.mjs` replays two scenario end states (overlap with harness). Callers/importers: `specs/quint/refinement/application/portable.mjs` (`draftDispatch`, via `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`)), `test/quint-conformance.test.mjs:146,176`, services manifest note.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — | portable.mjs loads `assistant-draft-controller.ts` via `sourceModule` (bundle import). | None. | — |
| 2 | — | T4/T9 | `test/quint-conformance.test.mjs` checks two DraftDispatch scenario end states already covered by the harness traces; `quint:conformance` alias is slated for deletion. | Delete the DraftDispatch cases there. | None. |

## Proposed end state
Already the target shape. One runner.
