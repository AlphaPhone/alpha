# test/digest-occurrence-delivery.test.mjs
- Lines: 328 | Kind: tests 1-3 integration of the app's digest module (upstream-staged `DigestInbox`, labels, zone note; app-owned `rememberRetainedDigests`/`latestRetainedDigest`) in tsx child processes; tests 4-7 development simulator (`browser/development-digest-occurrence.ts`) checked against **vendor** source by regex, slicing and `git show` of the pinned agent | Verdict: MERGE tests 1 and 3 into `test/integration/digests.test.ts`; DELETE test 2 and tests 4-7 (T2/T10 parity harness)
- Covers: one retained record and one delivery per digest occurrence across lost ack, interrupted notice, restart and tamper; not-run occurrences never become the Home brief; dev scheduler admission matches the pinned agent's 30-minute window, clock jumps and DST. Duplicates: `scripts/test-local-digest-storage.ts` and the DigestInbox cases already routed to `test/integration/digests.test.ts` by other reports; `test/quint-development-digest-pending.test.mjs` replays a model of the dev digest path. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-22 | T9 | Every case is a JS program in a template string executed by `node --import=tsx -e`; failures report as JSON mismatches far from the code. | Plain tsx-loaded test file. | None. |
| 2 | 24-40 | - | Home brief retention is app-owned (`hosted-digests.ts:23-41`); not-run statuses never surface as a brief. | Carry. | - |
| 3 | 62-102 | - | Exactly-once delivery across lost ack / notice failure / overlapping syncs / crash / tamper: MVP-38's core guarantee. `DigestInbox` is upstream code, but the app's storage binding and notice publisher are the integration. | Carry (one case, keep the six numbered steps). | - |
| 4 | 42-60 | T5 | `digestZoneNote` is upstream client code; DST/zone arithmetic belongs to upstream tests. | Delete (or one row in the journey showing the travel note). | Low. |
| 5 | 114-142, 235-328 | T10, T2, T5 | Reads `vendor/eliza/plugins/plugin-workflow/src/services/hosted-digest*.ts` by `readFileSync` and by `git show <pin>:`, regex-matches constants, slices `digestAdmission` by `indexOf('\n}\n')`, writes it to a temp `agent.ts` with stubs and compares with the dev simulator. Also slices `development-digests.ts` by an exact 150-character literal (line 326). Breaks on any upstream reformat. | Delete. If the dev simulator must match the agent, have it import upstream's `hosted-digest-policy` (already staged in `.eliza/client-features`) instead of re-implementing it, and the parity test disappears. | Medium: the dev simulator could drift from the agent; it is dev-only (D19). |
| 6 | 144-228 | T3 | Dev-simulator clock-jump/DST tables against the simulator alone: unit tests of a development surface. | Delete with finding 5's fix (simulator uses upstream policy). | Low. |
| 7 | whole | - | Runtime: 7 tsx child processes plus `git show` of vendor files; one of the slower host files. | Gone after merge. | - |

## Proposed end state
Two cases (Home brief excludes not-run occurrences; exactly-once retention and delivery) in `test/integration/digests.test.ts`.
The development digest occurrence code imports upstream `hosted-digest-policy` instead of copying it; all parity
harness cases deleted.
