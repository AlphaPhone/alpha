# test/browser/workflow-retirement.spec.ts
- Lines: 17 | Kind: Playwright spec, chromium, 1 test; page lifecycle with patched `Storage.prototype.getItem` | Verdict: DELETE
- Covers: if `localStorage.getItem('alpha.browser.device.v1')` throws during `pagehide`/hidden `visibilitychange`, no page error is raised and the dev Device controls button is still there after `pageshow`. Despite the name, nothing about workflows is checked. Duplicates: page lifecycle (hide/show, reload) is driven by `accessibility-lifecycle.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-14 | T6 | Fakes `document.hidden` and patches `Storage.prototype.getItem`; no user action. | Delete. | Low: a revoked-storage throw on departure loses coverage; browsers do not revoke storage this way in normal use. |
| 2 | 3 | D11 | Title says "workflow retirement"; the test is about the dev device store. | Goes with the file. | None. |
| 3 | 5 | D5 | Depends on `?tools=1` dev controls. | Goes with the file. | None. |

## Proposed end state
File deleted.
