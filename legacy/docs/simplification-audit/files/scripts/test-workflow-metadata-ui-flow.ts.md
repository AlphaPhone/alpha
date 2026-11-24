# scripts/test-workflow-metadata-ui-flow.ts
- Lines: 21 (≈5 KB) | Kind: transplant-backed flow test (real `WorkflowProtocol` + loopback HTTP; renderer transplanted via `workflow-renderer-fixture.ts`) | Verdict: REWRITE as `test/browser/journeys/workflows.spec.ts` (edit-details cases), then DELETE
- Covers: editing an existing workflow's name/description sends only those fields plus `mutationId`/`expectedVersionId`, keeps a content-free intent across a lost response, never replays it, and distinguishes a typed `WORKFLOW_METADATA_NOT_APPLIED` refusal (unlock) from a generic 409 (stay locked). Duplicates: `test/workflow-lifecycle-resend.test.mjs` exercises the same `WorkflowMetadataRejected` path through the same fixture. Callers/importers: `test/adapter-contracts.test.mjs:10` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 11 | T2 | Renderer is sliced source evaluated in `vm`. | Journey against the real page with a routed fake agent. | Medium |
| 2 | 8 | C5 | Fourth copy of the fake workflow agent server. | Shared `test/fixtures/workflow-agent.ts`. | Low |
| 3 | 16 | — | Asserts the stored intent has no `name` (privacy: text content not persisted). Worth keeping. | Carry as a journey assertion on `localStorage` / IndexedDB via `page.evaluate` read-only (allowed: observation, not seeding). | Low |
| 4 | 19 | T8 | `setTimeout(r,30)`. | Condition waits. | Low |
| 5 | whole | D8 | Minified lines. | Gone. | None |

## Proposed end state
Delete. Cases worth carrying (others are already implied):
1. Save sends exactly `{name, description, mutationId, expectedVersionId}`; only those fields change.
2. Lost response → locked "unknown" editor; second Save sends nothing; reload reconciles by GET and shows the new name.
3. Typed not-applied 409 unlocks; generic 409 keeps the lock until refresh.
4. Persisted intent carries no workflow text.
5. Account switch during a held save hides detail; switching back reconciles by GET only.
