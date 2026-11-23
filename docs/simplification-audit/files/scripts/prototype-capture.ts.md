# scripts/prototype-capture.ts
- Lines: 184 | Kind: manual tool (Playwright screenshot matrix) | Verdict: DELETE
- Covers: screenshots 68 prototype states in two themes against an external reference URL and optionally a local dev/test-mocks server, writing a manifest and an HTML gallery. Duplicates: `scripts/compare-prototype.py` (same purpose, also unreferenced). Callers/importers: none (grep of package.json, workflows, scripts, tests, docs, README: only itself).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | No caller. | Delete (with `compare-prototype.py`). | none |
| 2 | 63 | A3 | Captures six Wallet states (D2 deletes Wallet). | — | — |
| 3 | 79, 94 | — | Default source is an external prototype site (`alpha-phone-prototype.pages.dev`) and `artifacts/design-reference/index.html`; design HTML is reference data, not a test. | — | — |
| 4 | 113, 165 | T6 | Uses `?fixture=1` run mode and `window.__phone.S()` backdoor; both are flag-zoo surfaces (D5) the cleanup removes. | — | — |
| 5 | 67 | B5 | Exact-count assertion "sixty app fixture states". | — | — |

## Proposed end state
Deleted. Visual comparison, if still wanted, is a Playwright journey with `toHaveScreenshot` under `test/browser/journeys/`.
