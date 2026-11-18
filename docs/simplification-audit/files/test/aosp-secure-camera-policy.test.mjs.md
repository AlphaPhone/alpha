# test/aosp-secure-camera-policy.test.mjs
- Lines: 65 | Kind: tooling (test 1, real `assertNoAlphaLockScreenSurface` on a fabricated aapt tree, called by `stage-aosp.ts:255`), upstream function (test 2), source-text (tests 3-4) | Verdict: MERGE test 1 into `test/tooling/aosp.test.ts`; DELETE tests 2-4
- Covers: an APK with lock-screen attributes or a secure-camera intent handler (including via an activity-alias) is refused at image staging. Duplicates: test 2 runs vendor `enforceLauncherLockScreenPolicy`; test 3 restates on source what test 1 enforces on the APK at staging. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-22 | C3 | aapt-tree builders duplicated with `aosp-provisioning-overlay.test.mjs`. | Shared fixture. | none |
| 2 | 38-44 | T5 | Upstream function; only Alpha fact is a boolean in the composition JSON. | Delete. | none |
| 3 | 46-55 | T1 | Regex over manifest and every Java file. | Delete; the gate runs on the built APK at staging. Optionally call `assertNoAlphaLockScreenSurface` from `verify-apks` so both distribution variants are checked at build time. | low |
| 4 | 57-65 | T1 | Regex over `model.js`, `template.html` and `development-system-surfaces.html` for lock-frame Camera affordances. | Delete; if the lock frame must require Unlock, cover it in `journeys/home-shell.spec.ts`. | Low: renderer lock-frame has no other check found. |

## Proposed end state
One case in `test/tooling/aosp.test.ts` ("secure camera manifest policy") with the attribute and action table.
