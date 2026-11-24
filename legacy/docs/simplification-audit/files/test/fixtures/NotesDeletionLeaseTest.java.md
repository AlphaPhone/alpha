# test/fixtures/NotesDeletionLeaseTest.java
- Lines: 30 | Kind: Java fixture, single-class unit (`NotesDeletionLease.held`) | Verdict: MERGE into the Gradle JVM notes suite
- Covers: a permanent-deletion row the renderer is showing is held for 20 minutes, released at its end, malformed or implausible leases keep the row (erasure cannot be undone), renewal every pass keeps it held. Duplicates: none. Callers/importers: `test/notes-deletion-lease.test.mjs:12`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | T1 | Asserts `LEASE_MS==20 min` "matches the renderer's"; a constant check. A shared constant (or the importer comparing both sides) is the real contract. | Drop the line; if the renderer value must match, generate one from the other. | Low |
| 2 | 20 | A1 (mild) | "a row without a lease (an earlier process, before leases)": the no-lease case is still current (rows written before a lease is attached), keep it, reword. | Reword the message. | Low |
| 3 | all | ok | Irreversible-deletion rule; keep. | Fold into the notes suite. | Medium if deleted |

## Proposed end state
`deletionLeaseHoldsShownRows` table method in the Gradle notes suite. Fixture deleted from `test/`.
