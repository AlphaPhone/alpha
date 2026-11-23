# test/files-agent-patch.test.mjs
- Lines: 76 | Kind: source-text (regex over pinned upstream source read through `upstreamNativeSource`) + unit test of upstream modules (tsImport of `.eliza/client-features/.../device-actions/*` and `plugins/plugin-files/src/browser/files-agent-contract.ts`) | Verdict: DELETE
- Covers: upstream's device-action contract registers the Files capability and operation schemas, and upstream's coordinator validator agrees with upstream plugin-files' validator. Duplicates: `test/files-browser.test.mjs:205-217,314-349` (same contract, same module); `vendor/eliza/plugins/plugin-files/test/browser-agent-filter.test.mjs`; Playwright `test/browser/files-agent-filter.spec.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-30 | T1 + T5 | Regex over upstream `action.ts`, `contract.ts`, `service.ts` and `device-action-routes.ts` (including an exact count of 2 matches of a capability list). Pure source text of `vendor/eliza`. | Delete. | Low |
| 2 | 32-76 | T5 / T3 | Every module imported lives in `.eliza/client-features` (generated from `vendor/eliza`; `android/upstream-native-sources.json` has no Alpha patches). The "Alpha" side (`files-agent-contract.ts`) is upstream too, so this compares upstream with upstream. `policy` is a stub. | Delete; if the agreement matters, it belongs in upstream plugin-files' own tests (upstream follow-up). | Low |
| 3 | 13-16, 32 | T9 | `skip` when `vendor/eliza` or prepared client features are missing; the submodule is a hard requirement. | Goes with the file. | Low |
| 4 | name | A8 | The name says "patch" but nothing here is an Alpha patch any more. | Goes with the file. | Low |

## Proposed end state
File deleted. The user-visible part (agent filter/open are direct, share/move/trash are reviewed proposals, "Open
Files to review this action") is a journey case in `journeys/files.spec.ts` (from `files-agent-filter.spec.ts`).
List "Files contract agreement test" as an upstream follow-up.
