# specs/quint/refinement/application/vault-coordinator-notes.md
- Lines: 5 | Kind: harness prose | Verdict: MERGE into the header comment of `vault-coordinator.mjs`
- Covers: describes the CredentialVault coordinator replay (nine schedules, secret-presence abstraction, platform obligations). Referenced by `specs/quint/refinement/application/README.md:71`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | B5 | "Nine schedules" count goes stale. | Drop the count. | L |
| 2 | — | C7 | Separate notes file for one harness; README lists four such notes files. | Fold into the harness header and drop the README sentence. | L |

## Proposed end state
Deleted; its two paragraphs become the `vault-coordinator.mjs` header comment.
