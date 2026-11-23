# scripts/ci/release-custody-proof.py
- Lines: 247 | Kind: release CI script + library (release key custody proof) | Verdict: KEEP (minor SIMPLIFY; SHA-pinned)
- Covers: decrypts the split OS release-key archive and the app keystore from secrets inside `/dev/shm`, checks every private/public pair, X.509 digest, AVB metadata and enrolled fingerprints against `android/signing/os-custody-expected.json`, `android/release-signer.json`, `alpha-key-manifest.json`, and exports public identities. Duplicates: `sha256`/`require` helpers repeated across Python CI. Callers/importers: `.github/workflows/release-custody-proof.yml:44` (verifies the script's SHA-256 against a dispatch input), `:62`; imported by path from `sign-os-ota.py:29` (`openssl`, `certificate_identity`, `archive_entries`, `decode`, `SECRET_NAMES`, `private_public`); tested by `release-custody-proof.test.py`; README.md.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | file name | C7 | Hyphenated name: `sign-os-ota.py` loads it by path. | Rename to `release_custody.py` when the workflow's `proof_sha256` pin is next rotated; until then leave the bytes alone (any edit invalidates the operator's pinned digest). | Medium: pin coordination. |
| 2 | 39-41 | — | `require()` raises one fixed message on purpose (no secret-derived text). Keep. | None. | — |
| 3 | 224-226 | B5 | Receipt constants `signedImageProduced:false`, `deviceQualified:false`. | Keep: they are the published proof's scope statement. | — |

## Proposed end state
Unchanged until the next deliberate pin rotation; then renamed to an importable module and sharing `ci_common` helpers. It is release-gating tooling, so it and its test stay.
