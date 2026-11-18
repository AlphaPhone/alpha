# specs/quint/refinement/services/maps-guidance-voice.mjs
- Lines: 115 | Kind: Quint model-trace replay (bundles the real `apps/app/src/maps/navigation-voice.ts`) | Verdict: KEEP, SIMPLIFY (shared loader)
- Covers: `MapsGuidanceVoice.qnt` — the navigation voice's enable/pause/toggle, newest vs. owed instruction, resume after visibility change or settling speech, failures, and context-epoch staleness. Duplicates: run twice (`test/quint-maps-guidance-voice.test.mjs` and `forward-replays.mjs`). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-31 | T10 (specifier) | Stubs keyed on `'../runtime/voice-selection'`, `'../runtime/local-voice'`, `'../runtime/app-speech'`, `'../runtime/connection-ui'`, `'../build-flags'`. Import-based, but a renamed specifier silently loads the real module. | Shared `sourceModule` that fails on an unused stub key. | low |
| 2 | 32-40 | C5 | Own esbuild + `data:` import. | Shared `sourceModule`. | none |
| 3 | 44-48 | B4 | Installs a fake `document` with wrapped add/removeEventListener to observe whether `voice.resume` is registered. Reasonable observation seam; restores `globalThis.document` on close. | Keep. | none |
| 4 | 96, 106-109 | — | Reads private-ish fields (`voice.latest`, `owed`, `current`, `spoken`, `resume`). Ties the replay to field names of `NavigationVoice`. | Keep; if fields are renamed in the structural pass, rename here too (they are code, not text). | low |

## Proposed end state
~100 lines using the shared loader and ITF library, one wrapper test. Model stays live (`navigation-voice.ts` is product code).
