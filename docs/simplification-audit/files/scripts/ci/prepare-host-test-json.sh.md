# scripts/ci/prepare-host-test-json.sh
- Lines: 11 | Kind: CI setup script | Verdict: KEEP (fold into the shared composite setup action)
- Covers: downloads the digest-pinned `org.json` jar for host Java tests and exports `ALPHA_JSON_JAR` and `ELIZA_ORG_JSON_JAR`. Duplicates: none in scripts; repeated workflow step blocks around it. Callers/importers: `.github/workflows/android.yml:60`, `browser.yml:55`, `resident-android.yml:256`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-11 | R6 | `ELIZA_ORG_JSON_JAR` exists only for upstream plugin tests (`stage-launcher-overlay` etc.) run from this repo's CI. When those leave for upstream CI (cross-file follow-up), drop the second export. | Track with the upstream-test follow-up. | None. |
| 2 | all | P5 | Called from three workflows with copied setup blocks. | Move into the single composite setup action (P5). | None. |

## Proposed end state
Unchanged script, invoked from one composite action; second env export removed when upstream tests leave.
