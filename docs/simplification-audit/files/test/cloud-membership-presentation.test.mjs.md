# test/cloud-membership-presentation.test.mjs
- Lines: 64 | Kind: component in JSDOM (esbuild-bundles real `runtime/cloud-membership-ui.tsx`, renders `CloudMembershipControls` with React, clicks) | Verdict: MERGE with `cloud-membership-ui.test.mjs` into `journeys/connection-cloud.spec.ts` (account sheet) and `journeys/accessibility.spec.ts`
- Covers: a membership-code error is announced once, linked by `aria-describedby`, marks the field invalid and focuses it; separate forms get distinct ids; a retained error reveals its field without submitting; connection failures are not shown as code errors. Duplicates: `cloud-membership-ui.test.mjs` (same component, static markup); `test/browser/cloud-account-panel.spec.ts` renders the account sheet. Callers/importers: `npm test` glob only (research mislabels it as real-IO integration "D").

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-17 | C3 | Global JSDOM install + CJS `new Function` require shim; same bundle code as `cloud-membership-ui.test.mjs:5-7`. | Gone with the merge. | None |
| 2 | 32-64 | T3 | Accessibility wiring of an error; worth one browser step with real focus. | `journeys/accessibility.spec.ts`: open account sheet, enter a bad code (dev Cloud refuses) -> alert announced once, field `aria-invalid`, focused. | Low |

## Proposed end state
Deleted after the account-sheet journey asserts the code-error accessibility and the connection-error distinction.
