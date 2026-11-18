# specs/quint/refinement/application/portable.mjs
- Lines: 180 | Kind: six import-based Quint refinement adapters (bundled via `support.mjs` `sourceModule`; one runs the real `delegation-return.html` script in JSDOM) | Verdict: KEEP; SPLIT/rename when the aggregate runner is replaced (the name "portable" says nothing)
- Covers: `StartupPermissions` (startup-permission-flow.ts persistent vs volatile attempt marker), `CallbackLanding` (OAuth delegation return page parse/scrub/link, 40 query cases), `PreferencesAndPresentation` (canvas-geometry layout + keyboard height), `BrowserSession` (upstream browsing-session snapshot/restore of normal vs private tabs), `PermanentVoiceDeletion` (complete 240-row planner table + lease helpers), `DraftDispatch` (assistant draft controller commit/release/write failure). Duplicates: `test/quint-conformance.test.mjs:30-63` re-checks CallbackLanding with a strict subset of these cases (delete-candidates B335). Callers/importers: **only** `index.mjs:11` (adapter list l.115-118) — no per-model test file runs these six.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4/P1 | These six models are only exercised through the application aggregate (`test/quint-application-refinement.test.mjs`, ~18 min). If that aggregate is deleted (ci-and-formal §2.4 recommendation) without a replacement, six live models lose their refinement run (D11 violation). | When the aggregate goes, register these in the per-model/manifest-driven runner. | High if missed |
| 2 | 110-129, 131-149, 151-180 | P6/T5 | `BrowserSession`, `PermanentVoiceDeletion` and `DraftDispatch` execute only upstream code: `browsing-session.ts` is in `.eliza/…/plugin-native-browser-surface`, `permanent-voice-deletion.ts` re-exports `planInterruptedPermanentDeletion`… from `.eliza/…/plugin-notes`, `assistant-draft-controller.ts` is a one-line re-export of upstream `DurableDraftController` (D4 shim). | Owner question: keep as acceptance of the pinned upstream, or move the models upstream (D14 follow-up). Until decided, KEEP; import the upstream path directly, not via the Alpha shim. | Low |
| 3 | 5 | B5 | `captureSources([...portable.mjs])` runs at module import time (side effect on `import`), and `checkTraces` wrapper (6-7) adds `portable.mjs` + `support.mjs` again. | Capture inside each check, once. | None |
| 4 | 43-79 | T4 | CallbackLanding is the better of two copies (40 cases, executes the real page script). | Keep here; delete the block in `test/quint-conformance.test.mjs`. | Low |
| 5 | 147 | — | Typo "All240 combinations". | "All 240". | None |
| 6 | 141-144 | T3 | Three ad hoc asserts on lease helpers outside any trace. | Keep (tiny, executes real helpers) or make them a trace step. | None |

## Proposed end state
- Split into `startup-permissions.mjs`, `callback-landing.mjs`, `preferences.mjs`, and an `upstream-helpers.mjs` (BrowserSession, PermanentVoiceDeletion, DraftDispatch) — or keep one file named `small-adapters.mjs`; each exported check registered in the per-model runner.
- No import-time side effects; one source capture per check.
- `quint-conformance.test.mjs` CallbackLanding block deleted.
