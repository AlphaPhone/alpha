# specs/quint/application/PermissionChoices.qnt
- Lines: 226 | Kind: Quint model (live; bundle harness with text-needle observation hooks) | Verdict: KEEP (absorb PermissionWalkthrough; trim historical versions) + PORT hooks
- Covers: Startup permission walkthrough over seven native / four browser permissions: one prompt per permission, ordered progress, stale results retired by generation, best-effort progress persistence, skip/reopen/review. Duplicates: specs/quint/application/PermissionWalkthrough.qnt models the same component (native-only, older shape). Callers/importers: manifest row (startup-permissions.tsx, startup-permission-progress.ts, startup-permission-flow.ts, startup-browser-permissions.ts, .eliza permission-walkthrough.ts; `profiles`); harness specs/quint/refinement/application/permission-choices.mjs (559 lines) via index.mjs and test/quint-permission-choices.test.mjs; native README mention

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | permission-choices.mjs:38-52 | T10 | Bundles the real component (good) but injects observation via text needles: `'const ticket = sequence.current, credentialId = …'` in startup-permissions.tsx and `'      pending = current;'` in the upstream permission-walkthrough.ts, asserting each occurs once. | PORT: observe pending/ticket through the rendered DOM (button disabled, shown permission) or an explicit test-only `onFlowChange` prop; drop the source rewriting. | M |
| 2 | legacyCompleted, restoreCompleted(4..6), legacyReviewPreservesCompletionTest | A1 | Models completed records with 4-6 steps from earlier walkthrough versions; delete-candidates B248 deletes native progress versions 1-3 under C6/D1. | Drop `legacyCompleted`, the 4-6 branch of `DurableCompletion`, and the legacy run. | M |
| 3 | whole | C5 | PermissionWalkthrough is the older twin of this model; its coordinator harness (startup-permissions-coordinator.mjs, 501 lines) bundles the same component. | Merge (see that report); one harness. | L |
| 4 | harness size | B5 | 559-line harness with batchSize/obligation receipts. | Shrink after hook port. | L |

## Proposed end state
One permission model (this file) without historical completion versions; one harness that bundles StartupPermissions and observes through the DOM/props; PermissionWalkthrough and its coordinator harness gone.
