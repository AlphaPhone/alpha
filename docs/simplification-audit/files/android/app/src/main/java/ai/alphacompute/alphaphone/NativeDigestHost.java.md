# android/app/src/main/java/ai/alphacompute/alphaphone/NativeDigestHost.java
- Lines: 41 | Role: Android side of digest source consent/read: validates renderer/runtime requests, binds them to the hosted delivery owner, reads selected calendars and reminders | Verdict: SIMPLIFY
- Importers: `AlphaHostedResultsPlugin`, `AlphaApplication`, `SourceRenewalHost`. Text/path pins: `test/reset-startup.test.mjs`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{NativeDigestTraces.java,native-digest.mjs,native-digest-platform.mjs,source-renewal*.mjs}`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | C4 (P7) / D8 | Constructor packs an anonymous `NativeDigestSources.Storage` adapter onto one 300-char line. | `new NativeDigestSources(store.asSlots(), LOCK)` with the shared slots interface. | Low. |
| 2 | 15, 18-19, 21 | D8 | Lines of 600-900 chars: binding comparison loop, allowed-field set build, consent guard lambda. | Format; extract `requireBinding(binding, expected, exceptionFactory)` used at 15 and 21 (and `NativeDigestSources.current:61`). | Low. |
| 3 | 15, 21 / Sources 61 | C5 | Same 4-field loop `for(String field:new String[]{"ownerId","agentId","installationId","enrollmentId"})` 3× across this file and `NativeDigestSources`. | One `NativeDigestSources.BINDING_FIELDS` + `sameBinding()` helper. | None. |
| 4 | 18-19 | C3 | Exact-key-set validation re-implemented (`request.length()!=allowed.size()` + iterate keys) although `NativeDigestSources.keys(value, expected...)` does the same. | Reuse `keys`. | None (messages differ: keep "Invalid native source request"/"Unexpected native source request field" by passing the messages). |
| 5 | 33, 35 | C3 (P9) | READ_CALENDAR permission check twice in one method (before/after read) — the Calendar permission check has 6 copies (`CalendarSyncBridge:47,219`, `CalendarScopedDeletionReview:24`, `AlphaCalendarPlugin:111`). | Shared `CalendarAccess.requireRead(context, message)`. | None. |
| 6 | 26 | B4 | `if(!"read".equals(request.getString("action")))throw …` — unreachable: `action` was already restricted to read/describe at 18 and describe returned at 25. | Delete line 26. | None. |
| 7 | 30 | B4 | `if(!"evening".equals(template)&&request.has("template"))` re-checks; `NativeDigestSources.read` already rejects templates outside `TEMPLATES`. Keep (it rejects an explicit `"morning"`), but simplify to `request.has("template") && !"evening".equals(...)`. | Clarify. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `LOCK` | const | 8 | — | here |
| anonymous `NativeDigestSources.Storage` | adapter | 11 | 12 slot adapters (P7) | `AlphaCredentialStore.asSlots()` |
| anonymous `NativeDigestSources.Reader` | adapter | 31-38 | — | here |
| binding-field loop | helper | 15, 21 | `NativeDigestSources:61` | `NativeDigestSources.sameBinding` |

## Proposed end state
Formatted ~55 physical lines (logically smaller): constructor with shared slots, `consent()`, `read()` using shared key-set and
binding helpers and one Calendar permission helper. Error messages unchanged.

## Verification
Quint `native-digest.mjs`/`native-digest-platform.mjs` and `source-renewal*.mjs`; `WorkflowPhoneNativeInstrumentedTest`; digest Run-now journey.
