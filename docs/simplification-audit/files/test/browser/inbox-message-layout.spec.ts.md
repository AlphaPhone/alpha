# test/browser/inbox-message-layout.spec.ts
- Lines: 19 | Kind: Playwright journey (chromium, dev Inbox), 2 cases | Verdict: MERGE into `journeys/inbox.spec.ts` (one step of the compose/read case)
- Covers: a locally sent email with a 120-character subject, 200-character URL and an `<img onerror>` line is read back from Sent without horizontal scroll, as `pre-wrap` text, with no image created or script run. Duplicates: inert-markup rendering is also proven for attachments in `inbox-hostile-attachment.spec.ts`; layout at large text in `inbox-compose-layout.spec.ts`. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T6 | Text scale via `BrowserDevice.prototype.setTextScale`. | Harness helper. | Low |
| 2 | 2 | T7 | Light/dark loop for a layout/injection check. | One theme. | Low |
| 3 | 16-17 | B5 | Two screenshot artefacts. | Drop. | — |

## Proposed end state
After the compose step in `journeys/inbox.spec.ts`, send the long hostile-looking message locally and read it from Sent: no horizontal overflow, `pre-wrap`, no `img`, `window.mailInjected` undefined. File deleted.
