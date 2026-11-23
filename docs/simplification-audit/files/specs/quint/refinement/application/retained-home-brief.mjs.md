# specs/quint/refinement/application/retained-home-brief.mjs
- Lines: 133 | Kind: Quint refinement harness, import-based (`bundledSource('apps/app/src/runtime/hosted-digests.ts')`, EventTarget `window`) | Verdict: KEEP
- Covers: retained Home brief — owner-scope binding, latest executed result by completion time then cursor, non-run statuses excluded, private step text excluded, summary/agent label clipping, publication only on change, throwing/removed observers still get copied delivery (live model `RetainedHomeBrief.qnt`, manifest ~l.3230). Duplicates: none found at store level; Home rendering of the brief is separate. Callers/importers: `index.mjs:90`, `test/quint-retained-home-brief.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35-37, 91-93 | B4 | Swaps `globalThis.window` for an EventTarget and restores it; same pattern in `recovery-ui.mjs`. | Shared `withGlobal('window', value, fn)` in `support.mjs`. | Low |
| 2 | 98, 127 | B5 | Double source capture. | One capture. | None |
| 3 | 11-15 | — | Agent label and summary clipping lengths (199+…, 1999+…) pinned via expected strings: behavioural, fine. | Keep. | — |

## Proposed end state
Unchanged harness with shared global-swap helper and one capture.
