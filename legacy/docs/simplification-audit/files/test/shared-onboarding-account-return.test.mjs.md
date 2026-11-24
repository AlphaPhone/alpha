# test/shared-onboarding-account-return.test.mjs
- Lines: 12 | Kind: transplant (slices `function update(patch:` .. `// P-43:` from `connection-ui.tsx`, evals in `vm`) | Verdict: DELETE
- Covers: A completed account sign-in closes the account panel; a refresh or failure keeps it open. Duplicates: `test/browser/post-sign-in-setup.spec.ts`, `native-cloud-signin.spec.ts`. Callers/importers: `npm test` glob only; `CONTROLLER_SOURCE` env knob nothing sets.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | T9 | `CONTROLLER_SOURCE` override knob. | Delete. | Low |
| 2 | 7 | T2/A8 | End marker is a comment `// P-43:` (ticket tombstone). | Delete. | Low |

## Proposed end state
File deleted; the post-sign-in journey already shows the panel closing after sign-in.
