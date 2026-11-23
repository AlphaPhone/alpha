# test/apk-alpha-power-policy.test.mjs
- Lines: 37 | Kind: tooling (release gate `distributionProblems` in `scripts/apk.ts`, used by `scripts/verify-apks.ts:185`) | Verdict: MERGE into `test/tooling/apk-verify-audit.test.ts` (together with apk-alpha-tile-policy and apk-keyboard-dictation)
- Covers: a release APK admits `AlphaPowerVoiceActivity` only as an activity protected by `STATUS_BAR_SERVICE`, and the platform permission does not admit other exported components. Duplicates: none. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-17 | C5 | The aapt manifest template (package, allowBackup, cleartext, networkSecurityConfig, badging, licence names) is copied in three files (power, tile, keyboard). | One `releaseManifest({components, home})` builder in the merged file. | none |
| 2 | 19-37 | - | Real release-gate cases. | Keep as table rows. | none |

## Proposed end state
Rows in one "exported component policy" table in `test/tooling/apk-verify-audit.test.ts`.
