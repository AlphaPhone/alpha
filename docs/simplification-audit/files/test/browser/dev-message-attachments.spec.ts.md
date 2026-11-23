# test/browser/dev-message-attachments.spec.ts
- Lines: 39 (8 tests) | Kind: Playwright `chromium`, dev build; UI on the Messages simulator, assertions on `alpha.dev.app.messages` | Verdict: **MERGE** into `journeys/telephony.spec.ts` (2 cases)
- Covers: a Messages attachment survives save draft, reload, restore, send and reopen with exact bytes; failed send keeps the tray; late selection after Home or device retirement is discarded and an invalid replacement keeps the current file; a text-only draft is removed when sent; review hold during retirement; PNG decoded after reload; PDF download is the complete original. Duplicates: `dev-phone-messages.spec.ts` (local message send and reload); the late-selection rule is the visible half of `dev-file-picker.spec.ts`. Callers/importers: `chromium` project; uses `pdf-lib` and `node:fs/promises` in the runner.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | — | Attach, save draft, reload, restore, send, open the same bytes, no external traffic. | Carry; assert through the viewer, not `localStorage`. | none |
| 2 | 8-10, 26-33 | P3 | Throwing `setItem`; replaced `crypto.subtle.digest` gate. | Delete. | Low |
| 3 | 11-13, 18-25 | — | Late selection after Home / device retirement is discarded; invalid replacement keeps the current file. | Carry the Home arm and the invalid replacement as steps; drop the `alpha:device-state` arm. | none |
| 4 | 14-16 | T4 | Text-only draft removal: a subset of case 1. | Delete. | none |
| 5 | 34-39 | — | PNG decoded after reload; PDF download byte-identical. | Carry the PDF case (it proves the full binary round-trip); drop PNG. | none |

## Proposed end state
Two telephony journey cases: "message with attachment" (attach, save, reload, restore, send, open; late selection after Home ignored; invalid replacement keeps the file) and "PDF attachment downloads intact". Delete the file. Shared with `dev-messages-lifecycle` and `dev-phone-messages` in one Messages describe.
