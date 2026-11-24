# test/aosp-provisioning-overlay.test.mjs
- Lines: 69 | Kind: tooling (renders overlay from a fabricated `aapt dump xmltree`) + source-text (line 44, test 4) | Verdict: MERGE tests 1-3 into `test/tooling/aosp.test.ts`; DELETE test 4 and line 44
- Covers: provisioning components (HOME, assistant, Autofill) are read from the APK manifest tree and must be unique; MANAGE_EXTERNAL_STORAGE is required; the overlay sets defaults additively without removing Launcher3. Duplicates: none for the renderer; `test/aosp-product-lock.test.mjs` test 3 exercises the `--production` gate by execution. Callers/importers: `npm test`; imports `scripts/aosp-provisioning-overlay.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-27 | C3 | aapt xmltree builders (`str`, `element`, `filter`, `tree`) duplicated in `test/aosp-secure-camera-policy.test.mjs:10-22`. | Shared `test/fixtures/aapt-tree.mjs`. | none |
| 2 | 44 | T1 | Regex over the committed main manifest. | Delete (`verify-apks` sees the built manifest; `provisioningComponents` refuses a tree without the permission). | none |
| 3 | 64-69 | T1 | Regexes over `scripts/stage-aosp.ts` text. | Delete. | none |

## Proposed end state
Three cases in `test/tooling/aosp.test.ts` ("provisioning overlay") on the shared aapt-tree fixture.
