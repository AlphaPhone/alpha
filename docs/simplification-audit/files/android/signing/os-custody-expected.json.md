# android/signing/os-custody-expected.json
- Lines: 18 | Role: expected public digests of the custodied OS keys (9 certificates, AVB key, app signer) used to check a ceremony archive and to sign OTA packages | Verdict: KEEP (twin data with fingerprints.json)
- Importers: `scripts/ci/release-custody-proof.py:114-128,220`, `scripts/ci/sign-os-ota.py:217` (`osCertificateSha256.releasekey`), `scripts/stage-os-update-enrollment.ts:12,30-31`. Text/path pins: `scripts/ci/release-custody-proof.test.py:79-81`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-17 | C6 | Every digest here is also in `android/signing/public/fingerprints.json` (`certificateSha256` of the 9 x509 keys, `avb.avbPublicKeySha256`), and `appSignerSha256` equals `android/release-signer.json:4` `signerSha256`. Three committed copies of the same public fingerprints. | Keep this file as the consumed record (three readers) and delete `public/fingerprints.json` (no reader), or vice versa. Recommended: keep this file, delete fingerprints.json + PROVENANCE.json (see their reports). Optionally have `release-custody-proof.py` read `appSignerSha256` from `release-signer.json` instead. | Low |
| 2 | 3 | — | `"purpose": "Protected custody comparison only; not production enrollment"` — accurate. | Keep. | — |

## Local types and helpers
`interface Custody {osCertificateSha256:Record<string,string>}` in `scripts/stage-os-update-enrollment.ts:12` is the only typed reader; no twin.

## Proposed end state
Unchanged 18 lines (or 17 if `appSignerSha256` is read from release-signer.json).

## Verification
`python3 scripts/ci/release-custody-proof.test.py`; `python3 scripts/ci/sign-os-ota.test.py`; `node --test test/os-update-enrollment.test.mjs`.
