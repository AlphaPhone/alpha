# test/browser/dev-surface-copy.spec.ts
- Lines: 10 | Kind: Playwright, chromium; UI smoke over every app in dev mode | Verdict: MERGE into `journeys/dev-surface.spec.ts`
- Covers: opening each app in the development build never shows native-only "missing feature" copy. Duplicates: `dev-parity.spec.ts:47-58` (opens Phone/Messages/Contacts/Wallet). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | A3 | App list includes `'Wallet'` (deleted, D2). | Drop from the list. | None. |
| 2 | 7 | — | Negative regex over `body.innerText` for five error phrases; cheap and useful as a dev smoke. | Keep as one case of the dev-surface smoke. | None. |
| 3 | 4 | T7 | Inline connection seed. | Harness fixture. | None. |

## Proposed end state
One case "every app opens in dev mode without native-only error copy" inside `journeys/dev-surface.spec.ts` (with the device-controls round trip from `dev-parity`).
