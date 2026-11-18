# android/app/src/main/res/drawable/notification_icon.xml
- Lines: 5 (24.5 KB) | Role: alpha-only Alpha Compute silhouette used as the small icon of every Alpha notification and as the adaptive-icon foreground. | Verdict: SIMPLIFY
- Importers: `consumer-host.json:140` (`residentHost.notification.smallIcon` → generated `ElizaAgentService`), `AndroidManifest.xml:94` (tile icon), `AlphaQuickSettingsTile.java:36`, `GmailBackground.java:13`, `HostedNoticePoster.java:29,49,51`, `WorkflowNoticePoster.java:13`, `launcher/AlphaSmsRole.java:14`, `drawable-v26/app_icon_foreground.xml:4`.
  Text/path pins: `test/alpha-system-entry.test.mjs:17,107` (`R.drawable.notification_icon` stub, `.setSmallIcon(R.drawable.notification_icon)` in generated source), `test/android-host.test.mjs`, `test/gmail-background-lock-contention.test.mjs`, Quint `assistant-entry-platform.mjs`, `gmail-background-platform.mjs`, `source-renewal-platform.mjs`, `WorkflowNoticeTraces.java` (all stub the R id; none read this file's bytes).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | A7 / NEW (dead vector geometry) | `viewportWidth="120"` plus `<clip-path android:pathData="M0,0H120V120H0Z"/>`, yet the path carries 17 wordmark sub-paths from `M226.53,99.56c1.72-1…` to the end (x 156-470): 9,299 of 24,140 path bytes are outside the viewport and never drawn. | Truncate pathData before `M226.53,99.56`; delete the `clip-path` (line 3). Rendering unchanged, parse/inflate cost lower for every notification. | Low (no byte pin on this file; visual check) |
| 2 | 4 | C6 | Same 24 KB path duplicated byte-for-byte in `drawable/app_icon.xml:7`. | After `app_icon.xml` moves to the AOSP packet only one app copy remains. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| silhouette `pathData` | const | 4 | `drawable/app_icon.xml:7` | here (single app copy) |

## Proposed end state
4 lines, ~15 KB: the vector header, one `<path>` with only the silhouette sub-paths, no clip-path.

## Verification
APK build; screenshot any notification (Workflow notice, resident runtime notification) and the launcher icon on emulator to confirm identical rendering.
