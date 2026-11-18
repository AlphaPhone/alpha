# android/signing/public/PROVENANCE.json
- Lines: 10 | Role: record of the GitHub workflow run/artifact that produced the public key exports in `android/signing/public/` | Verdict: DELETE
- Importers: none (grep `PROVENANCE`: 0 hits in scripts/test/.github/specs; `signing/public` is read only by `test/os-update-enrollment.test.mjs:22,55` for two `.pem` files). The same shape is *produced* by `scripts/ci/release-custody-proof.py:224-226` (`keyPairsVerified`, `signedImageProduced`, `deviceQualified`), but nothing reads the committed copy.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-10 | B5 | `"workflowRun": 42919025243, … "keyPairsVerified": 12, "signedImageProduced": false, "deviceQualified": false` — receipt with no consumer. | Delete; the workflow run is in the commit message/PR that added the exports. | None |

## Local types and helpers
None.

## Proposed end state
Gone.

## Verification
`git grep PROVENANCE.json` empty; `npm run verify`.
