# apps/app/src/startup-permissions.css
- Lines: 38 | Role: styles for the startup "Access" checklist / "All set" modal dialog (`.alpha-startup-permissions`, `.alpha-permission-*`). | Verdict: KEEP (minor SIMPLIFY)
- Importers: `startup-permissions.tsx:13` only. No test pins its text.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 37 | D8 | `.alpha-permission-icon` declared twice (`position:relative` appended at 37). | Merge 37 into 5. | None. |
| 2 | 1-38 | C6 / D12 | Every colour is a `--connection-*` token with a fallback (`var(--connection-bg,#fff)` ×7 …); the tokens are copied in JS from `.os` computed styles by `startup-permissions.tsx:191` (theme-token copy loop, one of ~15 such loops in `browser/`). | If the dialog is mounted inside `.os`, consume the shell tokens (`--bg`, `--fg`, `--s2`, `--line`, `--mut`, `--acct`) directly and delete the JS copy loop; otherwise define the `--connection-*` aliases once in shared CSS (connection-ui.css already defines them) instead of copying at runtime. | Low-medium: visual check needed in light/dark. |
| 3 | 6, 14, 16, 19, 27, 38 | D12 | Many `!important` overrides (`width:36px!important`, `font-size:16px!important`) to beat inline `iconStyle()` sizes and button resets. | Size icons with a class instead of inline style, then drop the `!important`s. | Low. |
| 4 | 13-14 | C5 | Comment states `.alpha-permission-primary` duplicates `connection-ui.css .alpha-btn`. | Reuse `.alpha-btn` in the markup and delete the duplicate rule. | Low (visual). |

## Local types and helpers
None.

## Proposed end state
~32 lines: no duplicated selector, primary button shared with connection-ui, no runtime token copying, fewer `!important`.

## Verification
Playwright `startup-permissions-walkthrough.spec.ts`, `startup-access.spec.ts` screenshots in light and dark; manual look at the Android first-run access screen.
