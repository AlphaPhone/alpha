# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserStorageFormatInstrumentedTest.java
- Lines: 75 | Role: pins the persisted bookmark/session AES-GCM format with an independent codec and real Keystore | Verdict: KEEP
- Importers: none. Run by `scripts/test-browser-storage-format.ts:14` (`disposableBrowserStorageFixture=1`), listed in `CAMPAIGN_RUNNERS` (`scripts/android-instrumentation.ts:315`). Text/path pins: that script (class name + argument).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27, 50, 53, 72 | C6 (intentional) | `"alpha-browser-bookmarks","alpha-browser-session"` and `+"-v1"` duplicate `AlphaBrowserStores.BOOKMARK_PREFERENCES/BOOKMARK_KEY_ALIAS/SESSION_*` (main `AlphaBrowserStores.java:44-45`). | Keep the literals: a format pin must not read the constants it pins (comment line 28 says so). | — |
| 2 | 23-24 | A1 (check) | "Installed storage-format contract" — this pins the *current* writer's format (bookmarks `sealed`, session `sealed`+`permissions`), which A1 says to keep byte-for-byte. No legacy reader is exercised. | none | — |
| 3 | 315 of `scripts/android-instrumentation.ts` | A8 | The runner entry is annotated "Added on main while the reachability check was being written". | Drop that comment in the runner. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `encode/decode/create` | helpers | 29-42 | upstream shared codec (intentionally not used) | keep |

## Proposed end state
Unchanged (75 lines). Only the runner comment changes.

## Verification
`node scripts/test-browser-storage-format.ts` on a disposable user.
