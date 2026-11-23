# Chunk specs-16

| File | Kind | Verdict | Target |
|---|---|---|---|
| `specs/quint/legacy/manifest.json` | Quint legacy family manifest (27 historical/upstream-conversion models) | DELETE (with C17) | — (after relocating the three shared pieces) |

## Coverage lost if the DELETE happens
None of current product behaviour: every entry is self-declared historical (design comparison at `ef9fbf7cd7`) or a conversion of upstream TLA+ for `vendor/eliza` code. What disappears is (a) historical expected-violation evidence (`currentChecks` with `expected: violation`) and (b) the only users of `quint:compare` / `quint:temporal`. Live successors exist in `application/`, `services/` (`CoreApprovalServiceCurrent`, `CoreServiceLifecycle`, `TaskServiceLifecycle`, `TaskSchedulerRuntime`, `IdentitySession`, `SignInChooser`).

## Shared helpers worth keeping
Not in this file. Before the delete: `deferred`/`tick` (`legacy/core/source-support.mjs`) → `refinement/support.mjs`; `legacy/CoreTaskScheduler.qnt` (read by `refinement/services/task-scheduler/index.mjs:7`) → `services/` or delete with twin; `legacy/core/formal-source-inventory.mjs` (used by native mms/sms dispatch harnesses).

## Cross-file actions
- Drop `'legacy'` from family lists in `scripts/quint-lib.ts:43`, `scripts/check-quint.ts:42`, `scripts/check-quint-refinement.ts:82,152,195-201`, `scripts/ci/check-changed-models.ts:20`, `test/quint-checker.test.mjs:32,83`; export one `modelFamilies` constant.
- Remove compare/temporal steps from `.github/workflows/quint-model-check.yml:46-54`.
- Interim (if the family survives a while): empty the `sources` arrays that pin live renderer files (`connection-ui.tsx`, `model.js`, `template.html`, `calendar-adapter.ts`, …) so renderer edits stop selecting historical models in `check-changed-models.ts` and so D4/structural moves cannot break `quint:verify`.

## Owner questions
- Is historical design-comparison evidence (expected violations of the pre-redesign UI, MMS historical counterexample witnesses) worth keeping anywhere, e.g. as a tagged commit only?
- Do upstream TLA+ conversions (`Core*`) belong upstream in `vendor/eliza` rather than here?
