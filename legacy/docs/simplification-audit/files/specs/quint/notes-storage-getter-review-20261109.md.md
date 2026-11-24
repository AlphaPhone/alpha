# specs/quint/notes-storage-getter-review-20261109.md
- Lines: 5 | Kind: point-in-time review note (narrative) | Verdict: DELETE
- Covers: describes a 2026-11-09 change to "Previous Notes presence" storage getter handling. Duplicates: git history / PR description. Callers/importers: none (`git grep notes-storage-getter-review` outside the audit folder: no hits).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | A1, A8 | Describes the "Previous Notes" / canonical-vs-previous source selection, which D1 deletes (legacy Notes readers). The note is about to describe code that no longer exists. | Delete. | None |
| 2 | 1-5 | §2.15 stale narrative | Change log prose in a spec tree; no tool or test reads it. | Delete. | None |

## Proposed end state
File removed. If the `blockedStoreRemainsUnavailableTest` scenario it mentions survives in a live model, its intent is the model's own comment.
