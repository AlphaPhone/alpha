# test/sense-packaging-ndk.test.mjs
- Lines: 51 | Kind: source-text (regex over `android/sense/build.gradle` and two `vendor/eliza` Gradle files) + toolchain check (runs the Linux NDK `llvm-strip`, skipped when that NDK path is absent, i.e. on macOS and most CI hosts) | Verdict: DELETE
- Covers: Sense packaging uses the shared consumer NDK selection with no override, and that NDK's normal strip reproduces the libc++_shared.so bytes recorded in `android/voice-host/qualified-voice-host.json`. Duplicates: Gradle `:app:verifyVoiceHost` (distribution build) and `scripts/verify-apks.ts` admit packaged libraries against the same descriptor. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-28 | T1 | Regexes three Gradle lines and the absence of `ndkVersion` / `keepDebugSymbols`; reads `vendor/eliza` text. | Delete; the build-output check is the real gate. | Low |
| 2 | 30-51 | T9 | Second test is permanently skipped on hosts without `<sdk>/ndk/<ver>/toolchains/llvm/prebuilt/linux-x86_64`; it re-derives a fact the packaged-APK admission already verifies. | Delete. | Low |
| 3 | 7, 47-48 | C3 | Local sha256 helper. | Goes with the file. | Low |

## Proposed end state
File deleted. If the owner wants the "raw STL is never admitted" rule kept, it belongs in `verify-apks` / `verifyVoiceHost`
(compare packaged `libc++_shared.so` digest with the descriptor), which already runs on the real APK.
