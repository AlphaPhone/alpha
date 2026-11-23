# specs/quint/refinement/composition/README.md
- Lines: 25 | Kind: formal documentation | Verdict: KEEP, rewrite after `controllers.mjs` is deleted
- Covers: describes the ApplicationComposition and ControllerComposition browser campaigns and how to run them. Duplicates: none. Callers: none (doc).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-17 | A2 | Describes ControllerComposition's Calendar schedules, which drive the deleted client Calendar linked-sync stack (`calendar-sync-host.ts`, `google-calendar-selection.ts`, D4). | Remove the ControllerComposition paragraphs; say which voice cases moved (see `controllers.mjs.md`). | Low |
| 2 | 19-22 | — | Two run commands; the second (`test/quint-composition-refinement.test.mjs`) is also run by `browser.yml` production job (P3). | Keep one command. | Low |

## Proposed end state
Five lines: what ApplicationComposition's browser campaign checks (real `connectionController` in Chromium, synthetic native/Cloud ports), what stays an obligation, and the single run command.
