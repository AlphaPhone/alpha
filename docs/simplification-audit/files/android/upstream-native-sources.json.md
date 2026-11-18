# android/upstream-native-sources.json
- Lines: 23 | Role: list of upstream native modules staged (authenticated, from the pinned commit) into `.eliza/patched-native/<hash>` for Gradle, plus a now-empty patch list | Verdict: KEEP (note the empty patch machinery)
- Importers: `scripts/prepare-patched-native.ts:9` (`NATIVE_SOURCE_MANIFEST`), `scripts/quint-lib.ts:119`, `scripts/source-snapshot.ts`, `scripts/ci/calendar-bridge.py`, `android/consumer-host.json:119` (input list). Text/path pins: `specs/quint/native/manifest.json`, `specs/quint/services/manifest.json`, ~22 `specs/quint/refinement/native/*.mjs` files (`const nativeManifest='android/upstream-native-sources.json'`), `specs/quint/refinement/services/sign-in-coordinator.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-21 | — | Every listed module is consumed: 13 as `patchedNative` modules in `consumer-host.json:25-36`, `packages/app/platforms/android/sense` by `sense/build.gradle`, `plugin-local-inference/native/android` by `local-speech/build.gradle`, `elizavoice-jni` and `browser-surface/resources` by scripts. | Keep. | — |
| 2 | 22 | A7 / NEW | `"patches": []` — no local patch remains, yet `scripts/prepare-patched-native.ts:28-60 (`materializeNativePatches` patch loop)` keeps the whole patch-application/validation path (headers, before/after digests, symlink checks) and modules/dirs are still called "patched". AGENTS.md says shared changes go upstream. | Owner: drop the `patches` key and the patch branch in `prepare-patched-native.ts` (and its tests); keep the authenticated staging. Renaming `patchedNative` → `stagedNative` would touch consumer-host and generator; leave the name. | Low; re-adding a patch would restore code from git. |

## Local types and helpers
`type PatchManifest` in `scripts/prepare-patched-native.ts:22-27` and the `readJson<{modules?,patches}>` shape in `scripts/quint-lib.ts:119` describe this file twice (C1).

## Proposed end state
`{ "schema": 1, "modules": [ …17 entries… ] }` (22 lines) once patch support is removed; otherwise unchanged.

## Verification
`node scripts/prepare-patched-native.ts`; `npm run verify` (Quint native refinement reads the manifest); `npm run android:build:local`.
