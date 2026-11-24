# android/signing/alpha-key-manifest.json
- Lines: 107 | Role: names and parameters (no key material) of the 12 keys for the offline release key ceremony: upstream Pixel 10a image keys plus `alphaphone_app` | Verdict: KEEP
- Importers: `scripts/enroll-release-keys.ts:41` (`KEY_MANIFEST`), `scripts/ci/release-custody-proof.py:116`, `scripts/ci/sign-os-ota.py:223` (`releasekey.bits`), `scripts/sign-release-apks.ts:12` (doc), passed to upstream `generate-release-keys.ts --manifest`. Text/path pins: `test/enroll-release-keys.test.mjs:85` compares entries with upstream `vendor/eliza/packages/os/android/signing/key-manifest.json`; `scripts/ci/release-custody-proof.test.py:86`, `scripts/ci/sign-os-ota.test.py:30`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | A8 (minor) | Description explains which upstream keys were left out and which scripts consume the ceremony output — useful "why"; fine. | Keep. | — |
| 2 | 9-105 | C6 | The 11 OS key rows are a copy of upstream `key-manifest.json` rows (test enforces equality). Inherent: the ceremony tool takes one manifest file. | Keep. | — |

## Local types and helpers
None. Data twin: upstream `packages/os/android/signing/key-manifest.json` (enforced equal).

## Proposed end state
Unchanged, 107 lines.

## Verification
`node --test test/enroll-release-keys.test.mjs`; `python3 scripts/ci/release-custody-proof.test.py`; `python3 scripts/ci/sign-os-ota.test.py`.
