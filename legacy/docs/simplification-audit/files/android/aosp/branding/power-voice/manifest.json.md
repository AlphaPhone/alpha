# android/aosp/branding/power-voice/manifest.json
- Lines: 29 | Role: Admission record for the power-voice patch: revision, patch hash, required system-entry patch hash, required app component, per-file before/after hashes. | Verdict: DELETE with packet / else SIMPLIFY
- Importers: none (No script, test, workflow, spec or staging step reads any file in `power-voice/` (`git grep power-voice` / `alpha-protected-power-voice` / `requiresAppliedSystemUIPatchSha256`: 0 hits outside the directory; `scripts/stage-alpha-os-branding.py` does not stage it). The packet has no fetch, prepare or apply tool of its own.). Same shape as `system-entry/manifest.json`, so `system-entry/apply.py --manifest` can consume it, but no doc or script says so.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-13 | A4 / NEW (contradiction) | `requiresProtectedAppComponent.exported: true` while the app ships the component `exported="false" enabled="false"` (`AndroidManifest.xml:129`). Nothing checks this requirement. | Delete with packet. If kept, have `scripts/apk.ts` (which already checks the permission at :89,145) be the only place that states the component contract, and drop it here. | Owner decision. |
| 2 | 7 | C6 | `requiresAppliedSystemUIPatchSha256` repeats `system-entry/manifest.json:6` `patchSha256` (58e75d2a...); any system-entry regeneration must update it by hand. | If kept, replace with `"requires": "../system-entry/manifest.json"` and let the apply tool read the hash. | Low. |
| 3 | 26-28 | B5 | `sourceOnly`, `compiled`, `deviceQualified` status flags, read by nothing. | Delete. | None. |

## Local types and helpers
None.

## Proposed end state
Deleted, or ~18 lines (revision, patch, hash, files, requires).

## Verification
None in CI.
