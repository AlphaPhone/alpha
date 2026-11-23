# specs/quint/application/BrowserAlbumStorage.qnt
- Lines: 101 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP
- Covers: Web Photos albums: album edits are revision-checked, an add holding a media item commits before a queued trash, a stale media revision refuses the add, a rename invalidates the old album revision. Models: `prototype/browser-camera.ts`, `prototype/camera-adapter.ts`, `browser/documents.ts`, `browser/domain-document.ts`, `browser/preference-documents.ts`, upstream `browser-document-store.ts` (exist). Duplicates: Playwright `album-storage` specs import `browser-camera.ts` in-page (T6, slated for journeys). Callers/importers: manifest (4 tests, no symbols); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; harness `refinement/application/browser-album-storage.mjs` (esbuild bundles the real modules via a synthetic entry, runs them in Chromium against real IndexedDB) via `test/quint-browser-album-storage.test.mjs` and `refinement/application/index.mjs` aggregate (run by `test/quint-application-refinement.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — | Import-based integration replay with real IndexedDB: the target shape for harnesses. | Keep; run once. | — |
| 2 | harness 9 | C5 | Reuses `photos-window.mjs` fixture; fine. | Keep. | — |
| 3 | product | D11 | `browser-camera.ts` is proposed to SPLIT + MOVE to `browser/`; the harness entry imports it by path. | Update the import path in the same commit as the move. | Low |

## Proposed end state
Unchanged model and harness, run from one runner.
