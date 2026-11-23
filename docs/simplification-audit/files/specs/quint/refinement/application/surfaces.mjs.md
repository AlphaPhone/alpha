# specs/quint/refinement/application/surfaces.mjs
- Lines: 136 | Kind: four Quint refinement adapters in one file — two `model.js` text slices, one transplant of `build-flags.ts`/`dev-profile.ts` with string rewriting, one real bundled import | Verdict: SPLIT: `shellNavigation` DELETE, `developmentSurfaces` PORT, `developmentDevice` PORT (or DELETE with simulator), `filesTree` KEEP
- Covers: `ShellNavigation` (open/back for five views), `DevelopmentSurfaces` (mocks/dev tools admitted only with the compile-time flag), `DevelopmentDevice` (dev phone simulator dial/hang-up/late timer), `FilesTree` (upstream `BrowserStorageVolume` reviewed-identity move refuses changed/missing files). Duplicates: `shell-coordinator.mjs` (same `ShellNavigation` model on the mounted app); `test/dev-surface-gates.test.mjs` and `scripts/audit-production-bundle.ts` (flag gating); Files Playwright specs (move). Callers: `index.mjs` aggregate only. No per-model tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-34 | T10 / T4 | `shellNavigation` slices `model.js` from `'  goHome(chat) {'` to `'  /* ---- Android'` into a stub `Shell` class. Same model is refined more faithfully by `shell-coordinator.mjs` on the mounted app. | Delete this adapter. | L |
| 2 | 36-55 | T2 | `developmentSurfaces` type-strips `build-flags.ts` and `dev-profile.ts`, renames `devSurfacesEnabled`→`profileEnabled`, regex-removes `:boolean`, replaces `import.meta.env`. `dev-profile.ts` re-declares `devSurfacesEnabled` "so Node contract" tests can load it (D7). | Use `bundledSource(path, {'import.meta.env': JSON.stringify(env)})` (already in `support.mjs`) with a `@capacitor/core` stub; then `dev-profile.ts` can import `devSurfacesEnabled` from `build-flags.ts`. | L |
| 3 | 57-79 | T10 | `developmentDevice` slices `model.js` from `'var PN ='` to `'registerView("phone",'`. Models the development phone simulator (dev-only, D6/D19). | If the dev phone simulator survives D19, port with the `model.js` split (export `pnStart/pnEnd` from the phone view module); if a retained e2e spec does not drive it, delete simulator, model and adapter together (D20 rule). | M |
| 4 | 81-136 | — | `filesTree` bundles the real upstream volume and drives a CAS library port. Good. | Move to its own file (`files-tree.mjs`) with a per-model test. | L |
| 5 | 2-8 | C3 | Wraps `checkTraces` locally to append its own path. | Drop with provenance cleanup. | L |

Product files read as text: `apps/app/src/prototype/model.js` (anchors `  goHome(chat) {`, `  /* ---- Android`, `var PN =`, `registerView("phone",`), `apps/app/src/build-flags.ts`, `apps/app/src/browser/dev-profile.ts` (identifier rewrites).

## Proposed end state
File removed: `files-tree.mjs` (real import) and `development-surfaces.mjs` (bundled with `define`) each with a
per-model test; `developmentDevice` follows the simulator decision; `shellNavigation` deleted.
