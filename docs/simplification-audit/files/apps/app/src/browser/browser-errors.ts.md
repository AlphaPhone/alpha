# apps/app/src/browser/browser-errors.ts
- Lines: 12 | Role: maps native Browser-surface errors to user copy ("Unavailable", "Update WebView"). | Verdict: KEEP
- Importers: 1 (`prototype/browser-adapter.ts`). Text/path pins: `test/browser-errors.test.mjs` (real import, asserts exact copy), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | D11 | File lives in `browser/` but is used by the prototype adapter on Android too (native WebView message). | Move with the `browser/` → `platform/` split (cross-file move, edit feature-parity list). | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `PROFILE_UNSUPPORTED_NATIVE_MESSAGE` | const | 4 | Java string in the Android browser tab host (must stay byte-equal) | keep |

## Proposed end state
Unchanged.

## Verification
`test/browser-errors.test.mjs` (T3 unit test; keep only if no Browser journey covers the "Update WebView" copy).
