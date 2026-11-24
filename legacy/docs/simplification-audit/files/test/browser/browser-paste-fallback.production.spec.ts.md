# test/browser/browser-paste-fallback.production.spec.ts
- Lines: 112 | Kind: Playwright spec, production project with in-file `AlphaBrowser` stub, 2 tests (loops of cases), UI-driven | Verdict: MERGE into `journeys/browser.spec.ts` (reading section, production)
- Covers: Ask about page on an unreadable page (isolated world unavailable, empty or invalid excerpt) opens the review with an empty excerpt and Continue disabled until text is pasted; sensitive pages or credential-like excerpts open no review and show a toast. Duplicates: reading-sensitive specs (other chunks) for the refusal copy. Callers/importers: none; imports `flag-off-android.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-43 | C5/P6 | Third in-file `AlphaBrowser` stub in this chunk. | Shared `harness/plugins/browser.ts`. | Low. |
| 2 | 66-67 | T4 | Two "isolated world unavailable" cases differ only by the presence of `code`. Both are real native shapes; keep. | Keep. | None. |
| 3 | 3-10 | A8 | Long evidence-boundary header. | One line. | None. |

## Proposed end state
Both tests move verbatim (minus the stub) into the reading section of `journeys/browser.spec.ts`.
