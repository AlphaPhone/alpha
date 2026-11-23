# scripts/build-pinned-voice.ts
- Lines: 58 | Kind: manual build tool (wrap upstream `paradee-voice/build-native.ts`, attest source revision on its build record) | Verdict: DELETE (with `test/pinned-voice-build.test.mjs`), unless the owner still runs it by hand
- Covers: building the on-device voice libraries from the pinned upstream with clean-source provenance stamped into `build-record.json`. Callers/importers: **none outside its test** (`git grep build-pinned-voice`: only `test/pinned-voice-build.test.mjs`); README documents staging voice outputs via `scripts/android-stage-voice-models.ts --from <directory>` (README:85), not this builder; no npm script or workflow. Duplicates: streamed sha256 (C3, `update-artifact.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | Unreferenced manual tool; its only test exercises it with injected stubs (T3). | Delete script and test. If voice outputs are still built locally, document the upstream command in README instead. | Low: owner confirm (research marks "manual tool"). |
| 2 | 31-34, 46-54 | B3/B5 | Symlink-walk checks and re-hash of every output file the upstream builder just wrote. | Moot if deleted. | - |

## Proposed end state
Deleted. Voice outputs keep arriving through `android-stage-voice-models.ts --from` (which verifies the bytes it stages).
