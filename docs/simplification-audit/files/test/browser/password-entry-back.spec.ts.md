# test/browser/password-entry-back.spec.ts
- Lines: 37 | Kind: Playwright, chromium, `?mode=dev`; UI journey on the development vault | Verdict: MERGE into `journeys/settings.spec.ts` (Passwords section)
- Covers: Android Back on New/Edit password returns to the still-unlocked list and forgets the typed password. Duplicates: `password-manager.spec.ts` test 1 walks the same forms (but not Back). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-15 | C3 | `unlockedVault()` duplicates `devVault()` + unlock in `password-manager.spec.ts`. | One journey step. | None. |
| 2 | 16 | P2 | Back is `dispatchEvent('alpha-back')`. | Harness `androidBack()`. | None. |
| 3 | 18-37 | T7 | Two tests for two forms. | Keep as a two-row loop inside the Passwords journey. | None. |

## Proposed end state
Becomes a step of the development-vault journey: open Add and Edit, type a password, press Back, list stays unlocked, reopened form is empty, typed value nowhere in the page.
