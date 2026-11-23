# test/browser-session-persistence.test.mjs
- Lines: 307 | Kind: transplant (T2; four text slices of `prototype/browser-adapter.ts` run in `vm`) + unit (T3; `createSessionSaver`/`saveRetryDelay`/`surfacePollIdle` from `browser/browser-poll.ts`) + source-text (T1, lines 222-231) + one real-module test (`content-question.ts` bundled with esbuild into jsdom, lines 251-286) | Verdict: DELETE; carry cases to `test/browser/journeys/browser.spec.ts`
- Covers: tabs/history persistence (snapshot reuse on idle ticks, bounded retry 2 s..60 s, Clear waits for in-flight save and retires queued snapshots, late restore merges without exceeding the cap, a launch read resolving after Clear cannot resurrect history); question-review dialog failure restores the page and leaves no Back handler. Duplicates: `specs/quint/refinement/application/browser-session-persistence.mjs` (slices `'  function forgetTabs(ids'`..`'  async function clearSiteData() {'`, the same region as line 70 here) and `test/quint-browser-session-persistence.test.mjs`; `browser-tab-lifecycle.mjs` harness; Lemma proof of `retryDelayForCount`/`surfaceIdleForView` (`LemmaScript-files.txt:1`); `browser-presentation-lifecycle.test.mjs:69-76` (idle poll). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-19, 70, 223, 234 | T2, T10 | Anchors `'  // Saving waits'` (a comment), `'  const tabOf ='`, `'  function savedSnapshot()'`, `'  async function restoreSession()'`, `'  async function clearBrowsingData()'`, `'  async function clearSiteData('`, `'  async function askPage()'`, `'  function hide()'`. Two overlapping harnesses (`fixture` and `sessionHarness`) over the same code. | Delete. | none |
| 2 | 61-64, 148-212 | A7, D20 | `createSessionSaver` and `saveRetryDelay` have no production importer (grep: only `browser-poll.ts`, this test, the Quint tab-lifecycle harness context and the manifest). The comment at 61-62 admits production uses a different writer. DECISIONS D20 deletes `createSessionSaver` with its proof/model. | Delete these tests with the function. Keep `surfacePollIdle` (used at `browser-adapter.ts:636`, Lemma-proved). | none |
| 3 | 222-231 | T1 | `indexOf` ordering of statements in `update` and a regex on `hiddenGeometry`. | Delete. | none |
| 4 | 251-286 | — | Real module (`content-question.ts`) in jsdom with a stubbed `local-ocr`: closest to an integration test here. Global `window`/`document` replacement (T8 risk in a shared process). | Move to Playwright: make `showModal` throw via `page.addInitScript`, assert no dialog and Back is not captured. | low |
| 5 | 32-59 | T8 | Fake `Date.now` + microtask settling; tests timing policy, not user outcome. | Journey asserts outcome (one error notice, later save succeeds). | low |

## Proposed end state
Delete; formal coverage stays in the session-persistence Quint replay (PORT it off text slices) and Lemma. `journeys/browser.spec.ts` (bridge fake for `browsingState`/`saveBrowsingState`/`clearBrowsingData`) carries:
1. tabs and history survive reload; an untouched new tab is replaced by the restored tabs, an in-use one is kept and restored tabs are appended up to 8;
2. a failing save shows "Tabs and history could not be saved..." once and a later change is saved;
3. Clear browsing data during a slow launch read leaves no old tabs or history after reload;
4. Ask about page with a dialog that cannot open shows the error and the page stays shown.
