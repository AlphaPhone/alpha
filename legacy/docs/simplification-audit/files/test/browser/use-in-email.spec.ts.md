# test/browser/use-in-email.spec.ts
- Lines: 112 | Kind: Playwright chromium, 5 tests (theme loop); real UI for the review dialog, but the agent reply is injected with `shell.agentSay()` from a captured `Component` instance, and the connection controller, secure store and Cloud client are patched in-page (s4 r25) | Verdict: MERGE unique cases into `use-in-email.production.spec.ts` (`journeys/inbox.spec.ts`); then DELETE
- Covers: reviewed reply fills the selected email's draft and never sends (light/dark, focus trap, Escape); a reply from another agent session is not inserted; system Back cancels the review and a reply to your own message names no recipient; a full-height launcher conversation keeps the review below the status bar and an off-screen draft is named and appended to. Duplicates: test 1 = production test 1; test 2 ≈ production account-change test. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25, 32 | P3 / T6 | `Component.prototype.renderVals` patched to capture the shell, then `shell.agentSay(text)` fabricates the reply. The production twin gets a real agent turn. | Delete; use the production harness's `ask()`. | None |
| 2 | 18-19, 23-24 | P2 / P3 | `secureConnectionStore.read/compareExchange`, `getCloudClient`, `getSnapshot` replaced in-page. | Gone with the merge (`flag-off-android` stubs the native store). | None |
| 3 | 35 | T4 | Light and dark run the whole flow; only a screenshot differs. | Drop dark. | None |
| 4 | 65-72 | T4 | Session change refusal duplicates the production account-change test's rule. | Drop. | None |
| 5 | 74-90, 92-112 | — | Own-message (no recipient), system Back, launcher full-height geometry and off-screen draft cases exist only here. | Carry into the production spec with a `FlagOffAccount` whose message is from the owner, and `residentHome` in launcher shell. | Medium: lost if not carried. |

## Proposed end state
Add two cases to `journeys/inbox.spec.ts` (production): "reply to your own message: review names no recipient, system Back closes only the review, inserting leaves To empty" and "full-height conversation keeps the review under the status bar; a set-aside draft is named as off screen and the next suggestion is appended". Delete this file.
