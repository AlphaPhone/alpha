# scripts/android-abis.ts
- Lines: 18 | Kind: script helper (Android ABI selection, `--abi` parsing) | Verdict: KEEP, SIMPLIFY
- Covers: the two supported ABIs and parsing of repeated `--abi` flags. Duplicates: ABI literals repeated in `isAndroidAbi` (4) and elsewhere (`android-workflow-native.ts:81`). Callers/importers: `android-stage-voice-models.ts`, `paradee-runtime.ts`, `voice-host.ts`; tests `android-build-path.test.mjs`, `paradee-runtime.test.mjs`, `upstream-pin-guard.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | B3 | `!Array.isArray(requested)` on a `readonly string[]` parameter. | Delete the clause. | None |
| 2 | 4 | C6 | `isAndroidAbi` repeats the two literals instead of reading `ANDROID_ABIS`. | `ANDROID_ABIS.includes(value)`. | None |
| 3 | 2 | A8 | Doc comment sits above the type but describes `selectedAndroidAbis`. | Move it. | None |
| 4 | 10-18 | C3 | Own flag parser; callers then parse the rest by hand again. | Fold into the shared `parseArgs` helper (`multiple: true` for `--abi`). | Low |

## Proposed end state
Ten lines: the constant, the type and `selectedAndroidAbis`; `--abi` handled by the shared argument parser.
