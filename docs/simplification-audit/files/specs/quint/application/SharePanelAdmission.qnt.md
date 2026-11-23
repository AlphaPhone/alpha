# specs/quint/application/SharePanelAdmission.qnt
- Lines: 74 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP / PORT (light)
- Covers: Common destination chooser: a replacement retires earlier buttons, a changed selection is retired without fallback, hidden or cancelled panels never dispatch, an exact destination failure never falls back. Duplicates: FilesAndSharing (application) at the review level. Callers/importers: `share-panel-admission.mjs` (aggregate) <- `test/quint-share-panel-admission.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T2 (light) | `share-panel-admission.mjs:21` uses `sourceContext(['apps/app/src/runtime/share-panel.ts'])`: whole-file type strip, imports deleted by regex, run in `vm`. No marker slicing, but import stripping breaks as soon as the file imports anything it uses. | Use `bundledSource` (same `support.mjs`) instead of `sourceContext`. | L |
| 2 | manifest | - | B222 deletes the unread `emailUnavailable` option; model unaffected. | None. | - |

## Proposed end state
- Keep; harness switches to the bundled import (one-line change).
