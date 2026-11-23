# android/app/src/androidTest/java/ai/alphacompute/alphaphone/InboxFixtureConnection.java
- Lines: 46 | Role: test-APK stand-in for `AlphaConnection`: forwards secure-slot methods to a real `AlphaConnectionPlugin` and answers a closed synthetic Cloud/Gmail protocol. | Verdict: KEEP (minor SIMPLIFY)
- Importers: `InboxFixtureActivity`, `InboxDraftInstrumentedTest`, `InboxFixtureSignIn`, `VoicePermissionDeniedInstrumentedTest`. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | B4 | `static final String OWNER=InboxFixtureScope.runId` captures `runId` at class init; works only because the scope is set before the plugin class loads. | Read `InboxFixtureScope.runId` where used (L36) instead of a static copy. | Low |
| 2 | 12 | - | `static int rejectedWrites` mutated from Capacitor threads, read from the test thread without `volatile`/atomic. | `AtomicInteger`. | Low |
| 3 | 38-40 | D8 | Long single-line JSON builders. | Split when touched. | None |
| 4 | 16-19 | D4 | Four forward methods to the real plugin — required: Capacitor exposes only annotated methods of the registered class. | Keep. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `token()` | helper | 21 | used by `InboxFixtureSignIn`, `VoicePermissionDeniedInstrumentedTest` | keep |
| `LOGIN` uuid literal | const | 10 | `InboxFixtureSignIn.ATTEMPT` similar literal | keep |

## Proposed end state
Same class; `rejectedWrites` atomic, `OWNER` read lazily. About 46 lines.

## Verification
Inbox draft campaign (`scripts/test-native-restart.ts`) and `VoicePermissionDenied` campaign.
