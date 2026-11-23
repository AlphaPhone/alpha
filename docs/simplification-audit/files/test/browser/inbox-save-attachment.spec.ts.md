# test/browser/inbox-save-attachment.spec.ts
- Lines: 27 | Kind: Playwright journey (chromium), 4 cases; in-page fake Cloud client; `AlphaFiles` read through `registerPlugin` | Verdict: MERGE into `journeys/inbox.spec.ts` › "hostile attachments" (from `inbox-hostile-attachment.spec.ts`), 2 cases carried
- Covers: a reviewed text attachment saves its exact bytes once, Save disables, survives reload in Files; leaving review aborts a held file read before storage; a filename collision keeps the original and reports "Unconfirmed" without retry; a digest mismatch is rejected before any write. Duplicates: `inbox-hostile-attachment.spec.ts:120-130` (save exact bytes once + reload into Files), `:172-199` (hash/size mismatch refused, nothing saved). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | T6 | Computes the expected review metadata with the product's own `reviewMailAttachment` (`/src/runtime/inbox-attachment.ts`) — expectation built by the code under test. | Use fixed bytes + `createHash` in Node, as the hostile spec does. | Low |
| 2 | 12-14, 25-27 | T4 | Cases 1 and 4 duplicate the hostile-attachment spec. | Delete. | Low |
| 3 | 16-19, 20-24 | — | Held `File.prototype.arrayBuffer` abort and filename collision are unique. The arrayBuffer patch is an in-page monkey-patch (T6) but there is no other way to hold a browser file read. | Carry both into the attachments describe. | Low |
| 4 | 11, 23 | T6 | Reads Files via `registerPlugin('AlphaFiles')` in-page. | Harness `filesEntries(page)` helper shared with the hostile spec (it has the same helper at 79/97). | Low |

## Proposed end state
Two cases ("leaving review aborts a held save", "a name collision keeps the original file") added to the attachments describe; file deleted.
