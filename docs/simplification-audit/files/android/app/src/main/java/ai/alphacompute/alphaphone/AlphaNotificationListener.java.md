# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaNotificationListener.java
- Lines: 9 | Role: Installed component name for the shared notification-mirror listener service. | Verdict: KEEP
- Importers: Manifest only (+ proguard keep, `scripts/apk.ts`). Text/path pins: `android/app/proguard-rules.pro`; `scripts/apk.ts`; `scripts/test-cross-app-notifications.ts`; `specs/quint/application/{README.md,manifest.json}`; androidTest `CrossAppNotificationsInstrumentedTest`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | D4 | One override `mirror(){return NotificationAccess.MIRROR;}` - a config hook, not empty. | Keep (component identity is in the manifest and system notification-access grant). | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| - | - | - | - | - |

## Proposed end state
Unchanged, 9 lines. Estimated lines after: 9.

## Verification
Cross-app notification campaign only.
