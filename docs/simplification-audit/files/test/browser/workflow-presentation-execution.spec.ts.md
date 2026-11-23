# test/browser/workflow-presentation-execution.spec.ts
- Lines: 20 | Kind: Playwright spec, chromium, 4 tests (2 themes × complete/stop); real UI | Verdict: MERGE into `journeys/workflows.spec.ts` (device step approvals)
- Covers: a typed workflow with Notify and Speak steps needs a separate two-tap approval for each; the notice stores the exact title/text; speech plays the exact text; completing marks the run succeeded, Stop workflow speech leaves the journal `unknown` and offers Check saved device results; nothing replays after reload; the compact approval card keeps Approve fully tappable. Duplicates: Speak waits in `dev-workflow-speech.spec.ts`; Notify text in `workflow-notices.spec.ts` test 6. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | T7 | Theme loop doubles the run for a layout check. | One theme; layout belongs to the accessibility sweep. | None. |
| 2 | 6, 18 | T6 | `state()` reads notice, execution and action-journal documents in the page. | Assert visible notice text, run status and the Check saved device results control; keep one journal read for `unknown` only if no UI shows it. | Low. |
| 3 | 16 | T6 | `speechFixture.current.onend()` ends playback from the page. | Use the harness voice fixture's `finish()`. | None. |
| 4 | 12 | D8 | One 900-character line of UI steps. | Split into named helper steps in the journey. | None. |

## Proposed end state
One step pair in `journeys/workflows.spec.ts`: build Read→Notify→Speak, run, approve Notify (notice appears), approve
Speak (exact text spoken), then complete / Stop; reload replays nothing. Needs `harness/voice.ts`,
`harness/workflow-agent.ts` (dev store), `harness/nav.ts`. File deleted.
