# apps/app/src/runtime/phone-workflow-authoring.ts
- Lines: 30 | Role: Alpha's editor typing and development-enrollment label handling on top of upstream `@elizaos/contracts/phone-workflow`. | Verdict: SIMPLIFY (small)
- Importers: `browser/development-workflows.ts:7`, `prototype/workflow-adapter.ts:18`, `prototype/workflow-authoring.ts:11`, `runtime/workflow-device-contract.ts:48`, `runtime/workflow-protocol.ts:2`, `scripts/workflow-renderer-fixture.ts:11`.
- Text/path pins: Quint `specs/quint/refinement/services/workflow.mjs:6,9`, `workflow-local-source.mjs:39`, `workflow-execution-audit-admission.mjs:15`, `specs/quint/services/manifest.json`; tests `workflow-definition-bounds`, `workflow-draft-reopen`, `workflow-output-contract`, `workflow-typed-schedule`; browser specs `dev-workflow-execution`, `dev-workflow-phone`, `workflow-generation`, `workflow-interruption-recovery`, `workflow-scope-refusal`; `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-29 | A7 | `export {zoneOffsetMinutes}` — 0 src, 0 tests. | Delete. | None |
| 2 | 25 | D4 | `parsePhoneCatalog=(value)=>parsePhoneWorkflowCatalog(value)` — test-only (0 src). | Delete; tests import upstream. | None |
| 3 | 9, 13-14 | D4 | alias types `PhoneTrigger`, `PhoneCatalog`, `PhoneSaveReceipt` of upstream names. | Use upstream names. | Low |
| 4 | 17-18 | C3 | inline plain-object guards. | `asRecord`-style `isRecord`. | None |
| 5 | 15-23 | D5 | development-profile enrollment label rewrite (`browserDevProfile`) inside a production module. | Keep (small, folds away when `browserDevProfile` is false); or move to `browser/development-workflows.ts`. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `PhoneStep`, `PhoneSpec` | interface | 11-12 | upstream `PhoneWorkflowSpec` (strict) | keep (editor view) |
| inline object guard | helper | 17-18 | ~35 copies | `lib/records.ts` |

## Proposed end state
~22 lines: `PhoneStep`/`PhoneSpec`, `normalizePhoneSpec`, `assertPhoneCapabilities`, `describePhoneTrigger`, `phoneTriggerClockChangeNote`.

## Verification
Workflow host tests and browser specs listed above; Quint workflow refinements.
