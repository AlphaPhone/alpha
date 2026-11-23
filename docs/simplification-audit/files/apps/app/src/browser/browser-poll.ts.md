# apps/app/src/browser/browser-poll.ts
- Lines: 86 | Role: pure decisions for the Browser adapter's 100 ms poll (`surfacePollIdle`) plus an unused session saver with retry back-off. | Verdict: SIMPLIFY
- Importers: 1 (`prototype/browser-adapter.ts`, imports `surfacePollIdle` only). Text/path pins: `LemmaScript-files.txt:1`, `specs/lemma/README.md:159-160` (rows for `surfaceIdleForView`, `retryDelayForCount`), `specs/quint/application/manifest.json:5145-5150,5750,5786` (symbol `surfacePollIdle`), `specs/quint/refinement/application/browser-surface-presentation.mjs`, `specs/quint/refinement/application/browser-tab-lifecycle.mjs`, `test/browser-session-persistence.test.mjs:64,150,210-211`, `test/browser-presentation-lifecycle.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-86 | A7 / D7 | `SAVE_RETRY_MIN_MS`, `saveRetryDelay`, `retryDelayForCount`, `SessionSaver`, `createSessionSaver` — no caller under `apps/` (`git grep -w createSessionSaver -- apps`: definition only; `saveRetryDelay`/`retryDelayForCount` used only by the saver). Users: `test/browser-session-persistence.test.mjs`, `specs/quint/refinement/application/browser-tab-lifecycle.mjs`, LemmaScript proof of `retryDelayForCount`. The product does not use the saver that is proved and model-checked. | Delete lines 15-86, the saver half of `test/browser-session-persistence.test.mjs`, the saver use in `browser-tab-lifecycle.mjs`, and the `retryDelayForCount` row in `specs/lemma/README.md`. (Alternative, owner call: wire it into `browser-adapter.ts`.) | Medium (formal-model edits) |
| 2 | 1-2 | A8 | Header comment advertises "a small saver with injected effects". | Update to describe only the poll predicate. | None |
| 3 | 5-13 | — | `surfacePollIdle` wraps `surfaceIdleForView` only to narrow `unknown` to `string` for LemmaScript. Pinned by manifest and LemmaScript. | Keep both. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `retryDelayForCount` back-off | helper | 22-32 | Other back-off/retry loops in `runtime/` (C3 retry policy) | delete with the saver |

## Proposed end state
~13 lines: `surfacePollIdle` and the LemmaScript-verified `surfaceIdleForView` only.

## Verification
`npm run verify` LemmaScript lane (`LemmaScript-files.txt`), Quint `browser-surface-presentation` and `browser-tab-lifecycle` refinements, `test/browser-presentation-lifecycle.test.mjs`, Browser journeys.
