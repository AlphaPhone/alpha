# test/browser/share-panel.spec.ts
- Lines: 20 | Kind: Playwright component test (`chromium`): it mounts `/src/runtime/share-panel.ts` on a synthetic same-origin fixture page served by `page.route`, with injected callbacks (T6); it uses `node:assert` alongside `expect`; 1 test | Verdict: **REWRITE** as a share step in `journeys/notes.spec.ts` (Share a note), with one Maps or Browser share smoke if needed
- Covers: the common Share panel is a modal with a focus trap. Close calls nothing, Email and Share each call only their own action, and a cancelled external share shows no alert. It retires when the source is no longer current or on Home. Its font follows the OS theme font. Duplicates: none for the panel itself. It is used by `prototype/notes-share-adapter.ts`, `prototype/share-panel-adapter.ts` and `maps/share.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T6 | The panel runs on a fake page with injected callbacks, so no product caller (note, Maps place, browser page) is exercised. | Open a note → Share, and assert the dialog, the focus trap, Email opening the mail draft, and Close giving no draft. The external share is cancelled through the share plugin fake. | Low |
| 2 | 10-11, 19 | – | The font-inheritance assertions test CSS cascade on a synthetic `.os` class. | Delete (styling detail). | none |
| 3 | 16 | T8 | `waitForTimeout(30)` before asserting no alert. | `expect(alert).toHaveCount(0)` after the share-cancel promise settles. | none |
| 4 | 2, 12-19 | – | It mixes `node:assert` with Playwright `expect`. | Use `expect` only. | none |
| 5 | 17 | – | Retirement when the source stops being current (`current:()=>false`) has no UI trigger. | In the journey, delete the note while Share is open (if the UI allows) or drop the case. | Low |

## Proposed end state
A "share a note" step in the Notes journey: Share opens a modal and Tab stays inside it. Close gives no side effect.
Email opens the reviewed draft. A cancelled system share gives no alert. Home closes the panel.
