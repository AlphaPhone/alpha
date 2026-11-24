# android/aosp/pilot-system-update-enrollment.json
- Lines: 19 | Role: input to `scripts/stage-os-update-enrollment.ts` that stages an OS-update overlay + OTA key set into an AOSP tree so already-flashed pilot units (old `test-keys` build) can take a "preserving" OTA without key rotation or wipe. | Verdict: SIMPLIFY (and owner question: is the pilot enrollment still needed?)
- Importers: `scripts/stage-os-update-enrollment.ts:23` (only reader), `test/os-update-enrollment.test.mjs:13`. The staging script itself is invoked only by that test: no `package.json` script, workflow or doc mentions `stage-os-update-enrollment` (grep). Text pins: `stage-os-update-enrollment.ts:25-29` hard-codes `purpose`, `product`, `device`, the exact `manifestUrl` path and the exact `hosts` array, so the JSON values are duplicated in code.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | A7 | `"legacyOTACertificateSha256"` is declared in the script's type (`stage-os-update-enrollment.ts:9`) but never read; the test does not reference it either (grep: 1 hit = the type). | Delete the key and the type member. | Low |
| 2 | 3-12 | B3 / C6 | Every routing value (`purpose`, `product`, `device`, `manifestUrl`, `hosts`) is re-asserted verbatim in `stage-os-update-enrollment.ts:25-29`; the JSON therefore configures nothing the script would accept differently. | Either make the script the single source (constants in the script, delete those keys here) or trust the reviewed JSON and keep only scheme/host checks in the script. Pick one owner. | Low |
| 3 | 13-14 | A1 (exception) | `legacyBuildFingerprint`, `legacyPlatformCertificateSha256` describe the old pilot OS image; this is an OS-side migration of physically flashed devices (like `AlphaQsDefaultsPolicy`), not app private data, so A1 does not apply automatically. | Keep while pilot units need it; owner decides retirement (whole file + script + test). | Medium (pilot units could lose the OTA path) |
| 4 | 11 | C6 | `otaCertificateSha256` `66046a…` also in `pixel10a-ota-channel.json:12`, `android/signing/os-custody-expected.json`, `android/signing/public/fingerprints.json`; script cross-checks it against custody (line 31). | `scripts/enroll-release-keys.ts` writes only `pixel10a-product.json` and `pixel10a-ota-channel.json`, so this copy is hand-kept. Have the script read the digest from custody (it already compares against it) and drop the key here. | Low |

## Local types and helpers
None in the JSON. Script-side type `Profile` (`stage-os-update-enrollment.ts:8-10`) mirrors this shape.

## Proposed end state
18 lines (drop `legacyOTACertificateSha256`); if #2 is taken, ~12 lines. If the owner retires pilot enrollment, delete this file, `scripts/stage-os-update-enrollment.ts` (69 lines) and `test/os-update-enrollment.test.mjs`.

## Verification
`node --test test/os-update-enrollment.test.mjs`.
