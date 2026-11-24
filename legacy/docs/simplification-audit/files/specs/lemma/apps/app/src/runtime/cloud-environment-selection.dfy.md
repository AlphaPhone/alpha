# specs/lemma/apps/app/src/runtime/cloud-environment-selection.dfy
- Lines: 36 | Kind: Lemma proof companion (generated, identical to `.dfy.gen`) | Verdict: KEEP
- Covers: Dafny proof that the Cloud environment is always production or staging, and staging is reachable only with test mocks + explicit staging, or a development non-Android cloud-resident/preview build. Models live product code `apps/app/src/runtime/cloud-environment-selection.ts` (exists; functions `resolveCloudEnvironmentCore` still exported/used). Duplicates: `specs/lemma/apps/app/src/runtime/cloud-environment-selection.dfy.gen` (byte-identical). Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | B5 | Byte-identical to its `.dfy.gen`; carries no hand-written proof text. | Keep while `check-lemma.ts` requires both companions; see the chunk cross-file action to let the checker accept a missing `.dfy` when it equals `.dfy.gen`. | Low |
| 2 | — | — | Product report proposes adding `cloudEnvironmentAllowed(policy, env)` with its own ensures in the same file and returning `CloudEnvironment`. | If done, regenerate both companions (`npm run lemma:regen`). | Low |

## Proposed end state
Generated companion; unchanged unless the product file changes. Release-relevant (it is the proof that production builds cannot select staging).
