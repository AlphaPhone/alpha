# specs/quint/application/HostedBackgroundAdmission.qnt
- Lines: 94 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (whole-file transplant)
- Covers: renderer reservation/retirement of native hosted inbox setup: begin→config, abort/pause by exact session, cancel refusals observable, no native state in the browser (`apps/app/src/runtime/hosted-background.ts`). Hosted background digests are live, not the D5 paired/hosted-agent code. Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `hosted-background-admission.mjs` via `test/quint-hosted-background-admission.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 62 | T2 | `sourceContext` strips types, regex-deletes imports/exports and runs the file in a vm context with fake globals. | Use `sourceModule` (esbuild bundle + import) with a port stub for the native plugin. | L |
| 2 | — | D11 | cross-file-actions §826 moves `digest-inbox.ts` → `hosted-background.ts`; manifest source path is already the target. | None. | none |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness imports the bundled module; `sourceContext` callers shrink toward deletion.
