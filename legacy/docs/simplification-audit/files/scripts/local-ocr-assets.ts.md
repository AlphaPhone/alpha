# scripts/local-ocr-assets.ts
- Lines: 31 | Kind: Vite plugin (serves/emits Tesseract worker, WASM cores, English traineddata and their licences) | Verdict: KEEP + MOVE (to a `vite-plugins/` folder with `browser-pdf-assets.ts`, `browser-full-reload.ts`)
- Covers: OCR runs fully offline: assets come from local packages, never a CDN. Duplicates: same "serve in dev, emitFile in build" shape as `scripts/browser-pdf-assets.ts` (C5 candidate: one `localAssets(name, files)` plugin factory). Callers/importers: `vite.config.ts:3`; path-only references in Quint harnesses `specs/quint/refinement/application/canonical-calendar-draft-handoff.mjs:14` and `specs/quint/refinement/legacy/camera-session.mjs:15` (input file lists, T10/P6).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-31 | C5 | Same dev-middleware + `generateBundle` emit pattern as `browser-pdf-assets.ts`. | One shared `localAssetPlugin({prefix, files})`; this file becomes the file table. | Low. |
| 2 | whole | D11/D6 | A Vite plugin living in `scripts/`. | Move to `vite-plugins/`; update `vite.config.ts` and the two Quint harness path lists. | Low (path pins in two harnesses; `legacy/` one retires with P6). |
| 3 | 11-12 | B4 | `if(files.size)return;` lazy init guard is fine (called from both hooks). | none | n/a |

## Proposed end state
A file table (worker, three LSTM cores, traineddata, four licence files) passed to a shared local-asset Vite plugin in
`vite-plugins/`. Production bundle audit already verifies no CDN fallback; no separate test needed.
