# scripts/browser-full-reload.ts
- Lines: 35 | Kind: Vite dev-server plugin (content-hash full reload) | Verdict: KEEP + MOVE to `vite-plugins/`
- Covers: during `vite dev`, any non-CSS edit under `apps/app/src` or `.eliza/client-features` triggers one full page reload (prototype adapters patch classes at bootstrap, so HMR is unsafe), deduplicated by content hash; macOS polling. Duplicates: none. Callers/importers: `vite.config.ts`; Playwright `test/browser/dev-reload.spec.ts` (real dev-server journey); hash-input lists in `specs/quint/refinement/native/copy-receipt.mjs:102` and three `specs/quint/legacy/*/check-*-refinement.mjs` (T10, die with legacy).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, whole | D2 | The plugin exists because `install*Adapter` monkey-patching (D2) cannot be hot-replaced. | Keep until the adapter chain is replaced (stage F); then plain Vite HMR may suffice and this file can go. | - |
| 2 | 10, 18-19 | - | Startup hashes every file in `src/` and `.eliza/client-features` synchronously (sha256 of the whole tree on each dev start). Acceptable for dev; a size+mtime first pass would be cheaper. | Optional: compare `size` before hashing. | None. |
| 3 | 9 | C3 | Local sha256 helper. | `scripts/lib/hash.ts`. | None. |
| 4 | whole | D11 | Vite plugin living in `scripts/`. | Move to `vite-plugins/full-reload.ts` with `browser-pdf-assets.ts`, `local-ocr-assets.ts`; update `copy-receipt.mjs` hash list. | Low. |

## Proposed end state
Unchanged behaviour, ~30 lines in `vite-plugins/`, using the shared hash helper. Coverage: `test/browser/dev-reload.spec.ts`
(keep as part of a `journeys/dev-tooling` or leave as its own dev-server spec).
