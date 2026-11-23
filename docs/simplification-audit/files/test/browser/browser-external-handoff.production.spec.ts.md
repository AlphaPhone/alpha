# test/browser/browser-external-handoff.production.spec.ts
- Lines: 84 | Kind: Playwright spec, production project (flag-off bundle with an `AlphaBrowser` stub added in-file), 2 tests, UI-driven | Verdict: MERGE into `journeys/browser.spec.ts` (production)
- Covers: "Open externally" from the Browser menu hands a normal page off at once with `privateConfirmed:false`; a private page requires the "Leave private browsing?" review, Cancel sends nothing, approval sends `privateConfirmed:true`. Duplicates: `browser-external-handoff.spec.ts` (same handoff on a factory harness). Callers/importers: none; imports `flag-off-android.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-32 | C5/P6 | In-file `AlphaBrowser` stub; `browser-paste-fallback.production` and `browser-profile-unsupported.production` each add another one. | One `harness/plugins/browser.ts` (commit-on-navigate, recorders for handoff/reviewQuestion/create failure). | Low. |
| 2 | 3-8 | A8 | Evidence-boundary paragraph. | One line. | None. |

Cases to add from the dev twin: a duplicate tap on "Choose browser" sends once; a page that changes during the private review never leaves; an unavailable handoff shows the refusal and restores the page.

## Proposed end state
Becomes the "external handoff" part of `journeys/browser.spec.ts` on the production project, with the shared browser plugin stub and the three extra cases above.
