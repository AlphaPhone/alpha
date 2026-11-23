# scripts/compare-prototype.py
- Lines: 35 | Kind: script (pixel-diff of prototype screenshots, numpy + Pillow) | Verdict: DELETE
- Covers: compares `reference` vs `local` captures from a manifest and writes heatmaps/contact sheets. Callers: none (`grep -r compare-prototype` finds nothing outside the file). Its intended producer `scripts/prototype-capture.ts` writes `test-results/prototype-captures` while this reads `test-results/prototype-all` by default, so the pair no longer even line up. numpy/Pillow are not project dependencies.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 / C7 | Orphan Python tool beside TypeScript tooling, undeclared deps. | Delete. Also review `scripts/prototype-capture.ts` (other chunk) for the same fate. | Low |

## Proposed end state
File removed. Visual regressions, if wanted, belong in Playwright `toHaveScreenshot` journeys.
