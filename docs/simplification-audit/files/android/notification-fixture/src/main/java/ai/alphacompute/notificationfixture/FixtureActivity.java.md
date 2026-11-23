# android/notification-fixture/src/main/java/ai/alphacompute/notificationfixture/FixtureActivity.java
- Lines: 34 | Role: synthetic companion app that posts/replaces/cleans five notifications per UUID nonce and counts PendingIntent taps | Verdict: KEEP
- Importers: launched by class name from `android/app/src/androidTest/.../NotificationAccessTestDriver.java:32` (`witness(pkg,nonce,operation)`), driven by `CrossAppNotificationsInstrumentedTest` (`"post"`, `"replace"`, cleanup) which waits for the exact strings `"Posted "+nonce`, `"Cleaned "+nonce` and `"Tapped "+nonce+" count 1"` (`CrossAppNotificationsInstrumentedTest.java:66`). Text/path pins: those UI strings, the channel/tag scheme (`nonce`, ids 1-5, `" 1"`/`" 4"`/`" 5"` title suffixes, `"Canary "+pkg`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-33 | D8 | Whole class is statement soup (`String nonce=…,operation=…;TextView text=…;text.setTextSize(22);setContentView(text);`, 200-char lines). | Formatter pass; split `handle` into `cleanup`, `tap`, `post` methods. | None (fixture). |
| 2 | 32 | B1 | `catch(Exception failure){text.setText("Synthetic fixture unavailable");}` hides the failure cause. The test then times out on "Posted …". | Show `failure.toString()` in the text (or log it) so a failed campaign is diagnosable; keep the catch (fixture must not crash). | None |
| 3 | 17 | C3 | `UUID.fromString(nonce).toString().equals(nonce)` UUID check; same idiom in `MediaFixtureActivity.uuid` (`:27`) and a regex variant in `PrivateSocketProbeService.java:58`. | Separate APKs; leave local (not worth a shared library). | — |
| 4 | 19-20 | — | `getSharedPreferences("receipts",0)` read three times. | Hoist to a local. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| UUID canonical check (inline) | idiom | 17 | `MediaFixtureActivity.java:27` `uuid()`, `PrivateSocketProbeService.java:58` regex | Keep local (separate fixture APKs) |

## Proposed end state
Same behaviour and strings, formatted into four short methods; ~45 physical lines but far fewer characters. No deletion.

## Verification
`node scripts/build-notification-fixture.ts` then `node scripts/test-cross-app-notifications.ts` (runs `CrossAppNotificationsInstrumentedTest` against both flavors) on an emulator.
