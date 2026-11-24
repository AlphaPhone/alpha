# test/private-cloud-restore.test.mjs
- Lines: 57 | Kind: transplant (slices `initialize()`, `work(` and `restoreOptionalBrowserCloudAccount(` out of `connection-ui.tsx`, runs them in `vm` with ~35 fakes) | Verdict: DELETE; one case to `journeys/connection-cloud.spec.ts` (dev project) if the private preview stays
- Covers: in the browser private local preview (`npm run dev`), the agent attaches first and a stored Cloud reference is verified and adopted once; a changed credential, owner epoch or choice during discovery blocks late adoption. Duplicates: `test/browser/dev-cloud-identity.spec.ts` drives dev Cloud identity in a page. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | T2 | Three marker slices of `connection-ui.tsx`; line 11 even tolerates the helper being absent (`source.includes(...)?section(...):''`), so the test can pass with the feature gone. | Delete. | Low |
| 2 | 14-27 | T2 | 35-name fake context, including `CalendarApprovalClient` imported for real but otherwise unused by the assertions. | Delete. | Low |
| 3 | 46-48 | B4 | Six "existing fence remains" cases only assert that a fake was not called. | Delete. | Low |
| 4 | 28-36, 49-57 | keep-behaviour | Replaced reference / changed ID / epoch change blocks adoption: development-only (D6) but an account-mixing guard. | If kept, one dev-project journey case: swap the stored reference between reads, expect "Account changed". | Low |

## Proposed end state
File deleted. Private-preview Cloud restore is a dev surface (D6); at most one case in `journeys/connection-cloud.spec.ts`
on the dev project. No production behaviour loses coverage.
