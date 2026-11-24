# android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncSnapshot.java
- Lines: 141 | Role: Exact snapshot of an owned local calendar event family for CAS assertions and semantic projection. | Verdict: KEEP
- Importers: `CalendarSyncBridge`, `CalendarSyncMutation`. Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/calendar-sync-enable.mjs`; `test/calendar-sync-mutation.test.mjs`, `test/fixtures/CalendarSyncSnapshotTest.java` (calls `duration`), `test/fixtures/calendar-sync-snapshot-jvm.mjs`, `test/native-calendar-sync-port.test.mjs`; androidTest `CalendarSyncProviderInstrumentedTest`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 140 | C3 | `digest(String)` SHA-256 hex - copy #N of the Java hash helper. | Use shared `Digests.sha256Hex`. Output format (lower-case hex) must stay byte-identical: revisions are persisted in the sync journal. | low |
| 2 | 34 | C3 | Inline UUID-ish regex `[a-f0-9-]{36}`. | Shared `Ids.uuidish` constant. | none |
| 3 | 88 | C6 | Email regex shared with CalendarSyncMutation:72. | Shared constant. | none |
| 4 | 74-92 | D8 | FQ `org.json.*`, `java.time.*` inline throughout. | Imports. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| digest | helper | 140 | HostedResultNotices.hash:31, GoogleWorkspaceReturnFlow:33-36, AlphaDevicePlugin x4, WorkflowWorkerAssets, AlphaCredentialStore | Digests util |
| duration | helper | 96-102 | none | stay |
| number/empty/text/canonical | helpers | 103,137-139 | - | stay |

## Proposed end state
Unchanged logic; digest delegated; ~135 lines. Estimated lines after: 135.

## Verification
`test/native-calendar-sync-port.test.mjs`, `test/calendar-sync-mutation.test.mjs`, androidTest CalendarSyncProvider.
