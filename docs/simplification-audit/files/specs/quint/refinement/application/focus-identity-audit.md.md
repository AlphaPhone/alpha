# specs/quint/refinement/application/focus-identity-audit.md
- Lines: 7 | Kind: orphan prose (no model, no harness) | Verdict: DELETE
- Covers: nothing executable. It narrates "The November 8 integration" of semantic focus keys and says previous implementations "are superseded". Duplicates: n/a. Callers/importers: none (`git grep -n "focus-identity-audit\|FocusIdentityAudit"` outside the audit: 0 hits; no `FocusIdentityAudit.qnt`, no manifest entry).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-7 | A8 | Changelog/tombstone note in the formal tree; refers to a "source helper receipt" that no file produces. | Delete. | None |

## Proposed end state
File removed. Focus identity is covered by the accessibility/focus Playwright journeys named in the note itself.
