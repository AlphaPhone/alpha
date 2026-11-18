# .github/workflows/verify-cloud-signing-input.yml
- Lines: 37 | Kind: reusable workflow (admit a Cloud APK signing plan) | Verdict: MERGE into `.github/workflows/release-cloud-app-signing.yml` (as its `admit` job)
- Covers: on main in the canonical repo, runs `scripts/ci/verify-cloud-signing-input.sh` with the signing plan to check that the referenced unsigned archive is the reviewed `resident-distribution-archive-*` producer artifact, and outputs the plan SHA-256. Duplicates: none (the sign job reuses the same script with `--stage`). Callers/importers: only `release-cloud-app-signing.yml:28`. `resident-android.yml:429` mentions the script (comment). YAML read by `specs/quint/refinement/services/protected-app-update-promotion.mjs:15` and listed in `specs/quint/services/manifest.json:2926`; `test/embedding-workflow-forwarding.test.mjs`, `test/cloud-signing-input.test.py` reference it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | D4 | A reusable workflow with one caller and one step; job-level `permissions: {actions: read, contents: read}` in the caller gives the same isolation from the `release` environment and secrets. | Inline as the `admit` job of `release-cloud-app-signing.yml` (same `if`, permissions, checkout, step, output). | Low. |
| 2 | 19 | B3 | Repeats the repository/ref guard the caller already applies at `release-cloud-app-signing.yml:24`. | Gone with #1 (one guard). | None. |
| 3 | whole | T10 | Quint harness parses this file; manifest lists it as a source. | Update `protected-app-update-promotion.mjs` and `specs/quint/services/manifest.json` in the same change (point at the `admit` job inside the merged file, or better at `verify-cloud-signing-input.sh`). | Medium: formal suite must stay green. |

## Proposed end state
File deleted; `release-cloud-app-signing.yml` has `admit` (no secrets, read-only) → `sign` (release environment) jobs.
