# scripts/ci/private-artifact-identity.json
- Lines: 47 | Kind: config record (GCP workload-identity pool, service account, custom roles for the private APK bucket) | Verdict: MOVE to `docs/release/private-artifact-identity.json` (or inline into the release README); delete the test that reads it
- Covers: documents the cloud-side identity configuration that lets only `release-cloud-app-signing.yml`, `publish-qualified-app-update.yml` and `release-os-ota-signing.yml` on `main` in the `release` environment mint a storage token. Nothing executes it; the real state lives in GCP. Duplicates: none. Callers/importers: only `test/qualified-app-update.test.mjs:41` (asserts literal claims in this file and matches `providerResource`/`serviceAccountEmail` against workflow YAML text: T1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 / T1 | Data file in `scripts/ci/` read only by a source-text test that compares it with workflow text. | Move to `docs/` as the operator record; drop the test block (it checks that two hand-written texts agree, not that GCP is configured so). | Low; the workflow's `workload_identity_provider` and `service_account` literals remain the operative values. |

## Proposed end state
A documented operator record next to the release docs; no test pins it.
