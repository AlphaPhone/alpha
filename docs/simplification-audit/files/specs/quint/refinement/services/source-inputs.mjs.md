# specs/quint/refinement/services/source-inputs.mjs
- Lines: 29 | Kind: harness support (provenance hashing) | Verdict: DELETE (B5), after `check-traces.mjs` drops receipt inputs
- Covers: `serviceInputs(entries)` runs `prepareClientFeatures({check:true})`, verifies every staged `.eliza/client-features/**` file against `.source.json` and the vendor originals, and returns the sorted list of files to hash into a receipt. Protects no product behaviour; it re-validates our own staging step (B3) on every harness call. Duplicates: `scripts/prepare-client-features.ts --check` (the same check, run by `npm run verify` / prepare). Callers/importers: `composition/controllers.mjs`, `services/calendar-linked.mjs` (D4 delete), `gmail-agent-mailbox-recovery.mjs`, `google-accounts-lifecycle.mjs`, `inbox-provider-drafts.mjs`, `workflow-engine/index.mjs`, `workflow-scheduler/index.mjs`, `workflow-scheduler/registration.mjs` (8). Two non-JS mentions (`android/aosp/branding/provision/README.md`, two Python scripts) are a different `source-inputs` name.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-26 | B5/B3 | Hashes and cross-checks provenance that only feeds receipt `sources`; nothing reads the receipt to make a decision. | Delete; callers pass their plain source list (or nothing) to `checkTraces`. | Low |
| 2 | 11 | P3 | `prepareClientFeatures({check:true})` re-run per harness call (8 call sites, some per scenario). | Run once in the lane's prepare step. | None |
| 3 | 14-15 | B3 | Exact-key check of `.source.json` shape: self-validation of our own generated file. | Gone with the file. | None |
| 4 | 26 | B5 | Hard-coded self-reference and lock files in the receipt list. | Gone. | None |

## Proposed end state
File deleted. If the path→test index for CI lanes needs inputs, derive them from the esbuild metafile in the runner,
not per harness.
