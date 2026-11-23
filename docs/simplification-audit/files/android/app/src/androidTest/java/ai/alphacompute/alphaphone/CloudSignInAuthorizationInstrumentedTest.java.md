# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CloudSignInAuthorizationInstrumentedTest.java
- Lines: 66 | Role: the native "Authorize Alpha Phone" consent dialog gate of upstream `CloudSignInPlugin.requireAuthorization` for authorize/cancel/back/expired/retired, on an isolated `AlphaCloudSignInPlugin`. | Verdict: KEEP (minor)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:192` registry note.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-35, 43, 45 | T5 / D7 | Reaches upstream private internals by reflection: `Class.forName("ai.eliza.auth.cloud.CloudSignInPlugin$Attempt")`, private fields `expiresAt`, `attempt`, `authorized`, `lock`, private `requireAuthorization`, `handleOnDestroy` | The gate belongs to upstream `CloudSignInPlugin`; a test that pins its private field names belongs upstream. Either move it upstream (preferred) or ask upstream for a package-visible test seam; until then keep (it is the only device proof that Cancel/Back never authorize) | Medium: any upstream rename breaks this test silently at runtime |
| 2 | 21 | C3 | `field(type,name)` reflective helper — same in Combined*:25 | Shared `Reflect.field` (only if kept) | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `field` | helper | 21 | CombinedAgent:25, CombinedAgentRestart:25 | `TestReflection.field` |

## Proposed end state
Unchanged behaviour; owner/upstream decision whether this belongs to `vendor/eliza` tests. Estimated 66 -> 66 lines (or 0 here if moved upstream).

## Verification
`--classes CloudSignInAuthorization` (owned disposable profile).
