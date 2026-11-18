# test/fixtures/native-google-host-builder-port.mjs
- Lines: 108 | Kind: Quint refinement fixture (fake `bun` executable: copied into a scratch root as `fixture-bun.mjs`, installs a fake `globalThis.Bun.build/resolveSync/write` and runs the real `scripts/build-native-google-host.ts`) | Verdict: KEEP (live model `native-google-host-artifact`); SIMPLIFY
- Covers: the native Google host artifact builder/verifier (`scripts/native-google-host-artifact.ts`, used by `scripts/stage-local-agent-runtime.ts` and `cloud-resident-host.ts`) refuses wrong Bun versions, compiler refusals, missing/linked/escaping inputs, incomplete graphs and input/output drift. Duplicates: none found. Callers/importers: `specs/quint/refinement/services/native-google-host-artifact-probe.mjs` (imports exports, copies the file as the fake bun), `specs/quint/refinement/services/native-google-host-artifact.mjs` (lists it as a bound input), live via `services/index.mjs:50` and `scripts/quint-lib.ts:23`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | C3 | Local `digest` SHA-256 helper. | Shared hash helper. | None. |
| 2 | 26-35 | B3/T10 | Asserts the exact argv shape the verifier passes to bun (`--conditions=eliza-source`, script path, artifact directory naming `.native-google-host-build-*`). Pins the call convention; acceptable for a fake executable but every rename breaks it. | Keep the minimum (arg count + script); let the probe check the rest. | Low. |
| 3 | 52-80 | D9 | Thirteen `control.mode` branches threaded through `build` and `write`. | Table of mode → mutation hooks. | Low. |
| 4 | 108 | D10 | Self-executes only when `argv[1]` ends with `/fixture-bun.mjs`; the probe relies on copying it under that name. Implicit contract. | Split into `fixture-bun.mjs` (entry) and the exported constants module, so no name sniffing. | None. |
| 5 | — | D11 | Lives in `test/fixtures` but only Quint services harnesses use it. | Move to `specs/quint/refinement/services/fixtures/`. | Low (update probe path + bound input list). |

## Proposed end state
Moved beside its harness, entry split from constants, shared hash, mode table. Kept as long as the
native-google-host-artifact model is live (it models a release-gating script).
