# test/browser/helpers/connection-diagnostics.ts
- Lines: 17 | Kind: Playwright backdoor (imports `/src/runtime/connection-ui.tsx`, calls `connectionController.open()`) | Verdict: **REWRITE** as `harness/nav.ts` `openConnectionHelp()` through the visible route
- Covers: waits for startup to settle and opens the connection chooser without navigating. Duplicates: the visible route Settings → About → Connection help (the comment says production fixtures already use it). Callers/importers: 69 files (largest backdoor in the suite, research P2), including `helpers/delivery-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-16 | T6, P2 | Polls `connectionController.getSnapshot().startupResolved` and calls `open()` from the page. A UI regression in the real entry point would not fail any of the 69 users. | Navigate Settings → About → Connection help by role; wait for the chooser dialog. | Medium: some callers open it mid-flow from a non-Settings view; those navigate back afterwards. |
| 2 | 12 | T8 | `timeout:15_000` poll. | Default expect timeout. | none |

## Proposed end state
`harness/nav.ts`: `openConnectionHelp()` uses only visible controls. This file is deleted after its 69 callers are migrated
(most callers are themselves merge/delete candidates).
