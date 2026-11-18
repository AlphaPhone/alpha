# android/aosp/branding/core-launcher/AlphaCoreLauncherPolicy.java
- Lines: 12 | Role: pure predicate (SystemUI `com.android.systemui.qs`) deciding whether the foreground-services manager hides Alpha as the core launcher | Verdict: KEEP
- Importers: `prepare.py:204` copies it into the patch at `packages/SystemUI/src/com/android/systemui/qs/`; used by the patched `FgsManagerController.kt` (prepare.py:51-91) and by `AlphaQsDefaultsPolicy.java:4,12` (`PACKAGE`). Text/path pins: `manifest.json:16-19` `afterSha256` (any byte change requires re-running `prepare.py`, which regenerates `alpha-core-launcher.patch` and `manifest.json`); embedded verbatim in `alpha-core-launcher.patch:18-32`; `specs/quint/application/manifest.json:3945` (`sources`); `specs/quint/refinement/application/os-defaults.mjs:135,148,154,175` (hash-checked against manifest, compiled, predicate matrix); `test_policy.py:139,165`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | C6 | `PACKAGE = "ai.alphacompute.alphaphone"` — same literal in `AlphaSharedStoragePolicy.java:6`, `prepare.py:136,223`, `test_policy.py:56`, `scripts/stage-alpha-os-branding.py:93`. The two Java constants live in different AOSP modules (SystemUI vs services) so cannot share a class. | Keep both Java constants. In `prepare.py` derive the tile string from `manifest/targetAppId` or one module constant (see prepare.py report). | — |
| 2 | 8-11 | D7 | The class exists so the predicate can be tested off-device (javac host test + Quint refinement); in AOSP it could be an inline condition in `FgsManagerController.kt`. | Keep: it is the hash-pinned unit the Quint refinement `os-defaults.mjs` compiles; removing it rewrites the packet, manifest and model for no runtime gain. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `PACKAGE` | const | 6 | `AlphaSharedStoragePolicy.PACKAGE` (:6), `prepare.py:136,223`, `brand.alphaphone.json:5`, `app.config.json` appId | stays (separate AOSP modules) |
| `protects` | helper | 8-11 | Kotlin fake `object AlphaCoreLauncherPolicy` in `test_policy.py:56` | stays |

## Proposed end state
Unchanged, 12 lines.

## Verification
`node --test test/quint-os-application-refinement.test.mjs` (runs `checkOSDefaults`); `python3 scripts/stage-alpha-os-branding.py` plan (verifies patch output hashes). Any edit: re-run `python3 prepare.py --fetch` and commit the regenerated patch + manifest.
