# test/canonical-notification-security.test.mjs
- Lines: 132 | Kind: Java transplant (slices `@PluginMethod` bodies out of `AlphaConnectionPlugin.java`, `AlphaNotificationsPlugin.java` and two static methods out of `AlphaCanonicalNotifications.java` by `indexOf`, splices them into inline fake classes, compiles with host `javac` and runs) | Verdict: REWRITE as Robolectric/JVM unit-free integration in the Android `test` source set (`CanonicalNotificationBoundaryTest.java`), or DELETE if the Gradle JVM lane is not adopted
- Covers: renderer secure-slot methods refuse every `canonical-notification-owner*` slot; canonical pending/ack recheck foreground after queueing; acknowledgment keeps an undispatched tap and never re-posts an ambiguous mark-read; a tap captured at the system level expires five minutes after the tap. Duplicates: `test/quint-canonical-notification-tap-refinement.test.mjs` and `-admission` (native slot custody and acknowledgement, 9 traces) overlap cases 3; no other coverage of cases 1, 2 and 4. Callers/importers: `npm test` glob only; uses `test/fixtures/jvm-tools.mjs` (`nativeSource`, `upstreamConnection`, `javaBinary`, `jsonJar`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 55, 104 | T2/T10 | Bodies cut at `'@PluginMethod public void '+name+'('` … `'\n }'`, `' static void acknowledge('` … `'\n }\n}'`, `' static void captureTap('` … `' static JSONObject pending()'`. Any reformat (D9 Java) breaks all four tests. | Delete the slicing. | Medium: this is the only proof that renderer slots cannot touch the native notification owner. |
| 2 | 16-19, 37-42, 57-73, 106-118 | T3 | Hand-written fakes of `PluginCall`, `JSObject`, `AlphaCredentialStore`, `Intent`, `SystemClock`, `AlphaLocalAgentPlugin`: the real classes are replaced, so only the sliced statements are real. | In the Gradle JVM source set, call the real plugin methods with Robolectric or a narrow seam (`RendererCredentialSlots.admit(slot)` is already a pure class and can be called directly). | Medium |
| 3 | 9 | - | `assert.ok(jsonJar, …)` refuses rather than skips without the pinned JSON jar. | Keep the no-skip stance in the Gradle test. | - |
| 4 | 9 | - | Four `javac` + `java` runs, ~3-6 s. | - | - |

## Proposed end state
Host file deleted. One Gradle JVM test (run by `android.yml`) covers: (a) `RendererCredentialSlots` refuses
`canonical-notification-owner`, `:v1`, `:v99:future` for read/write/remove/CAS and admits ordinary slots; (b) tap
age window 5 min from capture. Foreground recheck and acknowledgment custody stay with the native Quint refinement
(extend its harness with the "locked after queue" trace if it is not already a trace). Owner question: adopt the
Gradle JVM lane for security-boundary tests, or accept losing (a) and (b).
