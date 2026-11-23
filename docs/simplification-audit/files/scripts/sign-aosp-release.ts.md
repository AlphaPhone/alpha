# scripts/sign-aosp-release.ts
- Lines: 41 | Kind: release CLI binding of an upstream job | Verdict: KEEP, SIMPLIFY (drop test-only re-exports)
- Covers: signs the Pixel 10a target-files zip and builds the OTA with Alpha's descriptors, via upstream `aosp-release-signing.mjs`. Duplicates: none. Callers: no npm script/workflow (manual, documented in header); referenced by `android/aosp/pixel10a-ota-channel.json` description; tests `test/aosp-release-signing.test.mjs`, `test/owner-sign-aosp-release-edges.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-30 | D7 / D4 | Re-exports eight upstream symbols (`X509_KEYS`, `parseSigningArgs`, `channelSigningProblems`, …) only so the two tests can import them from here: those tests exercise upstream code (T5). | Delete the re-exports; keep from the tests only the case(s) that exercise Alpha's binding (Alpha descriptors + composition passed through) and drop upstream-behaviour cases (R6/D14: upstream's own suite owns them). | Low |
| 2 | 35-38 | B2 | `options?.root` on a required parameter; `signRelease` exists for tests only (main uses `signingMain`). | `options.root`; keep the export only if the remaining binding test needs it. | — |
| 3 | 2 | A8 | "(issue #400)" history reference. | Delete. | — |

## Proposed end state
~15 lines: build `{root, ...PIXEL10A_RELEASE, composition}` once and call `signingMain`. One binding
test, no upstream re-tests.
