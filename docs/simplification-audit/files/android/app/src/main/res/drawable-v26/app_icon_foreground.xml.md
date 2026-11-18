# android/app/src/main/res/drawable-v26/app_icon_foreground.xml
- Lines: 5 | Role: adaptive-icon foreground/monochrome layer: `notification_icon` inset 27.5% inside the 108 dp layer. | Verdict: KEEP
- Importers: `drawable-v26/app_icon.xml:4-5` only. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | — | Reuses `@drawable/notification_icon`, so it inherits that file's ~9.3 KB of clipped wordmark path data (see `notification_icon.xml` report). | Fixed by trimming `notification_icon.xml`; nothing to change here. | — |
| 2 | folder | D11 | `-v26` qualifier redundant at minSdk 29. | Move with `app_icon.xml` if that moves. | Low |

## Local types and helpers
None.

## Proposed end state
Unchanged (5 lines).

## Verification
APK build; visual check of launcher icon (themed and non-themed) on emulator.
