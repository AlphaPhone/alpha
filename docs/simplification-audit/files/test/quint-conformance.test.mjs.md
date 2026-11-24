# test/quint-conformance.test.mjs
- Lines: 201 | Kind: integration-style Quint conformance (Quint CLI emits one ITF trace per scenario; real modules loaded by an esbuild bundle → `data:` import; one case runs `public/delegation-return.html` in JSDOM) | Verdict: MERGE into `test/quint-refinement.test.mjs` (move to `specs/quint/refinement/application/conformance.mjs`), drop 3 cases
- Covers: nine model/source agreements: delegation return page (CallbackLanding), permission denial/failed-storage restart (StartupPermissions), private browsing restore (BrowserSession), large-text layout (PreferencesAndPresentation), durable draft conflict (AssistantConversation), 240-row voice-deletion recovery table (PermanentVoiceDeletion), held draft restart/release (DraftDispatch). Duplicates: `scripts/test-cloud-delegation-return.ts` also drives `delegation-return.html` (cross-file-actions §pins); large-text `surfaceLayout`/`keyboardFreeHeight` are replayed by `quint-keyboard-geometry` and `quint-keyboard-detectors`; `AssistantDraftController` is also exercised by `quint-composer-send`. Callers/importers: `npm test` glob and `package.json` script `quint:conformance` (line 69), which must be updated.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-30 | C3 | Private `sourceModule` (esbuild → base64 import) and `modelTrace` (Quint CLI → ITF) duplicate `bundledSource` in `refinement/application/support.mjs` and `modelTraces` in `shell-model-traces.mjs`. | Use the shared helpers when moving the file. | Low |
| 2 | 99-108 | T5 | BrowserSession case loads `vendor/eliza/plugins/plugin-native-browser-surface/src/browsing-session.ts`: upstream code. | Delete the case; upstream follow-up (D14). | Low |
| 3 | 119-127 | T5 | Draft-conflict case loads `upstream renderer: state/durable-draft.ts` (generated upstream). | Delete the case; upstream follow-up. | Low |
| 4 | 110-117 | T4 | Large-text case calls two pure functions with literal inputs (`height(412,915,false)`); covered by the KeyboardGeometry/KeyboardDetectors replays. | Delete the case. | None |
| 5 | 32-62 | T4 | Delegation return page and `scripts/test-cloud-delegation-return.ts` test the same page. | Keep this case (it is model-driven), delete the script's duplicate assertions. Q-HOST-5 decides whether the delegation panel stays at all. | Low |
| 6 | 129-143 | — | Exhaustive 240-row decision table checked against the real planner: the strongest case in the file. | Keep. | None |
| 7 | 145-201 | — | Two draft-dispatch cases drive the real `AssistantDraftController` with an in-memory store; behavioural and cheap. | Keep. Replace the `for (tick < 10)` poll (line 198) with awaiting the store write. | Low (T8) |
| 8 | all | P1 | Spawns the Quint CLI 10 times (30 s cap each) inside `npm test`. | Generate traces once per model in the runner. | Low |

## Proposed end state
Becomes `specs/quint/refinement/application/conformance.mjs` registered in the application index, with six cases (delegation return, two permission restarts, voice-deletion table, two draft-dispatch cases), shared trace/bundle helpers and no private copies. The upstream cases move to `vendor/eliza` follow-ups.
