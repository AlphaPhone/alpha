# test/browser/user-selected-settings.production.spec.ts
- Lines: 82 | Kind: Playwright production (flag-off bundle), 2 tests (viewport loop 390 / 1280); real UI only (s0 r42) | Verdict: MERGE into `journeys/settings.spec.ts`
- Covers: Settings root groups (Account, General, Privacy, Apps, About) and no "Voice & personality"; Account opens the sign-in dialog without text fields; Privacy → Permissions shows app permissions without starting the walkthrough or prompting; About → Licenses search and detail show the bundled notice text and keep the search on Back; Display text size and Notifications "Allow alerts" persist across a reload; Apps → Inbox → Google & email opens one Google accounts dialog inside the viewport. Duplicates: `speak-replies.spec.ts` (Settings root, removed controls), other `settings-*` specs. Callers/importers: production project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T4 | The whole 80-line walk runs at both viewports; only the Google dialog bounds (lines 77-80) depend on width. | Full walk at 390; a short case at 1280 that opens Google & email and checks bounds. | None |
| 2 | 10-13 | — | Permission-API refusals counting prompts: a good boundary assertion. | Keep; move to a harness `forbidPermissionPrompts()` helper. | None |
| 3 | 20 | A8 | `Voice & personality` absence check is a tombstone of a removed control. | Drop. | None |
| 4 | 38-40 | — | Reads `/licenses/third-party-notices.json` to pick the expected text: ties the test to a built asset, which is the point on the production bundle. | Keep. | None |

## Proposed end state
In `journeys/settings.spec.ts` (production): one walk at phone width covering root groups, Account sign-in dialog, Permissions without prompts, Licenses search/detail/back, text size and alerts persisting across reload; one desktop-width check that Google accounts opens as the only dialog within the viewport. Delete this file.
