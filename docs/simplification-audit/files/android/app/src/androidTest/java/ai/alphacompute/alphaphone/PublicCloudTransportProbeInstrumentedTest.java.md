# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PublicCloudTransportProbeInstrumentedTest.java
- Lines: 159 | Role: manual probe of the public Eliza Cloud CLI-session endpoints and an owned key's identity/entitlement reads through `AlphaConnection.request`. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:338` `NOT_RUN_BY_A_RUNNER.PublicCloudTransportProbe` (must be removed with the file; `test/android-instrumentation-runner.test.mjs:204`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-18 | A3 / A7 | `freshSessionCreateAndPendingPoll` probes `/api/auth/cli-session`, which its own comment calls "a diagnostic fallback for one release" that exists "only in test-mocks builds"; product sign-in is in-app (`AlphaCloudSignInPlugin`). Gate `publicCloudProbe=1`: grep in scripts/test/.github: 0 hits. | Delete. | low |
| 2 | 88-157 | A7 / T9 | `ownedCredentialIdentityAndBalance` needs a hand-placed `alpha-owned-cloud-key.private.json` (`ownedCloudRead=1`, 0 script hits) and a human sign-in step. A live-network operator probe, not a product test. | Delete; if an owned-account smoke is wanted, it belongs to a host script against the API, not instrumentation. | low |
| 3 | 13, 37, 128 | B3 | 330-character `TRANSPORT_CODE_PATTERN` regex re-validating the product's own error codes inside the page. | Goes with the deletion. | none |
| 4 | 94-105 | B3 | Hand-rolled file/JSON/token validation of the test's own input file. | Goes with the deletion. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `TRANSPORT_CODE_PATTERN` | const | 13 | `ALPHA_TRANSPORT:` code format owned by `AlphaConnectionPlugin` | deleted |

## Proposed end state
File removed; one `NOT_RUN_BY_A_RUNNER` entry removed. 0 lines.

## Verification
`node --test test/android-instrumentation-runner.test.mjs`. Nothing runs it today.
