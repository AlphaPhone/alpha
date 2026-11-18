# specs/quint/refinement/services/native-google-host-artifact-probe.mjs
- Lines: 370 | Kind: Quint refinement driver (child-process probe; imports the real `addNativeGoogleHostArtifact` / `verifyNativeGoogleHostArtifact`, real `verifyWorkerArtifact`, synthetic Git SDK) | Verdict: KEEP, SIMPLIFY
- Covers: 20+ schedules of build/verify on the native Google host artifact: preflight refusals (projection, Bun, compiler, output, resolver, SDK drift), graph/transform/metadata/input/fixed/candidate refusals, manifest/module publication refusals via a patched `fs.renameSync`, peer replacement of the live module, readback of replaced/missing bytes; plus the optional real-Bun loader matrix (`bunCompatibility`). Duplicates: none. Callers: spawned only by `native-google-host-artifact.mjs:11,20`; imports `test/fixtures/native-google-host-builder-port.mjs`, `test/fixtures/core-state-root.mjs`, `scripts/{workflow-worker-artifact,build-policy-source,core-state-patch}.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-29 | — | Uses a module resolve hook to replace `./prepare-client-features.ts` with a global port. This is import-level substitution, not text slicing: good, but it pins the literal specifier string of an import in `scripts/native-google-host-artifact.ts`. | Keep; if the script ever takes the projection as a parameter, pass it directly and drop the hook. | Low |
| 2 | 146-162 | T10 (error text) | Outcomes are classified by regex over error **messages** (18 rules). Rewording any error in the builder breaks the harness. | Give the builder's refusals a `code` (e.g. `ArtifactError{code:'graph'}`) and classify on it. | Medium (touches product script) |
| 3 | 36-43 | C5 | `productFiles` duplicates the wrapper's source list (`native-google-host-artifact.mjs:40-46`). | Export one list. | Low |
| 4 | 184-203 | — | Monkey-patches `fs.renameSync` to inject publication refusals; restored in `finally`. Acceptable in an isolated child process. | Keep. | — |
| 5 | 113-126 | B3 | Re-asserts receipt key set and per-row source/output hash equality on every observation. These are the properties under test (receipt binds compiled source), so keep, but the key-set `deepEqual` on line 113 is a shape check. | Drop line 113; the following field assertions cover it. | Low |
| 6 | 232-285 | T5 | `bunCompatibility` is a loader feature matrix for the pinned Bun (ts/mts/cts/jsx/json/text imports), not a refinement trace. Only reached with `ALPHA_QUINT_BUN`. | Keep where it is (needs the same fixture) but run it from the tooling lane, not the Quint lane. | Low |
| 7 | 1-370 | D8 | Dense lines (e.g. 73-78, 151-157). | Prettier pass (D9). | — |

## Proposed end state
Same driver, error classification on codes, one shared input list, Prettier-formatted. It already executes the real
producer and verifier on real files; no text slicing to port.
