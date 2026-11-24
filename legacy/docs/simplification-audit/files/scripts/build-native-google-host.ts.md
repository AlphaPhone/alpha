# scripts/build-native-google-host.ts
- Lines: 61 | Kind: build pipeline step (Bun bundle of `native-google-product-host.ts` against the prepared SDK, with an exact input-hash graph) | Verdict: KEEP + SIMPLIFY
- Covers: the managed-Google product host packaged in the worker artifact is compiled only from the prepared, pinned SDK, with every consumed input hashed into its metadata. Duplicates: inline sha256 x2 (C3). Callers/importers: spawned by `scripts/native-google-host-artifact.ts` (which hashes this file as a provenance input, research 2.9); test fixture `test/fixtures/native-google-host-builder-port.mjs:28` (asserts the spawned path); Quint `services/native-google-host-artifact(-probe).mjs` (hash input lists), `services/manifest.json:2337`; `quint-lib.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | - | Positional argv with no names; fine for a single internal caller. | Optional: `parseArgs`. | None. |
| 2 | 31-35, 50-55 | B5 | "Input changed while compiling" check and graph-completeness self-check on a single build pass. The metadata `inputHashes` is the real product (consumed by the artifact verifier); the during-build change detection is ceremony. | Keep recording `inputHashes`; drop the `previous !== digest` re-check and the `graph.size !== consumed.size` assertion (or keep only the latter if the verifier depends on completeness). | Low. |
| 3 | 32, 59 | C3 | Inline sha256. | `scripts/lib/hash.ts`. | None. |
| 4 | whole | B5/2.9 | This file's own bytes are an input of the artifact stamp (`native-google-host-artifact.ts:66`), so any refactor forces a rebuild. | Stamp on the pin + output bytes, not on tool source (research 2.9). | Cross-file. |

## Proposed end state
~45 lines: Bun build with the pinned-SDK resolver plugin, record metafile + input hashes + output hash. No in-build
re-hash checks. Coverage: the resident/Android CI worker build (integration); the builder-port fixture test can stay
only if it runs the real builder, otherwise delete it.
