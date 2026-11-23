# scripts/fixtures/hosted-live-source/index.html
- Lines: 1 | Kind: component-page fixture (HTML shell) | Verdict: MOVE
- Covers: root and module script for the hosted live-source test page. Duplicates: `scripts/fixtures/cloud-delegation/index.html`. Callers/importers: Vite root in `scripts/test-hosted-live-source-picker.ts:8`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | C5 | Same shell as the cloud-delegation page, different inline CSS. | Accept, or share one stylesheet. | L |

## Proposed end state
Moves with the page to `test/fixtures/component-pages/hosted-live-source/index.html`.
