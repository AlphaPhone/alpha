# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaNotificationsPlugin.java
- Lines: 62 | Role: Capacitor `AlphaNotifications` registration of the shared notifications host plugin plus Alpha's canonical-tap methods and notice-kind map. | Verdict: SIMPLIFY
- Importers: Registered in `MainActivity`; `AlphaCanonicalNotifications.java:185` calls `canonicalTapReady()`; renderer `apps/app/src/prototype/notifications-adapter.ts` (`canonicalPending`, `acknowledgeCanonical`, `canonicalNotificationTap`). Text/path pins: `specs/quint/{application,native}/manifest.json`; `specs/quint/refinement/{application/canonical-notification-tap-admission,native/canonical-notification-tap,canonical-tap-platform,workflow-notice-delivery,workflow-notice-platform}.mjs`, `CanonicalTapTraces.java`, `WorkflowNoticeTraces.java`; `test/canonical-notification-security.test.mjs`, `test/context-selection.test.mjs` (regex on `kind`), `test/plugin-worker-guard.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41 | C4/C1 | `noticeStorage(){AlphaCredentialStore store=...;return new NoticeDelivery.Storage(){read..write..};}` - one of ~12 anonymous slot adapters. | Replace with `AlphaCredentialStore.asSlots()` (or `store::readCredentialSlot` lambdas if `NoticeDelivery.Storage` becomes a functional pair upstream). | low |
| 2 | 20-21, 35-36 | D3 | `private static WeakReference<AlphaNotificationsPlugin> canonicalLive` used as a service locator by `AlphaCanonicalNotifications`. | Keep until D3 refactor; then have `AlphaCanonicalNotifications` own a listener registration instead of a static reference into the plugin. | medium (tap wake-up timing) |
| 3 | 3, 20, 41 | D8 | Wildcard import + fully-qualified `java.lang.ref.WeakReference` inline twice; one-line anonymous class. | Formatter pass; import `WeakReference`. | none |
| 4 | 54-61 | C6 | `kind(channel)` compares against channel constants of four owners; mirrors renderer `context-selection.ts noticeReviewable`. | Keep (wire values `hosted-result`/`workflow`/`reminder`/`navigation`/`other` are a renderer contract). | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| kind | helper | 54-61 | Renderer twin `apps/app/src/prototype/context-selection.ts` noticeReviewable (kind strings) | stay |
| noticeStorage adapter | anon class | 41 | AlphaReminders:20-27, AlphaTelephony:27-33, HostedDelivery:15, GmailBackground:19-25, NativeDeletionCoordinator, SourceRenewalHost, WorkflowNoticeTapsFactory | `AlphaCredentialStore.asSlots()` |

## Proposed end state
Same methods; slot adapter becomes one call; imports cleaned. ~58 lines. Estimated lines after: 58.

## Verification
`test/canonical-notification-security.test.mjs`, Quint canonical-tap refinements, `scripts/test-canonical-notification-navigation.ts`.
