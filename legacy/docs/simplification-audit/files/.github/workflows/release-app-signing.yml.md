# .github/workflows/release-app-signing.yml
- Lines: 124 | Kind: protected release workflow (dispatch; sign code-free fixture APKs as a "closed signing proof") | Verdict: DELETE (with `scripts/ci/build-app-signing-fixtures.py`), owner to confirm the proof is one-off
- Covers: generates two code-free fixture APKs, checks the protected app keystore's certificate matches `android/release-signer.json`, signs both fixtures with `scripts/sign-release-apks.ts`, and uploads a JSON proof (hashes only, APKs not exported, `distributionQualified: false`). Duplicates: `release-cloud-app-signing.yml:186-203` performs the same keystore decode, fingerprint check and `sign-release-apks.ts` signing on every real release; `release-custody-proof.yml` verifies the same keys exist and match. Callers/importers: dispatch on main only; 2 runs. `git grep release-app-signing` → no references outside this file; `build-app-signing-fixtures.py` referenced only here.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | P4/B5 | A one-time proof that the protected signer works on fixtures; the real signing workflow re-proves keystore ↔ signer on every run and the custody proof covers key presence. | Delete the workflow and `scripts/ci/build-app-signing-fixtures.py`. | Owner: release-process evidence (research §10 Q7). |
| 2 | 91-119 | C7 | Inline Node heredoc builds the proof JSON. | Gone with #1. | None. |
| 3 | 62-86 | C5 | Keystore block duplicated in `release-cloud-app-signing.yml`. | Gone with #1 (no shared helper needed). | None. |

## Proposed end state
File deleted. If the owner keeps it, extract the keystore block into `scripts/ci/with-app-keystore.sh` shared with `release-cloud-app-signing.yml` and move the proof JSON writer into `build-app-signing-fixtures.py`.
