# test/browser/mail-controls.spec.ts
- Lines: 27 | Kind: Playwright, `chromium`, 2 tests. Test 1 is not about mail: it counts assistant pill buttons in Notes. Test 2 fakes a Gmail client by overriding `connectionController.getCloudClient/getSnapshot` in-page (T6) and checks the folder menu | Verdict: MERGE into `journeys/inbox.spec.ts` (test 2) and `journeys/chat.spec.ts` (test 1)
- Covers: compact and expanded assistant controls expose one Talk mic and no Transcribe launcher; Inbox folder menu works by keyboard, closes on system Back with focus restored, and Drafts shows local drafts without provider drafts. Duplicates: `inbox-folders-drafts.spec.ts`, `inbox-folders-compatibility.production.spec.ts` (folder menu and Drafts). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-11 | D11 | Misnamed: assistant pill controls in Notes, nothing to do with mail; asserts exact button count 3. | Move the "one mic, no Transcribe" assertion to the chat composer step; drop the count. | Low. |
| 2 | 14-18 | T6, C3 | Fourth copy of the `getCloudClient` Gmail override (see `journey-f-reviewed-send`, `mail-images`, `mail-preview`). | Shared `fakeGmailProvider`. | Low. |
| 3 | 20-24 | T1-ish | Asserts 44 px height and 8 px right inset of the folder button. | Drop; target size is the accessibility sweep's 24 px rule. | Low. |
| 4 | 25-26 | T4, D8 | Keyboard, Escape, Back and Drafts in one 600-character line; overlaps `inbox-folders-drafts.spec.ts`. | Carry keyboard + Back focus restore as one inbox step if `inbox-folders-drafts` lacks it. | Low. |

## Proposed end state
File deleted. Inbox journey: folder menu by keyboard and Back restores focus; Drafts lists local drafts. Chat journey: the composer exposes one Talk control and no separate dictation launcher.
