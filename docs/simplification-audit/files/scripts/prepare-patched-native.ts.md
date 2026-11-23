# scripts/prepare-patched-native.ts
- Lines: 95 | Kind: build step (library + CLI) | Verdict: KEEP, SIMPLIFY (delete dormant patch engine)
- Covers: stages the native Android modules listed in `android/upstream-native-sources.json` from the vendor pin into `.eliza/patched-native/<key>` with a receipt; verify-apks checks the packaged receipt. Duplicates: inventory/stamp pattern of `prepare-client-features.ts`. Callers/importers: `android-host.ts:92`, `verify-apks.ts:57,156,228,437`; Gradle/`android/consumer-host.json` paths; Quint native harnesses (`workflow-notice-delivery.mjs` calls `preparePatchedNative`, `settings-handoff.mjs` imports `verifyNativePatchReceipt`, ~20 others reference the staged tree); `materializeNativePatches` imported by tests `speech-output-warmup.test.mjs`, `calendar-sync-mutation.test.mjs`; ~26 host tests reference it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 74 | A4 | The manifest must have `patches.length === 0`; `patches/` does not exist. Lines 43-62 (patch descriptor validation, header matching, `patch --fuzz=0`) and the speech/module-descriptor target rules can never run in production. | Delete the patch path; keep module copy + inventory. Delete tests that exercise patching with synthetic manifests (`native-patch-admission.test.mjs`, `resident-native-patch-admission.test.mjs`, header comments of `*-patch.test.mjs` refer to patches that no longer exist). | low |
| 2 | 72 | B4 | `manifestFile` parameter accepts exactly one value. | Drop parameter. | none |
| 3 | 76, 82 | B5 (2.9) | Cache key and receipt include this script's own bytes. | Key on pin + manifest bytes. Receipt format change must update `verify-apks.ts` and the packaged `assets/native-patches.json` reader. | medium |
| 4 | 40 | D10 | Module allow-list of seven constants plus a regex. | Keep the regex check (manifest is input) as one list. | none |
| 5 | 19-21 | C3 | Inline walker/compare helpers. | Shared fs helpers. | none |
| 6 | 90 | D8 | 400-character line with nested try/catch. | Split. | none |
| 7 | name | D11 | "patched" native with no patches. | Rename to `stage-native-modules.ts` in the structural pass (Gradle, `consumer-host.json`, ~45 references). | medium |

## Proposed end state
~45 lines: read manifest, copy listed modules from the pin into a content-keyed directory, verify inventory and modes, write receipt. Receipt helpers stay for `verify-apks.ts`.
