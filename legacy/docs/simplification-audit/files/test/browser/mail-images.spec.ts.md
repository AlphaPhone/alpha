# test/browser/mail-images.spec.ts
- Lines: 79 | Kind: Playwright, `chromium`, 5 tests; Gmail client faked by in-page override of `connectionController.getCloudClient/getSnapshot`, device preference read/written by importing `/src/browser/device-preferences.ts` (T6) | Verdict: MERGE into `journeys/inbox.spec.ts` (reading section)
- Covers: HTML email loads remote images by default inside a sandboxed frame with no script, inline links ask before opening, the "Load images in email" opt-out persists across reload and offers Show images per message (not carried to the next message in a thread), and fallback link lists drop only URLs already shown as anchors. Duplicates: none for images; link fallback partly in `gmail-mvp-scope.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-12 | T6, C3 | Gmail override copied (fifth copy); setup re-run after reload. | Shared `fakeGmailProvider` (with `bodyHtml`, `extraUrls`, thread paging options). | Low. |
| 2 | 31, 43 | T6 | Preference read and set via `device-preferences.ts` import. | Set through the Settings switch (already used in test 1) and assert through behaviour (Show images offered). | Low. |
| 3 | 15-32 | - | Default load, sandbox attribute, no script execution, link confirm, opt-out persistence: security-relevant and only here. | Carry. | - |
| 4 | 37-61 | - | Per-message Show images in a paged thread. | Carry as a step. | - |
| 5 | 33-35, 63-79 | T4 | Three small link-fallback tests with one setup each. | One step: plain text shows link controls; HTML with unlinked URL and with anchors shows only the missing ones. | Low. |

## Proposed end state
File deleted. `journeys/inbox.spec.ts` "reading HTML mail" test: images load in a sandbox, inline link asks first, opt-out persists and Show images is per message, link fallback lists only unrepresented URLs.
