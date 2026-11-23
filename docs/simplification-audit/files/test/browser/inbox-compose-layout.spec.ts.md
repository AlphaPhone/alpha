# test/browser/inbox-compose-layout.spec.ts
- Lines: 28 | Kind: Playwright journey (chromium, dev Inbox `?mode=dev`), 4 parametrised cases | Verdict: MERGE into `journeys/inbox.spec.ts` (compose + local draft case)
- Covers: at 150 % text the compose form keeps the body editable and the long recipient chip inside its row; Save draft / Discard / Send stay on screen; a saved local draft is restored after reload with subject, Cc, Bcc and nothing sent; the recipient chip can be removed. Duplicates: `inbox-read-cancel-draft.spec.ts` (draft fields retained incl. Cc/Bcc), `inbox-unsaved-recovery.spec.ts` (draft recovery across reload; storage project), `dev-inbox-*` specs. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T6 | Text scale via `BrowserDevice.prototype.setTextScale` import. | Harness helper. | Low |
| 2 | 2 | T7 | 2 themes x 2 viewports. | One portrait case; landscape only if needed. | Low |
| 3 | 25 | — | Reads `localStorage['alpha.dev.app.inbox']` to assert nothing was sent: dev-simulator internal state. | Assert via the Sent folder UI instead. | Low |
| 4 | 12 | D8 | Mis-indented line. | Format. | — |

## Proposed end state
One "compose at large text and restore a local draft" step group in `journeys/inbox.spec.ts` (dev Inbox): fields stay reachable, chip stays inside its row, save → reload → restore keeps subject/Cc/Bcc/body, Sent stays empty. File deleted.
