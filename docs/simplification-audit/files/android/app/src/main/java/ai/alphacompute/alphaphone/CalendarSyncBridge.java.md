# android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncBridge.java
- Lines: 232 | Role: Native owner of Google Calendar linked sync: consent dialog, lease, CAS journal of operations, provider mutation and deletion staging. | Verdict: SPLIT
- Importers: `AlphaCalendarPlugin` (`sync` -> `call`), `AlphaConnectionPlugin` (`SLOT`/consent), `CalendarSyncConsent`, `NativeDeletionCoordinator` (`dispatchDeletion`, `deletionRefusal`). Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{CalendarSyncEnableTraces.java,calendar-sync-enable*.mjs,credential-coordinator-platform,deletion-platform}.mjs`; `test/calendar-sync-cloud-refusal.test.mjs`, `test/calendar-sync-consent.test.mjs`, `test/calendar-sync-receipt-recovery.test.mjs` (source text); `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 127-155 | D9/D8 | `call(PluginCall)` dispatches 10 kinds by `if(kind.equals(...))` inside one lambda; 2,000+ chars of catch ladder on line 154. | `switch(kind)` to named methods (`prepareCall`, `status`, `list`, `get`, `ack`, `deletion`); one `resolveFailure(call, exception)` for the catch ladder. | low |
| 2 | 32-38 | D11 | Inner class named `Context` shadows `android.content.Context`, forcing FQN at 218 and 227. | Rename to `Lease`. | none |
| 3 | 47, 219 | C3 | Calendar READ+WRITE permission check twice in this file (instance and static). | `CalendarPermissions.readWrite(context)`. | none |
| 4 | 48 | C4 | Owner-foreground predicate. | `OwnerSurface` helper. | medium |
| 5 | 46 | C3 | `status(String)`. | Shared helper. | none |
| 6 | 64 | C3 | `digest(Object)` wraps `HostedResultNotices.hash` - Calendar code depends on the Hosted notices class for SHA-256. | Use a `Digests.sha256Hex` util. | none |
| 7 | 74, 100, 103, 119 | C6 | Literal `"cloud:production"` four times. | Constant (e.g. `CloudSlots.PRODUCTION`). | none |
| 8 | 103, 119, 73-80 | C5 | The same five-part admission (`sameCloudCredential`, foreground, granted, epoch, stageAdmissible) is spelled three times in `prepare` and once in `check`. | One `admit(owner, credential, admittedEpoch)` private method. | low |
| 9 | 149, 199 | C6 | `Set.of("deleted","undone","conflict")` receipt phases twice. | Constant `SETTLED_PHASES`. | none |
| 10 | 128 | D9 | Pause retries `save(data,true)` up to 8 times in a one-line loop. | Extract `persistPaused()`. | none |
| 11 | 24, 155, 167 | P10 | Own executor + raw `RejectedExecutionException` catch. | Shared worker helper. | low |
| 12 | 218-225 | C5 | `dispatchDeletion` twin of `CalendarScopedDeletionReview.dispatch`. | Shared dispatch skeleton. | low |
| 13 | 227-230 | B1 | `deletionRefusal` maps any exception to `"sync-unavailable"`. | Specified fallback (fail closed); keep. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| Context (lease) | class | 32-38 | - | rename Lease |
| status | helper | 46 | CalendarScopedDeletionReview:23 | shared |
| granted | helper | 47 | 4 copies | CalendarPermissions |
| foreground | helper | 48 | 10 copies | OwnerSurface |
| digest | helper | 64 | HostedResultNotices.hash, CalendarSyncSnapshot.digest, GoogleWorkspaceReturnFlow.credentialHash | Digests |
| same | helper | 65 | DeferredDeletionJournal.same (upstream) | inline call |
| SLOT | const | 22 | AlphaConnectionPlugin reads it | stay |

## Proposed end state
`CalendarSyncBridge` keeps lease/consent/enable (~120 lines); operation journal (`saved/save/mutate/ack/scope`) moves to `CalendarSyncJournal` (~70 lines); helpers shared. Wire statuses and the `native-calendar-sync:v1` journal format unchanged. Estimated lines after: 190.

## Verification
Quint calendar-sync-enable refinement; host tests listed (source text) need edits; androidTest `CalendarSyncProviderInstrumentedTest`; real Google Calendar sync is integration-only (not proven by host tests).
