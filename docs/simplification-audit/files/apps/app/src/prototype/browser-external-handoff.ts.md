# apps/app/src/prototype/browser-external-handoff.ts
- Lines: 55 | Role: "Open in another browser" for the current Browser tab, with a confirm step for private tabs and a same-page check before handing off. | Verdict: SIMPLIFY (small)
- Importers: 1 — `apps/app/src/prototype/browser-adapter.ts:16,301-306`.
- Text/path pins: `test/browser/browser-external-handoff.spec.ts:16` (T6: `import('/src/prototype/browser-external-handoff.ts')` in page and drives `createExternalBrowserHandoff` with fakes); `test/fixtures/browser-external-handoff.mjs:8` + `test/browser-external-handoff-refinement.test.mjs` and `specs/quint/refinement/application/browser-external-handoff.mjs` (Quint refinement; reads the source path); `specs/quint/application/manifest.json:3669`; `test/support/feature-parity.mjs:344`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 16, 25, 30 / browser-adapter 301-306 | D3/D7 | `flags` is a getter/setter object (`get sharing(){return sharing;}, set sharing(v){sharing=v;}` …) that exposes four closure variables of browser-adapter so this function could be extracted and tested alone. | Pass one mutable `BrowserPresentationState` object that browser-adapter also uses for `sharing/confirming/lastGeometry` (no accessor shims). | Low. |
| 2 | 5, 25, 30 | A7/B4 | `flags.disposed` is always false (browser-adapter's disposer is never called; see browser-adapter report #1). | Drop `disposed` from the interface and both checks. | None. |
| 3 | 5, 7 | A7 | `export interface ExternalHandoffFlags` / `ExternalHandoffDeps` have no importer (git grep: only this file). | Unexport. | None. |
| 4 | 10, 12 | C1 | `shell: () => any`, `state: () => Record<string, any> \| undefined`. | `ShellHost` and a `BrowserViewState` type shared with browser-adapter. | None. |
| 5 | 43, 52 | B4 | `flags.confirming = false` is set after the review and again in `finally`. | Keep only the `finally`. | None. |
| 6 | 28-34 | C3 | Same-page staleness check duplicates the browser-adapter closures (screen/view/tab/hidden). | Use the shared `pageStillShown` factory proposed for browser-adapter. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ExternalHandoffFlags` | interface | 5 | browser-adapter closure vars | shared `BrowserPresentationState` in the browser view folder |
| `ExternalHandoffDeps` | interface | 7-17 | none | keep, unexported |
| `checkCurrentPage` | helper | 28-34 | 6 closures in browser-adapter | shared `pageStillShown` |

## Proposed end state
Same file (it is a Quint-modelled unit), ≈48 lines: no accessor shim, no `disposed`, unexported interfaces, typed shell/state. Lives in the browser view folder after the browser-adapter split.

## Verification
`test/browser/browser-external-handoff.spec.ts` and `.production.spec.ts` (merge candidates per tests-browser), `test/browser-external-handoff-refinement.test.mjs` / Quint `browser-external-handoff` replay, `npm run verify`; Android emulator check of private-tab confirm and handoff (native `openExternalBrowser`).
