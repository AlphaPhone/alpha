# scripts/test-mail-html.ts
- Lines: 27 | Kind: unit (one function, `prepareMailHtml`, bundled and run under jsdom) | Verdict: REWRITE as cases in `journeys/inbox.spec.ts` (delete script and `test/mail-html.test.mjs`)
- Covers: HTML email sanitising (scripts/forms/iframes/handlers removed, remote images blocked unless allowed, links made inert, CSP, 512 KiB bound). Duplicates: `test/browser/mail-images.spec.ts` already renders real HTML mail in the sandboxed iframe, checks the injected `<script>` never runs, inline links go through review, image opt-out/Show images. Callers/importers: `test/mail-html.test.mjs` via `test/fixtures/child-suite.mjs`; imports `scripts/fixtures/bundled-module.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T3/T9 | Unit test of a sanitiser behind a child-suite shim. | Feed the hostile bodies through `mail-images.spec.ts`'s `setup(page, html)` (it already accepts an arbitrary `bodyHtml`). | Low |
| 2 | 17 | T1-ish | Asserts CSP substrings of the produced document. | Drop; the journey checks behaviour (no script ran, no image request). | None |

Cases worth carrying to `journeys/inbox.spec.ts`: (a) `<svg onload>`/`<foreignObject><script>`, `javascript:` link and `data:image/svg+xml` image all absent in the frame and no handler fires; (b) `<form>`/`<input>`/nested `<iframe srcdoc>` absent; (c) body over 512 KiB shows the "too large" fallback instead of rendering; (d) plain-text URL in HTML body does not create an inline link.

## Proposed end state
File deleted. Four hostile-input cases added to the inbox journey; `scripts/fixtures/bundled-module.ts` loses one importer (still used by inbox draft scripts).
