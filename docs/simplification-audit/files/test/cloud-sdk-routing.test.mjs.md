# test/cloud-sdk-routing.test.mjs
- Lines: 19 | Kind: integration against the prepared SDK's installed `@ai-sdk/openai` + `ai` (fetch intercepted); skipped unless `ALPHA_ELIZA_SOURCE` is set | Verdict: MERGE into `test/tooling/cloud-resident-host.test.mjs` (prepared-SDK block)
- Covers: `CLOUD_SDK_BASES` for production and staging, given to the resident's OpenAI-compatible provider, produce `<api>/api/v1/chat/completions` with the exact model id. Duplicates: `test/cloud-deployment.test.mjs` checks the policy constants themselves. Callers/importers: `npm test` glob; un-skipped in `browser.yml` verify (`ALPHA_ELIZA_SOURCE`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-18 | T5 (partial) | Exercises upstream SDK URL joining, but with Alpha's base constants; the only proof that the base ends in `/api/v1` the SDK expects. | Keep one case in the prepared-SDK block. | Low |
| 2 | 5 | C7 | `cloud-sdk-authority.ts` is a 14-line file the scripts review proposes merging into `cloud-deployment-policy.ts`. | Update the import when that merge lands. | None |

## Proposed end state
One case "resident SDK reaches the versioned Cloud chat route" in the prepared-SDK section of the cloud-resident-host tooling file, run in the single prepared-SDK lane.
