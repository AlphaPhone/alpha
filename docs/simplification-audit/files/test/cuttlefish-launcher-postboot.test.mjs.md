# test/cuttlefish-launcher-postboot.test.mjs
- Lines: 80 | Kind: tooling (imports `verifyCuttlefishLauncher`, `validateExpectation`, `parseArgs` from `scripts/verify-cuttlefish-launcher.ts`; fake `adb shell` runner) | Verdict: KEEP (MOVE to `test/tooling/aosp.test.ts`)
- Covers: the read-only post-boot image check for a Cuttlefish AOSP build: exact fingerprint, virtual hardware, unlocked foreground user, enforcing SELinux, system-partition APK with expected hash, Alpha as HOME with a real recovery launcher (not Settings FallbackHome), Clock and WebView present, no reboot or state change during observation, no mutating adb verbs. Duplicates: none. Callers/importers: `npm test` glob. The script is imported by `scripts/verify-pixel10a-image.ts` (called from `package.json`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-80 | — | Real script logic with an injected runner: correct shape for release tooling. | Keep. | — |
| 2 | 36, 79 | — | Asserts no `install/uninstall/start/set/grant/reboot` verb is issued: a useful safety property of a device-touching script. | Keep. | — |
| 3 | 38-49, 67-72 | — | Table-driven negatives; fine. | Keep. | — |

## Proposed end state
Unchanged content under `test/tooling/aosp.test.ts` with the other AOSP image tools. Run only when
`scripts/verify-cuttlefish-launcher.ts`, `scripts/verify-pixel10a-image.ts` or the AOSP staging scripts change. Note the
distinction (AGENTS.md): this tests the verifier, not an image boot.
