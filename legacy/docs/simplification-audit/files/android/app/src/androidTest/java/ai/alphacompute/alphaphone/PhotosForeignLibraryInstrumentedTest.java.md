# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotosForeignLibraryInstrumentedTest.java
- Lines: 69 | Role: read-only witness over another UID's synthetic media catalog (`AlphaPhotos.libraryAccess` / `listPermitted` / `readPermitted`) under full/partial/denied scopes, driven by host-supplied arguments | Verdict: owner decision — wire its campaign or DELETE
- Importers: none. Uses upstream `MediaLibraryKey.parse`. Text/path pins: `scripts/android-instrumentation.ts:255` (`PhotosForeignLibrary: { args: {}, note: "requires an explicit disposable user, separate-UID synthetic ledger…" }`); companion media generator `android/notification-fixture/.../MediaFixtureActivity.java:35-67` writes `alpha-foreign-<run>-*` media.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-39 | A7 / T9 | Gated on `photosForeignAcknowledgement=owned-disposable-alpha-media` plus `photosForeignUser/Run/Scope/Ids/Initial/Count`. Whole-repo grep for `photosForeign`: only this file and the companion fixture activity; no script passes these arguments, and the registry passes `args: {}`. The test is always assumption-skipped. | Owner: add the host campaign (grant/revoke scope, push ledger) or delete the class, its registry entry and `MediaFixtureActivity`'s foreign-media mode. | Medium: it is the only check of partial/denied foreign scope. |
| 2 | 18-28 | C3 | `js`, `call` (bridge await with `{value}|{error}` envelope), `success` — 8th/9th bridge-await copy. | `WebViewTestDriver.nativeCall`. | None. |
| 3 | 23 | B4 | `!"\"null\"".equals(encoded)&&!"null".equals(encoded)` — `JSON.stringify(null)` is `null`; the quoted form cannot occur. | Check `"null"` only. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js`/`call`/`success` | helper | 18-28 | 8 bridge-await copies | `WebViewTestDriver.nativeCall` |

## Proposed end state
Either deleted (0 lines) or kept at ~60 lines with a real campaign script that supplies its arguments.

## Verification
None today (never runs). If wired: the new campaign plus `node --test test/android-instrumentation-runner.test.mjs`.
