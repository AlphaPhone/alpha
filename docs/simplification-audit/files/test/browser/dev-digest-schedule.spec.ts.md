# test/browser/dev-digest-schedule.spec.ts
- Lines: 211 (11 tests incl. a 2-arm loop) | Kind: Playwright `chromium`, dev build; 2 UI tests, 9 tests that drive `development-digests.ts` through `page.evaluate` with `page.clock.setFixedTime` jumps | Verdict: **MERGE** into `journeys/workflows.spec.ts` (1 case); delete the rest
- Covers: the development digest scheduler: one retained result per reviewed snapshot schedule, mutation replay/ack, DST repeated and skipped times, 30-minute late window then missed, clock set back/forward, pause, revoke, expiry and renewal, morning/evening at the same minute, edited time, missed-record notice after reopening, time-zone mismatch notice, two tabs settling one occurrence. Duplicates: `journey-d-digests.spec.ts` (same two UI journeys: run once and retained; missed while closed leaves one record and no brief); `test/digest-occurrence-delivery.test.mjs`; `specs/quint/refinement/services/development-digest-pending.mjs`; the product scheduler is the pinned agent's `digestAdmission` (comment at 72-73) and `scripts/test-local-digest-restart.ts`. Callers/importers: `chromium` project; imports `helpers/connection-diagnostics.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-21, 142-171 | T4 | Both UI tests repeat `journey-d-digests.spec.ts` (run once, retained across reload; missed time shows one record and one notice). | Delete; keep journey D's versions in the workflows journey. | none |
| 2 | 22-140, 185-211 | P7, T6 | Nine tests call `developmentDigestRequest` in-page and assert on `readDevelopmentDigests`; they verify that the browser simulator copies the upstream scheduler policy. | Delete. | Medium: DST, clock-jump and two-tab settlement rules are proven only for the simulator, and the agent's own policy is upstream. Listed as coverage at risk. |
| 3 | 173-183 | — | Time-zone notice: "Runs at 08:00 America/New_York time, not this device's current time zone (Europe/Paris)". Seeds through `seedLoops` in-page. | Carry, seeding the schedule through the panel. | none |
| 4 | 3-13 | P11 | `expect` timeout 15 s, file timeout 90 s, reduced motion, with comments explaining machine load and "#700". | Default timeouts in the harness; drop the comments (A8). | none |
| 5 | 32-41, 72-73, 197 | A8 | Comments cite issue numbers (#680), "Round-4 case" and parity notes. | Gone with the tests. | none |
| 6 | 43, 44, 46 | D8 | `digestCall` rewrites `alpha.connection.selection.v1` on every call. | Gone. | none |

## Proposed end state
Only the time-zone-mismatch notice moves into `journeys/workflows.spec.ts` (digests describe, beside journey D's two cases). Delete this file. Scheduler policy stays proven by the agent upstream, the host digest test and the Quint model.
