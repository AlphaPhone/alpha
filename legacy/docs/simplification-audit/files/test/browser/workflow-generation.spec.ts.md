# test/browser/workflow-generation.spec.ts
- Lines: 65 | Kind: Playwright spec, chromium, 8 tests (loop); real UI, protocol patched in page | Verdict: MERGE into `journeys/workflows.spec.ts` (authoring: generation section)
- Covers: "Describe it" generation produces a draft that must be reviewed, adopted locally and saved with a separate confirmation (inactive); cancel, duplicate clicks, leaving, and editing the request discard a late response; invalid output leaves the draft untouched; generation waits for the local draft to be durably stored. Duplicates: generation wiring also in `workflow-scope-refusal.spec.ts` and `dev-workflow-authoring.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-18 | T6 | Patches `WorkflowProtocol.prototype.phoneCatalog/generatePhone` and imports `normalizePhoneSpec`/`workflowSha` to build the answer. | Answer `/api/workflow/phone/catalog` and `/phone/generate` from the harness workflow agent fake (route table shared with `workflows.production.spec.ts`), with `hold`/`invalid` modes. | Medium. |
| 2 | 21, 28 | T6 | `counts()` reads `development-execution-document` in the page. | Use the agent fake's recorded posts and saved list. | Low. |
| 3 | 30-43 | T4 | Four late-response variants (cancel+duplicate, leave, edit request) each re-run setup. | One test: hold; duplicate click; Cancel; release → nothing; generate again; edit the request → late answer discarded. Keep "leave" as one extra step. | None. |
| 4 | 45-65 | T6 | Durable-draft outcomes hold the draft write by patching `navigator.locks.request` and read the draft via `browserWorkflowDraftStore`. | Keep the `failed` outcome only, through a harness storage-fault option; drop `saved`/`left`. | Low. |
| 5 | 19 | ok | Dev profile connect via Settings diagnostics. | Use `harness/connection.ts`. | None. |

## Proposed end state
Generation section of `journeys/workflows.spec.ts`: generate → review (collapsed spec) → Use → Save → Confirm save →
one inactive workflow; held response with duplicate click, Cancel and request edit admits nothing; invalid output shows
"Unsupported workflow field"; a failed draft write blocks generation. Needs `harness/workflow-agent.ts`,
`harness/nav.ts` (`newWorkflow`). File deleted.
