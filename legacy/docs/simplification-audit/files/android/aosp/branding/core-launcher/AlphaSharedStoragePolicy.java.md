# android/aosp/branding/core-launcher/AlphaSharedStoragePolicy.java
- Lines: 13 | Role: pure predicate (services `com.android.server.pm.permission`) for the primary-user MANAGE_EXTERNAL_STORAGE app-op factory default | Verdict: KEEP
- Importers: `prepare.py:206`; patched `DefaultPermissionGrantPolicy.java` `grantAlphaSharedStorageDefault` (prepare.py:156-183). Text/path pins: `manifest.json:40-44`; embedded in `alpha-core-launcher.patch:233-248`; `specs/quint/application/manifest.json:3947`; `os-defaults.mjs:140,148,154,175`; `test_policy.py:176-186`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | C6 | `PACKAGE` duplicates `AlphaCoreLauncherPolicy.PACKAGE` (different AOSP module). | None. | — |
| 2 | 10 | B3 | `userId == 0` is also checked by the only caller (`if (userId != UserHandle.USER_SYSTEM) return;`, prepare.py:157). | Keep: the predicate is the formal unit Quint checks; dropping the parameter rewrites the model matrix (`os-defaults.mjs:140`). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `PACKAGE` | const | 6 | `AlphaCoreLauncherPolicy.PACKAGE` | stays |
| `shouldGrant` | helper | 8-12 | inline expected expression in `test_policy.py:179`, `os-defaults.mjs:140` | stays |

## Proposed end state
Unchanged, 13 lines.

## Verification
`node --test test/quint-os-application-refinement.test.mjs`; re-run `prepare.py` after edits.
