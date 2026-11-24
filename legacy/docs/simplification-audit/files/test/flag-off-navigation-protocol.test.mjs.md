# test/flag-off-navigation-protocol.test.mjs
- Lines: 37 | Kind: tooling test of a Playwright helper (strips `test/browser/helpers/native-navigation-protocol.ts` and evals it with `new Function`) | Verdict: DELETE
- Covers: the browser-test fake for the completed-action navigation protocol: prepare/claim/acknowledge only for the owner, malformed or line-terminator IDs refused, forged/replayed acknowledgement refused, device context only for the registered device. Duplicates: the Playwright specs that install this fixture exercise it; the protocol itself is upstream. Callers/importers: none (node test). The helper it tests is used by `specs/quint/refinement/application/{account-sheet,cloud-connection-notices,shell-coordinator}.mjs`, `refinement/composition/index.mjs` and six `specs/quint/legacy/**` checks.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T5 | Tests the test machinery: the fake server used by browser specs, not product code. | Delete. | none |
| 2 | 5-7 | T2 | Type-strips and evals the helper instead of importing it. | Gone. | none |

## Proposed end state
Gone. If the fake's strictness matters, the journeys that rely on it fail when it misbehaves.
