# test/browser/inbox-attachment-layout.spec.ts
- Lines: 36 | Kind: Playwright spec (chromium), 4 parametrised cases; fake Cloud client installed in-page | Verdict: MERGE into `journeys/inbox.spec.ts` (attachment review case, one size)
- Covers: at 150 % text the text-attachment review keeps Back focused/reachable (44 px), keyboard scrolling, no horizontal overflow, markup shown as text; Back returns focus to the attachment; Ask Alpha stages the email and Remove email (keyboard) unstages without sending; a revoked grant on focus withdraws the message and offers Connect Gmail. Duplicates: `inbox-hostile-attachment.spec.ts` (markup shown inert, Ask Alpha staging excludes attachments, no agent sends), `inbox-save-attachment.spec.ts` (same fixture), `home-inbox.spec.ts:212-219` (foreground grant revocation). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-14 | T6 / T7 | Another copy of the in-page Cloud-client fixture (`connectionController.getCloudClient/getSnapshot`, `inboxLocalStore` stubs, `alphaClient.send` replaced). | Shared `harness/gmail.ts`. | Low |
| 2 | 16 | T6 | Text scale set by calling `BrowserDevice.prototype.setTextScale` from `/src/browser/device.ts`. | Harness `setTextScale(page, 1.5)` (there is one in `accessibility-states.ts`) or the Settings UI. | Low |
| 3 | 2 | T7 | light/dark x 2 sizes = 4 runs; the revocation step runs in only one of them (line 35). | One run at 360x640, plus the landscape size only if it found bugs; split revocation into its own step. | Low |
| 4 | 26-34 | T4 | Ask Alpha staging + Remove email duplicates `inbox-hostile-attachment.spec.ts:213-234`. | Keep only the keyboard-removal + 44 px target bits here. | Low |
| 5 | 25 | B5 | Screenshot artefact. | Drop. | — |

## Proposed end state
One step group inside `journeys/inbox.spec.ts` › "attachment review": large-text layout and keyboard reading, focus return, keyboard "Remove email". Revocation lives in the Home/Inbox grant case. File deleted.
