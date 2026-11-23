# scripts/ci/seal-signed-apks.py
- Lines: 67 | Kind: release CI script (CMS-encrypt signed APK bundle to an approved recipient) | Verdict: KEEP pending owner decision; DELETE together with the CMS branch if CMS delivery is retired
- Covers: checks the signed bundle and recipient certificate digests, rejects an expired certificate, encrypts with `openssl cms` (AES-256-GCM, RSA-OAEP-SHA256) and links the ciphertext atomically into the delivery folder. Duplicates: `sha256` file helper repeated across Python CI. Callers/importers: `.github/workflows/release-cloud-app-signing.yml:232-234` (the `else` branch taken when a signing plan has no `privateStorage`); no test (`git grep seal-signed` finds only the workflow).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A3 / A7 | `qualified-app-update.py:97-99` refuses CMS delivery ("deliberately unsupported"), so a CMS-sealed signing run can never be published through the reviewed path. If every current signing plan uses `privateStorage`, this branch is dead. | Owner question; if retired, delete this script, the `else` branch and the `signed-apks.cms`/`envelope.json` artifact paths. | Medium (release path). |
| 2 | 18-20 | C3 | Local `sha256(path)`. | `ci_common`. | None. |
| 3 | — | coverage | No test; only exercised by a real signing run with a CMS plan. | If kept, add one case to `test/cloud-signing-input.test.py` with a disposable certificate. | Low. |

## Proposed end state
Either deleted with the CMS branch (preferred if confirmed unused), or kept with one disposable-certificate test.
