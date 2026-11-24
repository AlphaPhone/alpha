# android/aosp/branding/core-launcher/manifest.json
- Lines: 59 | Role: generated record of the core-launcher patch: revision, target app id, patch hash, per-file before/after hashes and status booleans | Verdict: SIMPLIFY
- Importers: `scripts/stage-alpha-os-branding.py:52-78` (`revision`, `project`, `patch`, `patchSha256`, `files`), `:92` (`targetAppId`), `:191` (whole-file hash recorded in the staging record as `corePolicyManifestSha256`); `specs/quint/refinement/application/os-defaults.mjs:148,153-155`; `test_policy.py:189-196`; `system-entry/apply.py --manifest` (README). Written by `prepare.py:222-226`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 52-58 | B5 | `"compilation": "pending", "imageBuilt": false, "deviceQualified": false, "ownerCustomLayoutsPreserved": true, "ownerExplicitStorageModesPreserved": true, "appPrivateStorageGranted": false, "crashRecoveryAndVoiceControlsChanged": false` — constant claims with no reader (git grep each key: only this file and `prepare.py:224-226`). | Delete the seven keys here and in `prepare.py:224-226`. Changes the file hash recorded in staging records (`corePolicyManifestSha256`) — informational only. | Low |
| 2 | 5 | C6 | `"targetAppId": "ai.alphacompute.alphaphone"` hard-coded in prepare.py:223 and re-checked by stage script :93 against another literal (B3: our own constant validated by our own script). | Keep `targetAppId` (stage script reads it); replace stage script literal with `app.config.json` appId. | Low |

## Local types and helpers
None.

## Proposed end state
~51 lines: schema, project, revision, targetAppId, patch, patchSha256, files.

## Verification
Re-run `python3 prepare.py --fetch` (regenerates); `node --test test/quint-os-application-refinement.test.mjs`; `python3 test/aosp-fresh-presets.test.py`.
