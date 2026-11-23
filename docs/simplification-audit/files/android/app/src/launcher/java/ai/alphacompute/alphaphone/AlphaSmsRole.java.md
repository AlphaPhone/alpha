# android/app/src/launcher/java/ai/alphacompute/alphaphone/AlphaSmsRole.java
- Lines: 17 | Role: Alpha's installed identity for the shared SMS-role components: notice channel, MMS result actions, file-provider authority, component classes. | Verdict: KEEP
- Importers: 5 — the five SMS-role subclasses in this folder. Text/path pins: none outside `android/app/src/launcher` (grep `AlphaSmsRole`: 0 hits in test/, specs/, scripts/).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | C6 | Action strings `"ai.alphacompute.alphaphone.MMS_DOWNLOADED"`/`MMS_RESPONSE_SENT` hard-code the package while the authority uses `BuildConfig.APPLICATION_ID`. | Optional: build both from `BuildConfig.APPLICATION_ID` for one source of the package name. | Low (installed action names; keep values identical). |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CONFIGURATION` | const | 13-16 | `AlphaTelephony.CONFIGURATION` (main) is its first argument | here |

## Proposed end state
Unchanged (17 lines). A manifest component needs a concrete class in Alpha's package; this one only supplies Alpha's configuration hook (P17 explicitly keeps one-method config subclasses). PRD AP-08 makes Phone/SMS P0 on the AOSP image.

## Verification
`test/aosp-image-capability.test.mjs` (component list, line 238), `test/verify-apks.test.mjs` (line 357), `scripts/apk.ts` built-APK audit; Android build of the launcher flavor.
