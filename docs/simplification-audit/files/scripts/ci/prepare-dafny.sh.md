# scripts/ci/prepare-dafny.sh
- Lines: 13 | Kind: CI setup script | Verdict: KEEP; MERGE the inline twin in `lemma-check.yml` into it
- Covers: downloads Dafny 4.11.0, checks its SHA-256, verifies `--version`, adds it to `GITHUB_PATH`. Duplicates: `.github/workflows/lemma-check.yml:28-29,40-44` installs the same version with the same digest inline. Callers/importers: `.github/workflows/browser.yml:59` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | C5 / P3 | Same pinned download implemented twice (here and `lemma-check.yml`), and Dafny proofs then run twice (in `npm run verify` and in `lemma-check.yml`). | `lemma-check.yml` calls this script; decide one lane for Dafny proofs (proposed: `lemma-check.yml`, path-filtered to `LemmaScript-files.txt` sources; `verify` stops requiring the backend). | Low. |
| 2 | 11-12 | B5 | Post-install version regex check after a digest-pinned archive. | Optional; keep (cheap). | — |

## Proposed end state
One installer used by every workflow that needs Dafny (ideally inside a composite setup action); Dafny proofs run in one lane only.
