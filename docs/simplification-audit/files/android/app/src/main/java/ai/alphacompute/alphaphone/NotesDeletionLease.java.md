# android/app/src/main/java/ai/alphacompute/alphaphone/NotesDeletionLease.java
- Lines: 32 | Role: decides whether a renderer currently holds a Notes permanent-deletion recovery row (lease.until within 20 min) so native passes leave it alone | Verdict: KEEP
- Importers: `AlphaNoteAudioPlugin` (1). Text/path pins: `test/notes-deletion-lease.test.mjs` (javac + slices `AlphaNoteAudioPlugin.finishPermanentDeletions`, regexes `apps/app/src/runtime/permanent-voice-deletion.ts` and `prototype/voice-adapter.ts` for the 20-minute constant), `test/fixtures/NotesDeletionLeaseTest.java`, `specs/quint/native/manifest.json`, `specs/quint/application/manifest.json`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-18 | A1 / A8 | "A row without a lease (written before leases …)": pre-lease rows cannot exist under the renamed package. The *behaviour* (no lease → not held) is still needed for rows of a renderer process that died before writing one. | Reword the comment; keep the logic. | None. |
| 2 | 10 | D7 | "No Android types: host-tested by javac." | Drop the sentence; consider inlining into `AlphaNoteAudioPlugin` when the javac test goes. | Low. |
| 3 | 15 | C6 | `LEASE_MS` mirrors renderer `PERMANENT_DELETION_LEASE_MS` (cross-language twin pinned by the test). | Keep; the test is the parity check (T1, acceptable until a generated constant exists). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `LEASE_MS` | const | 15 | `apps/app/src/runtime/permanent-voice-deletion.ts` `PERMANENT_DELETION_LEASE_MS` | here (parity-tested) |
| `held` | helper | 22-31 | — | here |

## Proposed end state
Unchanged logic, comments trimmed (~28 lines).

## Verification
`test/notes-deletion-lease.test.mjs`, Notes deletion instrumentation.
