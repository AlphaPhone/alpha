# scripts/local-agent-dev-storage.ts
- Lines: 99 | Kind: development-only host storage (file-backed device slot, action journal, digest and workflow-draft compare-exchange) | Verdict: KEEP + SIMPLIFY (move with the dev-server bridge)
- Covers: the Vite-host side of `apps/app/src/runtime/local-agent-storage.ts` (`read/write`, journal `reserve/markApplying/finish/recover*`, `digestRead/digestCompareExchange`, `draftRead/draftCompareExchange`). Duplicates: the Android native journal and Keystore implement the production counterpart; within this file the digest and draft branches are copy-paste. Callers/importers: `scripts/local-agent-dev-bridge.ts:8,131`; `scripts/test-local-agent.ts`, `scripts/test-local-digest-storage.ts`; Quint harness `specs/quint/refinement/services/development-digest-pending.mjs` + `-probe.mjs` (bundles and imports the real module: an import-based harness, good); `specs/quint/services/manifest.json:2609` (path pin); `scripts/quint-lib.ts:18`; Playwright `test/browser/hosted-harness.ts`, `workflow-notification-recovery.spec.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-36 | C5 | Digest and draft branches are identical except the byte limit (800000 vs 100000) and error text. | One `compareExchange(limit, label)` helper. | None. |
| 2 | 61-91 | C5 | `recoverNotification`, `recoverDeletion`, `recoverReminder` repeat the expected-entry check, terminal short-circuit, admitted-attempt check and binding hash; `hash` lambda defined twice, sha256 written inline a third time. | One `recover(previous,input,validate)` skeleton and one `sha256Json`. | Low; Playwright `workflow-notification-recovery.spec.ts` covers the notification path. |
| 3 | 9 | C1 | `input:any`; the operation union is already defined by `apps/app/src/runtime/local-agent-storage.ts`. | Import that request type. | None. |
| 4 | 10-20 | D8 | Dense single-line statements (slot regex selection on one 250-char line). | Lookup `operation -> slot pattern`. | None. |
| 5 | 17 | A3/D5 check | Slot pattern accepts `hosted-digests:v1:` and `renderer-hosted-digests`. Hosted digests are a retained dev-path feature (17 renderer files reference it, `runtime/hosted-digests.ts`); not part of the D5 deletion unless stage A4 removes `hosted-digests.ts`. | Re-check after A4; if the hosted digest store is deleted, delete the digest branch and its Quint harness together (D20 rule). | Medium: Quint `development-digest-pending` model depends on it. |

## Proposed end state
~65 lines: typed input, a slot-pattern table, one compare-exchange helper for digest/draft, one recovery skeleton
for the three `recover*` operations, and `reserve/markApplying/finish`. Lives next to the dev bridge in the `dev-server/`
folder. The Quint harness that bundles it keeps working because it imports the module (update its path on the move).
