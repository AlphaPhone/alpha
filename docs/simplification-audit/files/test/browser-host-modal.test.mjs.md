# test/browser-host-modal.test.mjs
- Lines: 23 | Kind: transplant (T2, marker slice `// host-modal:begin`/`end`) + source-text (T1) | Verdict: DELETE (+ remove the marker comments from `apps/app/src/prototype/browser-adapter.ts`, D7)
- Covers: on Android a modal host layer (`dialog:modal`, `.alpha-connection-scrim`) withdraws the native browser page. Duplicates: `test/browser-presentation-lifecycle.test.mjs:43-51` (modal guard withdraws the page via the same `update`); instrumented `BrowserDialogLifecycleInstrumentedTest`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-5 | T2, D7 | Requires `// host-modal:begin|end` markers in product code (present once in `browser-adapter.ts`). | Delete test and markers together. | none |
| 2 | 19-23 | T1 | Regex over `browser-adapter.ts`, `startup-permissions.tsx` (`panel.showModal()`), `connection-ui.tsx` (`className="alpha-connection-scrim"`). | Delete. | none |
| 3 | 9-10 | — | Regression origin: API 36 emulator, access panel under a loaded page. Only an Android run can show it. | Keep coverage in instrumented `BrowserDialogLifecycleInstrumentedTest` (or add one case there: first-run access panel over a loaded page hides the page). | medium |

## Proposed end state
Delete file and markers. Web-build behaviour (page stays in DOM under the modal) is visible in Playwright `startup-access.spec.ts`; the Android behaviour belongs to the instrumented dialog-lifecycle test. In the journey harness, the Browser bridge fake can record `present({id:null})` while the access panel is open as a `journeys/browser.spec.ts` case.
