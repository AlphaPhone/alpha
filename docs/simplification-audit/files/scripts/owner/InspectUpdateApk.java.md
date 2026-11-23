# scripts/owner/InspectUpdateApk.java
- Lines: 86 | Kind: release/update tooling (single-file Java program run with `java -cp apksigner.jar`) | Verdict: KEEP, MOVE out of `owner/` (D11)
- Covers: read-only APK identity for app-update admission: digest pin, package, versionCode, targetSdk >= 35, not debuggable, and one verified signer with the same active signer / lineage root / lineage across API 29-37. Duplicates: `require`, SHA-256 hex, `FileChannel` digest loop are twins of `VerifyApkRotation.java:18-40`. Callers/importers: `scripts/update-apk-admission.ts:18` (production update admission path); listed in `scripts/quint-lib.ts:37` (`runtimeScriptPaths`, so a change here marks Quint models touching update admission as affected).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | path | D11 | Lives in `scripts/owner/` (owner incident tools) but is part of the release/update pipeline. | Move with `VerifyApkRotation.java` to `scripts/apk/` (or next to `update-apk-admission.ts`); update `update-apk-admission.ts:18` and `quint-lib.ts:37`. | Low |
| 2 | 16-30 | C3 | Same helpers as `VerifyApkRotation.java`. Single-file source launch cannot import a sibling class. | Accept the duplication, or merge both programs into one `ApkIdentity.java` with `inspect` / `rotation` subcommands (one copy of helpers). | Low |
| 3 | 81 | B5 | Re-hashes the file after verification ("changed during identity verification"); the file is opened once with NOFOLLOW and read through the same channel. | Keep: cheap, and the input is an untrusted downloaded APK. | — |
| 4 | 82-83 | — | Hand-built JSON via `printf`; values are validated hex/package names, so no escaping issue. | Keep. | — |

## Proposed end state
Same program, relocated beside the update admission code (optionally merged with `VerifyApkRotation.java` into one APK identity tool with two modes).
