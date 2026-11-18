# test/quint-browser-album-storage.test.mjs
- Lines: 14 | Kind: Quint replay wrapper (model `BrowserAlbumStorage`, driver `specs/quint/refinement/application/browser-album-storage.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: browser album commits and rendered membership match the media-revision model. Product code: `apps/app/src/browser/documents.ts`, `preference-documents.ts`, `prototype/browser-camera.ts`; model live (in `specs/quint/application/manifest.json`). Duplicates: the same campaign runs again in `runApplicationRefinement()` (`specs/quint/refinement/application/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `browser-album-storage.mjs`; the campaign also runs in the application aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===4`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/application/browser-album-storage.mjs`): esbuild-bundles the real browser modules (good tie). | No change needed for the tie. | Low |
| 4 | 12-14 | T3 | `checkBrowserAlbumWithoutLocks` is a non-model scenario (no Web Locks: media writes refused, photo-only kept) that is not in the aggregate. | Keep as a named trace inside the driver so the runner covers it. | Low |
| 5 | 6 | T8 | 420 s budget for 4 traces. | Measure; runner budget from manifest. | Low |

## Proposed end state
File deleted. `BrowserAlbumStorage` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
