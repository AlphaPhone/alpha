# android/signing/ota-tools.json
- Lines: 12 | Role: pin of the OTA signing toolchain archive (sha256, SDK commit, allowed producer commits, signer-mapping and AVB-config digests, reviewed targets) | Verdict: KEEP
- Importers: `scripts/ci/sign-os-ota.py:55-59`. Text/path pins: `README.md:292` (states `reviewedTargets: []`), `scripts/ci/sign-os-ota.test.py:28,81,91`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-11 | — | `"qualified": true` with `"reviewedTargets": []` — README documents that validation refuses until a target is reviewed. Consistent. | Keep. | — |

## Local types and helpers
None.

## Proposed end state
Unchanged, 12 lines.

## Verification
`python3 scripts/ci/sign-os-ota.test.py`.
