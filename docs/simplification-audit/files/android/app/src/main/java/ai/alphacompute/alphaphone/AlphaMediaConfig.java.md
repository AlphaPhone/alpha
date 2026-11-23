# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaMediaConfig.java
- Lines: 21 | Role: installed media identities (preferences, cache dir, MediaStore folders, name prefixes) for the shared native media module, plus the owned-video playback path. | Verdict: SIMPLIFY
- Importers: `AlphaPhotosPlugin.java` (MEDIA, PLAYBACK_PATH). Text/path pins: `test/owned-captures-legacy-path.test.mjs` (re-declares the same builder chain including `.legacyCaptures("Pictures/")`), `test/support/feature-parity.mjs`; androidTest `KeptCaptureLegacyPathInstrumentedTest` (asserts `legacyCaptureRelativePaths == ["Pictures/"]`, lines 37-95), `PhotoReplaceInstrumentedTest`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-16 | A1 | `// A scan reserved by an earlier install under Pictures/ is still recovered there.` `.legacyCaptures("Pictures/")`. Package renamed 2026-11-10 (`docs/prd.md:55-58`): a MediaStore row reserved by the old package is not owned by the new one, so the only rows this can find are ones written by early `ai.alphacompute` builds before the DCIM move. | With the owner's P5 decision, drop `.legacyCaptures("Pictures/")` and the comment; delete `KeptCaptureLegacyPathInstrumentedTest` and `test/owned-captures-legacy-path.test.mjs` (which only tests the upstream `OwnedCaptures` lookup). | Medium: a pilot device that kept a scan under `Pictures/` with an early new-package build would see that one keep reported unconfirmed. |
| 2 | 6-12 | A8 | Javadoc narrates history ("These names predate the shared engines", "moved from Pictures/ to DCIM/Camera/ with the camera redesign"). | Keep the list of installed names (they are real persisted identities); drop the history sentences. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `MEDIA` | const | 14-17 | Re-declared verbatim in `test/owned-captures-legacy-path.test.mjs` (javac fixture) | stays here |
| `PLAYBACK_PATH` `"/_alpha_owned_video/"` | const | 19 | check renderer for the same literal when touching video playback | stays here |

## Proposed end state
~17 lines: the builder without `legacyCaptures`, `PLAYBACK_PATH`, a 3-line Javadoc listing the fixed names.

## Verification
`PhotoReplaceInstrumentedTest`, camera/photos Playwright journeys, Android build. If finding 1 is applied, delete the two legacy tests in the same change.
