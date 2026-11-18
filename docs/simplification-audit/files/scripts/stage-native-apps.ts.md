# scripts/stage-native-apps.ts
- Lines: 130 | Kind: one-off staging tool | Verdict: DELETE
- Covers: verifies three pinned third-party APKs (Organic Maps, Thunderbird, Proton Pass; candidates recorded 2026-09-29) and writes an AOSP `vendor/alphaphone/native-apps` overlay. Duplicates: none. Callers: none. Whole-repo grep finds only a comment in `android/app/src/main/java/ai/alphacompute/alphaphone/PasswordProviderSupport.java:16`. No npm script, workflow, test, spec or doc runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | Unused script with a dated candidate receipt embedded (9-73). | Delete; reword the Java comment to name the pinned publisher certificate it actually checks. | Low |
| 2 | 93-94 | B5 | Self-validates its own constant (`manifest.apps.length !== 3`). | Gone. | — |

## Proposed end state
Deleted. If third-party apps are ever bundled into the image, that belongs in the Pixel 10a composition
(`android/aosp/pixel10a-composition.json`) handled by `stage-aosp.ts`, not a parallel tool.
