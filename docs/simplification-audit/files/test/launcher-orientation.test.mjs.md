# test/launcher-orientation.test.mjs
- Lines: 18 | Kind: source-text (regex over launcher/standalone `AndroidManifest.xml`, `app.config.json` field) | Verdict: DELETE
- Covers: launcher activities are portrait-locked with `tools:replace`; standalone keeps the shared orientation. Duplicates: `android/app/src/androidTest/.../RotationInstrumentedTest.java:49-50` asserts on device that the launcher stays portrait; `test/browser/home-landscape.spec.ts` covers the renderer side. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-13 | T1 | Regex requires attribute order `android:name` … `screenOrientation` … `tools:replace` on one line. | Delete. If a host gate is wanted, check `screenOrientation` in the merged manifest of the built launcher APK in `scripts/apk.ts` `distributionProblems` (it reads aapt xmltree already; no orientation rule there today). | Low |
| 2 | 15-18 | T1 | Absence check on the standalone manifest. | Delete. | Low |

## Proposed end state
File deleted. Device evidence stays `RotationInstrumentedTest`; optionally one rule in the APK audit.
