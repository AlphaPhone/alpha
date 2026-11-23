# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaGmailPlugin.java
- Lines: 40 | Role: Capacitor bridge `AlphaGmail` for the shared background new-mail check (`MailBackgroundDelivery`), with tap capture from notification intents. | Verdict: SIMPLIFY
- Importers: `MainActivity.java:354`; renderer `apps/app/src/runtime/gmail-background.ts:8` (via upstream `createMailBackground`). Text/path pins: `test/gmail-background-binding.test.mjs:18-46` (regex on `@CapacitorPlugin(name="AlphaGmail")`), `test/gmail-lifecycle-custody.test.mjs:4` (reads and transplants the source), `test/support/feature-parity.mjs:61`, `specs/quint/native/manifest.json:3006`, `specs/quint/refinement/native/GmailBackgroundTraces.java:25,324,360,365` (reflects on private field `io`), `gmail-background-platform.mjs:7`, `gmail-background.mjs:66`; browser fixture `test/browser/helpers/delivery-fixture.ts:28`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31 | A7 | `notificationSettings` opens the Gmail channel settings. Upstream `MailBackground` (`.eliza/client-features/plugins/plugin-inbox/src/mailbox/background-notices.ts:166`) exposes it, but Alpha's wrapper `apps/app/src/runtime/gmail-background.ts` never re-exports or calls `background.notificationSettings` (grep apps/: 0 callers). | Delete the method (1 line) unless the owner wants a "Gmail notification settings" entry in Settings. | Low; renderer cannot reach it today. |
| 2 | 22 | C4, P8 | `foreground()` = activity non-null, not finishing/destroyed, `hasWindowFocus`, `!isDeviceLocked` — the same expression as `AlphaHostedResultsPlugin.java:37` and a subset of `AlphaDevicePlugin.shareForeground` (`AlphaDevicePlugin.java:30-35`). | Replace with the shared `OwnerSurface.check(activity, requireFocus)` helper proposed in research P8. | Medium: each variant differs slightly; keep this exact predicate as the helper's default. |
| 3 | 17-21 | C3, P10 | Per-plugin `interface Work {JSObject run()throws Exception;}` + two `submit` overloads, twins of `AlphaDeletionsPlugin.Task`, `AlphaFilesPlugin.StorageWork`, `AlphaLocalAgentPlugin.ProviderChange`. | Use one base helper `background(call, Callable<JSObject>, refused)` (research P10). | low |
| 4 | 33-34 | B1, P10 | Raw `try{io.execute(...)}catch(RejectedExecutionException ignored){}` (twice) and `catch(Exception ignored){/* A newer intent keeps custody... */}`. Bypasses `PluginWorkers.submit`, which exists for exactly this. | Use `PluginWorkers.submit(io, task, () -> {})`; keep the documented retain-on-failure catch (it is the specified behaviour) but name it. Note `test/plugin-worker-guard.test.mjs` does not list `AlphaGmailPlugin`; add it once converted. | low |
| 5 | 25, 28-30 | D8 | `configure`, `pending`, `consume`, `releaseQuestion` packed on one line each with repeated `if(!foreground()){call.reject("Unlock Gmail to continue");return;}long epoch=lifecycle;`. | Extract `long admitForeground(PluginCall call, String message)` returning -1 on refusal; format. | low |
| 6 | 4-9 | D8 | Wildcard imports (`android.content.*`, `com.getcapacitor.*`, `java.util.concurrent.*`). | Explicit imports on formatter pass. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Work` | interface | 17 | `AlphaDeletionsPlugin.Task`, `AlphaFilesPlugin.StorageWork`, `AlphaLocalAgentPlugin.ProviderChange`, `HostedDelivery.NativeSourceWork` | base-plugin `background(call, Callable<JSObject>)` |
| `submit(call,work[,refused])` | helper | 18-21 | `AlphaHostedResultsPlugin.submit`, `AlphaMailAttachmentsPlugin.work`, `AlphaFilesPlugin.storage` | same base helper |
| `foreground()` | helper | 22 | `AlphaHostedResultsPlugin.sourceForeground` check, `AlphaDevicePlugin.shareForeground`, `AlphaLocalAgentPlugin.requireProviderOwner`, `AlphaKeyboardDictationService.allowedNow` | `OwnerSurface` util |

## Proposed end state
~30 lines after formatting-neutral cleanup: no `notificationSettings`, no local `Work`/`submit`, foreground check from `OwnerSurface`, all dispatch via `PluginWorkers.submit`. Tap capture (`capture`, `retained`/`latest`) and lifecycle epoch stay.

## Verification
Quint `gmail-background.mjs` refinement (`GmailBackgroundTraces` reflects on field `io` — keep the field name or update the trace), `test/gmail-background-binding.test.mjs`, `test/gmail-lifecycle-custody.test.mjs`, browser delivery-fixture journeys, Android build.
