# android/signing/public/fingerprints.json
- Lines: 88 | Role: committed copy of the key ceremony's public `fingerprints.json` (certificate SHA-256 and subject per key, AVB public key digests) next to the exported `.pem`/`avbpubkey`/`avb_pkmd.bin` files | Verdict: DELETE (owner confirm) — or make it the single source and delete the twin
- Importers: none by path. `fingerprints.json` hits in `scripts/enroll-release-keys.ts` and `scripts/ci/release-custody-proof.py:27,128,211` refer to the file *inside a ceremony directory/archive* passed on the command line, not this committed copy (grep `signing/public`: only `test/os-update-enrollment.test.mjs` for `.pem` files).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-88 | C6 / B5 | Digests duplicate `android/signing/os-custody-expected.json` (9 certificates + `avb`) and `android/release-signer.json:4` (`alphaphone_app`); only `apex_payload.avbPublicKeySha256` (`5c3d…`) and the subjects are unique. No reader. | Delete, keeping the `.pem` exports. If the owner wants the ceremony record kept, instead make this the single source: point `release-custody-proof.py`, `sign-os-ota.py` and `stage-os-update-enrollment.ts` at it and delete `os-custody-expected.json`. | Low |

## Local types and helpers
None.

## Proposed end state
Gone (or the single custody record, with `os-custody-expected.json` deleted).

## Verification
`python3 scripts/ci/release-custody-proof.test.py`; `node --test test/os-update-enrollment.test.mjs test/enroll-release-keys.test.mjs`.
