# specs/quint/refinement/application/README.md
- Lines: 73 | Kind: documentation (application-family adapter catalogue) | Verdict: DELETE (merge 5 lines into `specs/quint/refinement/README.md`)
- Covers: describes `index.mjs`, six aggregate adapters and "source-discovered model corrections". Duplicates: `specs/quint/refinement/README.md`, adapter header comments, per-harness `.md` notes. Callers/importers: humans only (`docs/formal-model-audit-2026-11/08-infra-lemmascript.md`, `specs/quint/README.md`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | §2.15 stale | "executes source adapters for the 22 application models"; `index.mjs` now lists ~113 adapters. | Delete the count. | None |
| 2 | 6 | P1/T4 | Points readers at `test/quint-application-refinement.test.mjs`, the 18-minute aggregate the audit deletes as a duplicate of per-model wrappers. | Point at the single runner. | None |
| 3 | 20-21, 43-47, 71 | A1 | Describes legacy Notes tombstone/Trash policy, "last-check legacy-write race", `legacyWriteAfterPrepareTest`, "legacy Notes … receipts". D1 deletes the legacy Notes engine and its models/harnesses. | Delete. | None |
| 4 | 21 | A3 | "development vault metadata" (credential vault / password transfer) is in D3 scope for deletion where only backup/transfer uses it. | Drop with the code. | Low |
| 5 | 33-41 | (narrative) | "Source-discovered model corrections" (StartupPermissions, DraftDispatch) are explanations that belong as comments in those `.qnt` files. | Move each 2-3 line explanation into the model file as a comment, if the model survives. | Low |
| 6 | 69-73 | B5 | "Shared source is prepared from SDK99…source ledger records domain allocation and drift" — receipt ceremony. | Delete. | None |

## Proposed end state
File deleted. The method lives in `specs/quint/refinement/README.md`; per-model explanations live in the `.qnt` files.
