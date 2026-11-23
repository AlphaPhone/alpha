# specs/quint/application/BrowserFilesTrash.qnt
- Lines: 174 | Kind: Quint model (live, 7 runs, explicit `invariants`, `bounds`) | Verdict: KEEP (owner question: belongs upstream)
- Covers: Files trash/restore/list/empty in the web build's `BrowserStorageVolume`: exclusive custody per request, exact trash-marker identity, retention erases only expired markers, failed writes keep the live row. Duplicates: none in this repo. Callers/importers: manifest; harness `refinement/application/browser-files-trash.mjs` (383 lines, + `.md`); run by `test/quint-browser-files-trash-refinement.test.mjs` **and** the application aggregate (index.mjs:88).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | sources | §2.9 | Three of four manifest sources are `vendor/eliza/plugins/plugin-files/src/browser/*`; the harness imports the generated `.eliza/client-features/.../storage-volume.ts` (`pathToFileURL` + `import`, harness:348). `apps/app/src/browser/files.ts` only wires `createBrowserFiles`. The model is of upstream code. | Owner question: move model + harness upstream, or select it in CI only when `upstream.lock.json` changes. Until then KEEP. | Low |
| 2 | harness | — | Harness imports the real module (good, not text-anchored). It also calls `checkClientFeatures` from `scripts/prepare-client-features.ts` before running (verification ceremony, B5). | Drop the pre-check; `upstream:prepare-client` already ran. | Low |
| 3 | wrappers | T4 | Per-model wrapper + aggregate both run it. | Keep per-model only. | None |
| 4 | 9 | — | `Modes = {"web","fallback"}` mirrors the Node lock vs same-realm fallback; both are exercised by runs. | None | — |

## Proposed end state
Model unchanged while the code lives in `vendor/eliza`. Harness keeps importing the projected upstream module; remove the client-features re-check. Run from the per-model wrapper only, and in CI only on `upstream.lock.json`/`apps/app/src/browser/files.ts` changes.
