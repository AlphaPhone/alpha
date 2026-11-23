# .github/workflows/release-os-ota-signing.yml
- Lines: 124 | Kind: protected release workflow (dispatch; sign a preserving OS OTA from private storage) | Verdict: KEEP, SIMPLIFY (shared GCP auth action)
- Covers: on a reviewed main commit, validates an exact-object OTA plan, downloads and hashes private inputs from GCS, signs with the OS release keys, writes the signed OTA back without overwrite and exports a public receipt. Duplicates: GCP auth block (also `release-cloud-app-signing.yml`, `publish-qualified-app-update.yml`). Callers/importers: dispatch; 6 runs. Named in `README.md`, `scripts/ci/private-artifact-identity.json` (workflow identity), `test/ci-emulator-evidence.test.mjs`, `test/qualified-app-update.test.mjs:68` (text).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 75-86, 102-113 | P5 | Two identical `google-github-actions/auth` blocks (separate tokens before and after signing, justified by the 3600 s lifetime vs a 120-min job). | Keep two calls but through one composite action `.github/actions/gcp-release-storage`. | None. |
| 2 | 73-74 | T9 | `sign-os-ota.test.py` runs inside the release job. | Also run it in the host lane (`python-suites.test.mjs`); keep it here as a pre-key gate. | None. |
| 3 | 44-54 | — | Disk check with conditional cleanup; reasonable. | Use the shared `free-disk` composite when it exists. | None. |
| 4 | whole | T1 | Text assertions in `ci-emulator-evidence.test.mjs` / `qualified-app-update.test.mjs:68`. | Delete those assertions; renaming the file still requires `private-artifact-identity.json` update. | Low. |

## Proposed end state
Same steps, ~105 lines, using the composite auth action; script self-test also in the host lane.
