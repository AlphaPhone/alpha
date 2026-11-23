# test/browser/mail-preview.spec.ts
- Lines: 23 | Kind: Playwright, `chromium`, 3 tests; Gmail client faked by in-page `getCloudClient` override (T6) | Verdict: MERGE into `journeys/inbox.spec.ts`
- Covers: entity-encoded Gmail snippets and draft previews are decoded to plain text and never rendered as markup (no request for an embedded `<img>`), while a local draft's typed text stays literal. Duplicates: none. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-10 | T6, C3 | Sixth copy of the Gmail override. | Shared `fakeGmailProvider` with snippet/draft fixtures. | Low. |
| 2 | 11-23 | - | Decoding without markup is an injection guard and only tested here. | Carry as one step (list row, Gmail draft row, local draft row). | Low. |

## Proposed end state
File deleted. One step in the inbox list test: encoded snippet and draft preview read as text, no markup request, local draft literal.
