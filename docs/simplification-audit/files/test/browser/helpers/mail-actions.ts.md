# test/browser/helpers/mail-actions.ts
- Lines: 8 | Kind: Playwright UI helper | Verdict: **MERGE** into `harness/nav.ts`
- Covers: opens the visible message actions menu and picks Reply/Forward/Archive/Trash/Ask Alpha. Duplicates: none. Callers/importers: `context-selection`, `dev-inbox-triage`, `dev-inbox`, `responsive-surfaces` specs and `scripts/test-inbox-drafts-browser.ts` (a `scripts/test-*` Playwright script, T9/P16).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | T7 | Locates the menu by CSS class `.mail-message-menu`. | `getByRole('group'…)`/label-based as the other menu helpers. | none |

## Proposed end state
`nav.chooseMailAction(name)` in `harness/nav.ts`; file deleted. The `scripts/test-inbox-drafts-browser.ts` importer moves into `test/browser` or is deleted (chunk owning scripts).
