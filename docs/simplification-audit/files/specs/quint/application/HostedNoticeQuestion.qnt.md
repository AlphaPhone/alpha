# specs/quint/application/HostedNoticeQuestion.qnt
- Lines: 88 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP
- Covers: retained Android result question review: a recheck precedes one consumption, interrupted reviews never compose, resolver taps do not overlap (`apps/app/src/runtime/hosted-notice-question.ts`, `browser/content-question.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `hosted-notice-question.mjs` via `test/quint-hosted-notice-question.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 30-39 | — | Bundles the real module with esbuild and imports it as ESM in JSDOM: already the target pattern. | None. | none |
| 2 | manifest | T10 | Sources include `context-selection.ts`, `hosted-digests.ts` and two upstream files the harness bundles transitively. | Fine as file pins. | none |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Unchanged; one runner.
