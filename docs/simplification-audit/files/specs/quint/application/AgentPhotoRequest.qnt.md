# specs/quint/application/AgentPhotoRequest.qnt
- Lines: 92 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP (model-only; owner may want a harness)
- Covers: An assistant-requested photo waits for a starting preview, is refused when a recording starts first, holds the shutter exclusively, and reports `failed` only when nothing was dispatched (`unknown` after a dispatched shutter without confirmation). Models: `apps/app/src/prototype/camera-adapter.ts` (`takeRequestedPhoto`, `untilSettled`, `agentRequest`, `requestedCaptureHolds`, `waiters`; exist). Duplicates: Playwright camera specs exercise the adapter; no other model. Callers/importers: manifest (6 tests, 4 witnesses, 5 symbol pins); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes. No refinement harness and no test wrapper (`git grep -w AgentPhotoRequest` hits only the model, manifest and README).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | T10 | Tied to code only by five symbol-name pins in the manifest; nothing executes the adapter against the model. | Pin the file only. If a check against code is wanted, add a trace replay that imports the camera adapter request function (after the adapter exposes it as a module function), not a slice. | Low |
| 2 | 13 | — | `finished` decrements `holds` unconditionally; `OneAgentRequest` keeps it consistent. Fine. | Keep. | — |

## Proposed end state
Unchanged model; manifest pins the source file without symbol strings.
