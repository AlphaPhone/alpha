# android/app/src/main/res/drawable-v26/app_icon.xml
- Lines: 6 | Role: adaptive launcher/splash icon (blue background colour, inset silhouette foreground, themed-icon monochrome layer). | Verdict: KEEP
- Importers: `AndroidManifest.xml:84` (`android:icon`/`android:roundIcon="@drawable/app_icon"`), `values/styles.xml:13` and `values-night/styles.xml:12` (`windowSplashScreenAnimatedIcon`). Text/path pins: none (grep `drawable-v26`: 0 hits outside this folder).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | folder | D11 | `minSdk` is 29 (`android/consumer-host.json:6`), so the `-v26` qualifier always matches; this file is the only `app_icon` any supported device resolves, and the unqualified `drawable/app_icon.xml` is shadowed (see that report). | If the unqualified vector moves out to the AOSP packet, move this file (and `app_icon_foreground.xml`) to `drawable/`. | Low (resource name unchanged) |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `@color/alpha_launcher_background` ref | const | 3 | Same `#0000FF` literal as `colorAccent` in both `styles.xml` | `values/colors.xml` brand colour |

## Proposed end state
Unchanged content (6 lines); optionally relocated to `res/drawable/` once the legacy vector is gone.

## Verification
APK build (`npm run android:build:local`), launcher icon and splash visible on emulator HOME-role run; `verify-apks` badging.
