# .github/workflows/publish-qualified-app-update.yml
- Lines: 159 | Kind: protected release workflow (dispatch; publish the qualified launcher APK to the stable update pointer) | Verdict: KEEP, SIMPLIFY (inline Python into the admission script; drop suffix fallback)
- Covers: admits a reviewed `alpha-qualified-app-update/v1` record without secrets, then in the `release` environment restores the signed private object and the exact producer checkout, re-verifies all signed bytes with `android:verify` and the Cloud voice evidence, asserts both release rows, and publishes the launcher APK via `deliver-app-update.ts`. Duplicates: GCP auth block. Callers/importers: dispatch; never run (research §1). Read by `specs/quint/refinement/services/protected-app-update-promotion.mjs:16` (YAML), `specs/quint/services/manifest.json:2927`, `test/ci-emulator-evidence.test.mjs`, `test/qualified-app-update.test.mjs:12`; workflow identity in `scripts/ci/private-artifact-identity.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 125-140 | C7 | Inline Python asserts manifest rows against the qualification summary. | Move into `scripts/ci/qualified-app-update.py --check-manifest` (it already produces the summary). | Low. |
| 2 | 132 | correctness (owner) | Asserts `manifest['runtimeProfile'] == 'cloud'`, but every producer now writes `'native'`: `scripts/build-android.ts:279,307` ("there is one profile now"), `scripts/build-archive.ts:22`, `scripts/app-update-candidate.ts:151,171`, and `resident-android.yml:387`. `scripts/ci/admit-cloud-signing-input.py:29` (`single_profile`) has the same stale `== "cloud"` check, so the Cloud signing → publication chain appears unable to admit any current producer. | Owner: confirm the single-profile intent, then change both checks to `'native'` (or delete the `cloud` branch) before the first real use. | High if used as is: signing/publication would refuse every current archive. |
| 3 | 146-150 | A1 | `.mjs`/`.ts` suffix fallback for `deliver-app-update`. | Delete once owner confirms no older producer will be published. | Owner. |
| 4 | 83-94 | P5 | GCP auth block. | Shared composite. | None. |
| 5 | 114-121 | P3 | Two `npm ci --ignore-scripts` (verifier + product) and `upstream:prepare-client`; required because the product checkout is a different commit. | Keep. | None. |
| 6 | whole | T1/T10 | Quint harness parses step order; text tests. | Port harness to the scripts; delete text tests. | Medium. |

## Proposed end state
Same two jobs, ~130 lines; all assertions live in `qualified-app-update.py`; the `runtimeProfile` mismatch resolved by the owner before the first run.
