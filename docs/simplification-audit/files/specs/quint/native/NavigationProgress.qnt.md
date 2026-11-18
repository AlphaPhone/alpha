# specs/quint/native/NavigationProgress.qnt
- Lines: 214 | Kind: Quint model (live, `native/manifest.json`) | Verdict: KEEP
- Covers: shared Maps screen guidance (maneuver cursor, arrival accuracy, explicit reroute, follow/recenter) and the owned screen-off background-navigation bridge (availability, start ACK, stop/update commands per session id). Duplicates: none (the Java service side is `NativeNavigationOwnership.qnt`; the Maps screen route phase is referenced, not re-modelled, by `services/manifest.json:419`). Callers/importers: `scripts/check-quint.ts` via manifest; refinement `specs/quint/refinement/native/navigation-progress.mjs` (registered in `refinement/native/index.mjs:40,170`); prose in `native/README.md:149-159`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest entry | T10 / — | Tie to code is good: `navigation-progress.mjs:28-55` bundles the real `apps/app/src/maps/screen.ts`, `background-navigation.ts`, prepared plugin-maps `state.ts`, `saved-places.ts`, `navigation-fix.ts` with esbuild and runs them. No text slicing. | Keep the import-and-run harness as the reference shape for ports elsewhere. | none |
| 2 | harness 43-52 | B5 | Harness re-authenticates every prepared `.eliza/client-features` Maps input by SHA-256 against `.source.json` and the vendor pin before running. `prepare-client-features` already guarantees this; the check guards against inputs changing mid-run. | Drop the per-file hash re-check (keep `captureInputs` only if the receipt is consumed). | low |
| 3 | manifest `sources` | B3 | Manifest lists `AlphaNavigationService.java` and `AlphaMapsTransportPlugin.java`, but this model's harness executes no Java (README line 225 obligation says the Java service is `NativeNavigationOwnership`). Over-claimed source pins make Java-only renames re-run this model under a path-scoped CI. | Remove the two Java paths from this model's `sources`. | low |
| 4 | 16-17, 101-103 vs 153-166 | — | `fix` declares domains (`away-first`, `off-99`, `off-101`, accuracy 50/51, age ±5001/30001, descriptions `unchanged`/`matches-start`) that `step` never samples; random walks only use six concrete fixes. Boundary classes are exercised only if the harness drives them. | Either add one nondet `fix` over the declared domains to `step`, or drop unused values. Check refinement still passes. | low (model-only) |
| 5 | 1, 49 | — | Comments describe current behaviour; no tombstones. | none | — |

## Proposed end state
Model unchanged apart from finding 4. Manifest `sources` trimmed to the TypeScript modules the harness actually bundles
(plus the vendor maps-screen pin). Harness keeps the esbuild import path and loses the duplicated prepared-input
authentication. Source code under `apps/app/src/maps/` and `prototype/maps-adapter.ts` still exists after DECISIONS;
if Stage F moves `maps-adapter.ts` out of `prototype/`, only the manifest path changes.
