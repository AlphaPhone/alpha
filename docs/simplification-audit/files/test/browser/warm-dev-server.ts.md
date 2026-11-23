# test/browser/warm-dev-server.ts
- Lines: 27 | Kind: Playwright global setup (not a test) | Verdict: KEEP, MOVE to `test/browser/harness/global-setup.ts`
- Covers: loads `/`, `/?mode=dev` and `/?mode=mock&start=home` once before workers start so the Vite dev server has transformed the module graph. Duplicates: none. Callers/importers: `playwright.config.ts:55` (`globalSetup: needsDevelopment ? './test/browser/warm-dev-server.ts' : undefined`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | – | D11 | A config file sits among the specs (research tests-browser.md). | Move to `harness/global-setup.ts`; update `playwright.config.ts:55`. | None. |
| 2 | 16 | C6 | Inline copy of the offline connection seed (`alpha.connection.selection.v1`), one of 339. | Import the seed from `harness/app.ts`. | None. |
| 3 | 18 | D5 | Warms `?mode=mock&start=home`; if the run-mode explosion is reduced (D5) the list shrinks with it. | Keep the list in sync with surviving modes. | None. |
| 4 | 22-24 | B1 | Catch-and-warn. | Keep: the comment states it is the specified behaviour (warm-up must not fail the run). | None. |
| 5 | 19-20 | T8 | 240 s timeouts per load. | Acceptable for a one-off cold transform; keep. | None. |

## Proposed end state
`test/browser/harness/global-setup.ts`, same body, importing the connection seed from the harness. The comment stays
(it explains why the file exists).
