# test/mail-html.test.mjs
- Lines: 5 | Kind: wrapper (T9) around `scripts/test-mail-html.ts` (27 lines, bundles `runtime/mail-html.ts` via `scripts/fixtures/bundled-module.ts` under JSDOM) | Verdict: MERGE into `test/integration/inbox.test.mjs`
- Covers: HTML email is sanitised (scripts/forms/frames removed, inert links, CSP, remote images blocked unless chosen, 512 KiB bound). Duplicates: `test/browser/mail-images.spec.ts` (image mode, inline links, fallback URLs in the real view). Callers/importers: `npm test` glob; `scripts/test-mail-html.ts` has no other caller.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-5 | T9 | Test spawns a script that is the real test (`runChildSuite`). | Move the assertions into the test file; delete `scripts/test-mail-html.ts`. | None |
| 2 | script 11 | T9 / D13 | Bundles the module with esbuild instead of importing it; Node with JSDOM globals can import `mail-html.ts` directly (as `mail-preview.test.mjs` does). | Import directly. | Low |
| 3 | script 15-22 | - | Hostile-HTML cases (svg onload, `javascript:` link, data-svg image, size bound) are not in any browser spec. | Carry: blocked default, explicit image mode, hostile svg/script/javascript link stripped, oversize refused. | Low |

## Proposed end state
Four cases in `test/integration/inbox.test.mjs` call `prepareMailHtml` against JSDOM. The wrapper and `scripts/test-mail-html.ts` are deleted.
