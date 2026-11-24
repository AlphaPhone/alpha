# specs/quint/application/OSSourceStaging.qnt
- Lines: 26 | Kind: Quint model (live; runs the real Python staging script) | Verdict: KEEP
- Covers: AOSP branding staging: all preimages admitted before any write, backup before write, completion only after full readback. Duplicates: Python staging cases (test of scripts/stage-alpha-os-branding.py, other chunk) cover exact paths/hashes. Callers/importers: manifest row (scripts/stage-alpha-os-branding.py, generate-alpha-os-branding.ts, fetch-alpha-os-preset-inputs.py); harness specs/quint/refinement/application/os-source-staging.mjs (spawns the script); wrapper test/quint-os-application-refinement.test.mjs

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-26 | - | Small model of a release-gating script; OK. | Keep. | L |
| 2 | family | D11 | This and OSDefaults/OSProvisioning model Android OS-image code but live in the `application` family. | Optional: move to `native` family when manifests are normalised (cross-file `readModelFamily`). | L |
| 3 | lane | P1 | Spawns Python. | OS lane only. | L |

## Proposed end state
Unchanged.
