# scripts/ci/build-app-signing-fixtures.py
- Lines: 53 | Kind: CI script (builds two code-free APKs with aapt2 for signer-custody proof) | Verdict: KEEP
- Covers: produces `standalone`/`launcher` unsigned code-free APKs and checks with `aapt2 dump` that they carry no code, resources, components or permissions, so the protected keystore can be exercised without signing product code. Duplicates: none. Callers/importers: `.github/workflows/release-app-signing.yml:58-60` only (dispatch-only; the workflow pins this file's SHA-256 through a `FIXTURE_GENERATOR_SHA256` input, so any edit needs a new input value).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-18 | C6 | `build-tools/36.0.0` and `android-36` literals repeated across `build-private-peer.py:18,23`, `resident-android.yml` `sdkmanager` steps and others. | One constant (e.g. `scripts/ci/cilib.py ANDROID_BUILD_TOOLS`) or pass the tool path from the workflow. | Low. |
| 2 | 32-43 | - | The post-build checks are the purpose of the script (custody fixtures must be inert); keep. | none | - |

## Proposed end state
Unchanged apart from sharing the build-tools version constant. Note for the owner: editing this file requires updating the reviewed `FIXTURE_GENERATOR_SHA256` workflow input.
