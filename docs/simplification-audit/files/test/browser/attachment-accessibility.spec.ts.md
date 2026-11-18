# test/browser/attachment-accessibility.spec.ts
- Lines: 8 | Kind: Playwright spec, chromium dev, 4 loop tests; state seeded through `/src` imports | Verdict: MERGE into `journeys/inbox.spec.ts` (attachment step)
- Covers: the reviewed-attachment dialog stays readable at 150 % text and 360 px (no horizontal overflow, 44 px Done target, scrollable text), Back closes it and focus returns to the trigger. Duplicates: `attachment-lifecycle.spec.ts` test 1 (Back closes the dialog). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P2/P3 | Text scale set by calling `BrowserDevice.prototype.setTextScale` directly. | Use the harness `textScale` option or Settings → Display. | Low. |
| 2 | 5 | P2 | Attachment opened via `registerPlugin('AlphaFiles').importFile` + `AlphaMailAttachments.openReviewed`, not by opening a message attachment. | Open it from a seeded mail message in Inbox. | Medium: needs a mail fixture with an attachment. |
| 3 | 2 | T4 | 2 themes × 2 heights; theme is the a11y sweep's job. | One run at 360 px, 150 %. | None. |

## Proposed end state
One step in `journeys/inbox.spec.ts`: open a seeded attachment, assert layout at 150 % text, Back closes, focus returns. File deleted.
