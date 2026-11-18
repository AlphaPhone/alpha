# scripts/fixtures/cloud-delegation/index.html
- Lines: 1 | Kind: component-page fixture (HTML shell) | Verdict: MOVE (and share one shell with `hosted-live-source/index.html`)
- Covers: root element and module script for the Cloud delegation test page. Duplicates: `scripts/fixtures/hosted-live-source/index.html` (same shell, different inline CSS). Callers/importers: Vite root in `scripts/test-cloud-delegation.ts:13,17`. (research/scripts.md lists `audit-production-bundle.ts`, `prototype-capture.ts` and others as callers; those match the string `index.html`, not this file.)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | C5 | Two one-line HTML shells that differ only in CSS. | Keep one shell per page (Vite needs a root each) but move the shared CSS into one file both import, or accept the 1-line duplication. | L |

## Proposed end state
Moves with the page to `test/fixtures/component-pages/cloud-delegation/index.html`.
